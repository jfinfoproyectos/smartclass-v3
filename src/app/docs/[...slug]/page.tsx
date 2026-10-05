import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getRoleFromUser } from '@/features/auth/services/authService';
import { getPublicDocProject, getPublicDocPage, getProjectNavigationTree, NavItem } from '@/features/documentation/services/public-docs';
import { formatScheduledLongDate, formatScheduledDisplayDate } from '@/features/documentation/utils/doc-dates';
import prisma from '@/lib/prisma';
import BlockRenderer from '@/features/documentation/components/BlockRenderer';
import { PublicDocsShell } from '@/features/documentation/components/reader/PublicDocsShell';
import { getCodeTheme } from '@/app/actions/code-themes';
import { getAvailableThemes } from '@/app/actions/themes';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Folder, Sparkles, CalendarClock } from 'lucide-react';
import { ensureStandardMarkdown } from '@/features/documentation/components/admin/blockEditorUtils';

// Lazy loading heavy components
const DocTracker = dynamic(() => import('@/features/documentation/components/reader/DocTracker').then(mod => mod.DocTracker));
const AiTutorChat = dynamic(() => import('@/features/documentation/components/reader/AiTutorChat').then(mod => mod.AiTutorChat));
const TopicNavigation = dynamic(() => import('@/features/documentation/components/reader/TopicNavigation').then(mod => mod.TopicNavigation));

export const revalidate = 3600; // ISR: Revalidate every hour

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function Page({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.map(s => decodeURIComponent(s)) || [];

  if (slug.length === 0) {
    return notFound();
  }

  const projectId = slug[0];
  const pagePath = slug.slice(1).join('/');

  // Parallel Level 1: Basic data
  const [project, themes, session, systemSettings, studentCodeTheme] = await Promise.all([
    getPublicDocProject(projectId),
    getAvailableThemes(),
    auth.api.getSession({ headers: await headers() }),
    prisma.systemSettings.findUnique({
      where: { id: "settings" },
      select: {
        appThemeMode: true,
        appThemeColor: true,
        appAllowThemeColorChange: true,
        appCodeTheme: true,
        appAllowCodeThemeChange: true
      }
    }),
    getCodeTheme()
  ]);

  if (!project) return notFound();

  const isAdmin = session?.user.role === "admin" || session?.user.role === "teacher";

  // Access control
  const linkedCoursesCount = await prisma.courseDocProject.count({
    where: { docProjectId: project.id }
  });

  if (linkedCoursesCount > 0) {
    if (!session) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-background text-foreground space-y-4">
          <h2 className="text-2xl font-black uppercase">Acceso Denegado</h2>
          <p className="text-muted-foreground">Debes iniciar sesión para visualizar esta documentación.</p>
        </div>
      );
    }
    if (!isAdmin) {
      const now = new Date();
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: session.user.id,
          status: "APPROVED",
          course: {
            docLinks: { some: { docProjectId: project.id } },
            OR: [
              { endDate: null },
              { endDate: { gt: now } }
            ]
          }
        }
      });
      if (!enrollment) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-background text-foreground space-y-4">
            <h2 className="text-2xl font-black uppercase">Acceso Denegado</h2>
            <p className="text-muted-foreground">Esta documentación está vinculada a un grupo específico y solo puede ser visualizada por estudiantes inscritos y activos en él.</p>
          </div>
        );
      }
    }
  } else if (!project.isPublic) {
    if (!session || (session.user.role !== "admin" && session.user.role !== "teacher")) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-background text-foreground space-y-4">
          <h2 className="text-2xl font-black uppercase">Acceso Denegado</h2>
          <p className="text-muted-foreground">Esta documentación es privada.</p>
        </div>
      );
    }
  }

  // Parallel Level 2: Dependent data (Strictly exclude drafts and future scheduled pages from reader view)
  const [page, navTree, userProgressData] = await Promise.all([
    getPublicDocPage(projectId, pagePath, false),
    getProjectNavigationTree(projectId, false),
    import('@/features/documentation/actions/progressActions').then(mod => mod.getUserProjectProgressAction(project.id))
  ]);

  const userProgress = userProgressData;

  // Buscar curso donde el usuario está inscrito para este proyecto
  let userCourse = null;
  if (session) {
    userCourse = await prisma.course.findFirst({
      where: {
        docLinks: { some: { docProjectId: project.id } },
        enrollments: {
          some: { userId: session.user.id, status: "APPROVED" }
        }
      },
      select: {
        id: true,
        docTrackingEnabled: true,
        docAiTutorEnabled: true,
        docAiQuestionsLimit: true,
        docThemeMode: true,
        docCodeTheme: true,
        docAllowCodeThemeChange: true,
        docThemeColor: true,
        docAllowThemeColorChange: true
      }
    });
  }

  // Fallback al primer curso si no está inscrito o no hay sesión
  if (!userCourse) {
    userCourse = await prisma.course.findFirst({
      where: { docLinks: { some: { docProjectId: project.id } } },
      select: {
        id: true,
        docTrackingEnabled: true,
        docAiTutorEnabled: true,
        docAiQuestionsLimit: true,
        docThemeMode: true,
        docCodeTheme: true,
        docAllowCodeThemeChange: true,
        docThemeColor: true,
        docAllowThemeColorChange: true
      }
    });
  }

  // Determine final settings (System restriction overrides Course, Course overrides Default)
  const role = session ? getRoleFromUser(session.user) : null;
  const isStaff = role === "teacher" || role === "admin";

  const themeMode = !isStaff && systemSettings?.appThemeMode && systemSettings.appThemeMode !== "STUDENT"
    ? systemSettings.appThemeMode
    : (!isStaff && userCourse?.docThemeMode && userCourse.docThemeMode !== "STUDENT" ? userCourse.docThemeMode : "STUDENT");

  const allowThemeColorChange = isStaff || (systemSettings?.appAllowThemeColorChange === false 
    ? false 
    : (userCourse?.docAllowThemeColorChange ?? true));

  const allowCodeThemeChange = isStaff || (systemSettings?.appAllowCodeThemeChange === false 
    ? false 
    : (userCourse?.docAllowCodeThemeChange ?? true));

  // Find current item in navTree to see if it has sub-navigation
  const findCurrentItem = (items: NavItem[], path: string): NavItem | null => {
    for (const item of items) {
      if (item.slug === path || (path === "" && item.slug === "index")) return item;
      if (item.children) {
        const found = findCurrentItem(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const currentNavItem = findCurrentItem(navTree, pagePath);
  const isFolder = currentNavItem?.type === 'folder';
  const DynamicIcon = (await import('@/features/documentation/components/DynamicIcon')).default;
  // Calcular url de regreso (backUrl) para volver a la app directamente
  let backUrl = "/";
  if (session?.user) {
    if (session.user.role === "admin") {
      backUrl = "/dashboard/admin/docs";
    } else if (session.user.role === "teacher") {
      if (userCourse) {
        backUrl = `/dashboard/teacher/courses/${userCourse.id}?tab=docs`;
      } else {
        backUrl = "/dashboard/teacher/docs";
      }
    } else { // student
      if (userCourse) {
        backUrl = `/dashboard/student?courseId=${userCourse.id}&tab=docs`;
      } else {
        backUrl = "/dashboard/student";
      }
    }
  }

  // Verificar restricción por fecha de la página o de sus tópicos ancestros
  const now = new Date();
  const pageDate = page?.publishDate ? new Date(page.publishDate) : null;

  const findAncestorPublishDate = (items: NavItem[], path: string): Date | null => {
    for (const item of items) {
      if (item.type === 'folder' && (path.startsWith(item.slug + '/') || path === item.slug)) {
        const itemDate = item.publishDate ? new Date(item.publishDate) : null;
        const childDate = item.children ? findAncestorPublishDate(item.children, path) : null;
        if (childDate && (!itemDate || childDate > itemDate)) return childDate;
        return itemDate;
      }
    }
    return null;
  };

  const ancestorDate = findAncestorPublishDate(navTree, pagePath);
  let effectivePublishDate = pageDate;
  if (ancestorDate && (!effectivePublishDate || ancestorDate > effectivePublishDate)) {
    effectivePublishDate = ancestorDate;
  }

  const isRestrictedByDate = !isFolder && effectivePublishDate ? effectivePublishDate > now : false;

  const standardMarkdown = (page && !isRestrictedByDate) ? ensureStandardMarkdown(page.content || "") : "";
  const pageTitle = page?.title || currentNavItem?.title || project.name;
  const pageCategory = page?.category || currentNavItem?.title || "Documentación";

  return (
    <PublicDocsShell 
      projectName={project.name} 
      projectId={project.slug} 
      navTree={navTree}
      rawContent={isRestrictedByDate ? undefined : (standardMarkdown || undefined)}
      pageTitle={pageTitle}
      pageCategory={pageCategory}
      currentCodeTheme={allowCodeThemeChange === false ? (userCourse?.docCodeTheme || systemSettings?.appCodeTheme || "one-dark-pro") : studentCodeTheme}
      themes={themes}
      userProgress={userProgress.progress}
      userTotalViews={userProgress.totalViews}
      backUrl={backUrl}
      courseSettings={{
        themeMode: themeMode,
        codeTheme: userCourse?.docCodeTheme || systemSettings?.appCodeTheme || "one-dark-pro",
        allowCodeThemeChange: allowCodeThemeChange,
        themeColor: userCourse?.docThemeColor || systemSettings?.appThemeColor || "ocean-breeze",
        allowThemeColorChange: allowThemeColorChange
      }}
    >
      <div className="py-6 w-full">
        {page && !isRestrictedByDate && (
          <div
            id="doc-raw-markdown-data"
            style={{ display: "none" }}
            data-title={page.title || ""}
            data-category={page.category || ""}
            aria-hidden="true"
          >
            {encodeURIComponent(standardMarkdown)}
          </div>
        )}
        {!page ? (
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 shadow-xl shadow-primary/5 mb-8">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal de Documentación</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Bienvenido a la Documentación
              </h1>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explora el material pedagógico, guías técnicas y recursos interactivos preparados para tu aprendizaje. Selecciona un tema a continuación o en el menú lateral.
              </p>
            </div>
            
            {/* Automatic navigation for the root level if no page selected */}
            <Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded-xl" />}>
              <TopicNavigation items={navTree} projectId={project.slug} />
            </Suspense>
          </div>
        ) : (
          <>
            {isRestrictedByDate ? (
              <div className="relative overflow-hidden rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-primary/10 via-card/80 to-primary/5 dark:from-primary/20 dark:via-slate-900/60 dark:to-primary/10 border border-primary/20 shadow-xl shadow-primary/5 mb-8 text-center animate-in fade-in duration-500 backdrop-blur-xl">
                <div className="absolute -right-14 -top-14 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-14 -bottom-14 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto space-y-5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-widest">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    <span>Contenido Programado</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
                    {pageTitle}
                  </h1>

                  <div className="p-4 rounded-2xl bg-card/80 border border-primary/20 backdrop-blur-sm max-w-md w-full text-center space-y-1">
                    <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                      Fecha de Publicación
                    </p>
                    <p className="text-base sm:text-lg font-bold text-foreground capitalize">
                      {formatScheduledLongDate(effectivePublishDate)}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Esta página está programada por fecha y no estará disponible para su lectura hasta el día indicado.
                  </p>

                  <div className="pt-2">
                    <Link 
                      href={`/docs/${project.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all"
                    >
                      Explorar otros temas disponibles
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {page && !isFolder && (
                  <div className="flex justify-end mb-4">
                    <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border/50 opacity-40 select-none uppercase">
                      {(page as any)._source === 'cache' ? '⚡ Cache' : '🗄️ Database'}
                    </span>
                  </div>
                )}
                
                {!isFolder ? (
                  <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-8 bg-muted w-3/4 rounded" /><div className="h-32 bg-muted w-full rounded" /></div>}>
                    <BlockRenderer 
                      content={page.content || ""} 
                      initialCodeTheme={studentCodeTheme}
                    />
                  </Suspense>
                ) : (
                  <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-card/80 to-primary/5 dark:from-primary/20 dark:via-slate-900/60 dark:to-primary/10 border border-primary/20 shadow-xl shadow-primary/5 mb-8 backdrop-blur-xl">
                    {/* Background ambient glow */}
                    <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="h-16 w-16 rounded-2xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shrink-0 shadow-md shadow-primary/10">
                         {currentNavItem?.icon ? (
                           <DynamicIcon icon={currentNavItem.icon} className="w-8 h-8" />
                         ) : (
                           <Folder className="w-8 h-8" />
                         )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Sección de Documentación
                          </span>
                          {currentNavItem?.publishDate && new Date(currentNavItem.publishDate) > new Date() && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              <CalendarClock className="w-2.5 h-2.5" />
                              <span>Se publicará el {formatScheduledDisplayDate(currentNavItem.publishDate)}</span>
                            </span>
                          )}
                          {currentNavItem?.children && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                              • {currentNavItem.children.length} temas disponibles
                            </span>
                          )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
                          {currentNavItem?.title}
                        </h1>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Automatic navigation for folders/topics */}
            {currentNavItem?.children && currentNavItem.children.length > 0 && (
              <Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded-xl" />}>
                <TopicNavigation items={currentNavItem.children} projectId={project.slug} />
              </Suspense>
            )}
          </>
        )}
      </div>
    </PublicDocsShell>
  );
}

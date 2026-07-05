"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import matter from "gray-matter";
import * as adminService from "../services/admin-docs";
import prisma from "@/lib/prisma";

import { getRoleFromUser } from "@/features/auth/services/authService";
import { remarkMermaid } from "../utils/remark-mermaid";
import { remarkP5Sketch } from "../utils/remark-p5";

async function verifyAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const role = getRoleFromUser(session.user);
  if (role !== "teacher" && role !== "admin") throw new Error("Forbidden");
  return session;
}

async function checkProjectOwnership(projectIdOrSlug: string, session: any, includePages = false) {
  const decodedIdOrSlug = decodeURIComponent(projectIdOrSlug);
  
  const project = await prisma.docProject.findFirst({
    where: {
      OR: [
        { id: decodedIdOrSlug },
        { slug: decodedIdOrSlug }
      ]
    },
    include: {
      pages: includePages
    }
  });
  
  if (!project) {
    throw new Error(`El proyecto "${decodedIdOrSlug}" no existe.`);
  }

  const role = getRoleFromUser(session.user);
  if (role !== "admin" && project.teacherId !== session.user.id) {
    throw new Error("No tienes permiso sobre este proyecto. Solo el propietario o un administrador pueden editarlo.");
  }

  return project;
}

export async function getFileTreeAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  return await adminService.getProjectFileTree(project.slug);
}

export async function getFileContentAction(projectId: string, path: string) {
  try {
    const session = await verifyAdmin();
    const project = await checkProjectOwnership(projectId, session);
    return await adminService.readFileContent(project.slug, path);
  } catch (error) {
    console.error(`Error in getFileContentAction (project: ${projectId}, path: ${path}):`, error);
    throw error;
  }
}

export async function saveFileContentAction(projectId: string, path: string, content: string, sha?: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const newSha = await adminService.saveFileContent(project.slug, path, content);
  revalidatePath("/docs", "layout");


  return { success: true, sha: newSha };
}

export async function createItemAction(
  projectId: string, 
  parentPath: string, 
  name: string, 
  type: 'file' | 'folder',
  metadata?: { title: string, order?: string },
  content?: string
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  const normalizedParent = parentPath === projectId || parentPath === project.slug || parentPath === project.id ? "" : parentPath;
  const depth = normalizedParent ? normalizedParent.split('/').length : 0;
  
  if (type === 'folder' && depth >= 2) {
    throw new Error("Solo se permiten dos niveles de carpetas: Tópico y Categoría.");
  }

  const path = normalizedParent ? `${normalizedParent}/${name}` : name;
  const finalSlug = path.replace(/\.md$/, '');
  
  const initialContent = content || `# ${metadata?.title || name}\n\nEscribe aquí tu contenido...`;
  
  const saveMetadata = {
    title: metadata?.title || name,
    order: metadata?.order ? parseInt(metadata.order) : undefined
  };
  
  if (type === 'file') {
    await adminService.saveFileContent(project.slug, finalSlug, initialContent, saveMetadata);
  } else {
    await adminService.saveFileContent(project.slug, `${finalSlug}/index`, initialContent, saveMetadata);
  }
  
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");
  return { success: true };
}

export async function deleteItemAction(projectId: string, path: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const normalizedPath = path === projectId || path === project.slug || path === project.id ? "" : path;
  await adminService.deleteItem(project.slug, normalizedPath);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");



  return { success: true };
}

export async function renameItemAction(projectId: string, path: string, newName: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const normalizedPath = path === projectId || path === project.slug || path === project.id ? "" : path;
  await adminService.renameItem(project.slug, normalizedPath, newName);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");



  return { success: true };
}

export async function createProjectAction(name: string) {
  const session = await verifyAdmin();
  const id = await adminService.initNewProject(name, session.user.id);
  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true, id };
}

export async function deleteProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  // Delete project pages first
  await prisma.docPage.deleteMany({
    where: { docProjectId: project.id }
  });
  // Delete the project
  await prisma.docProject.delete({
    where: { id: project.id }
  });
  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true };
}

import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { resolveShikiTheme } from "../utils/shiki-themes";
import MarkdownRenderer from "../components/MarkdownRenderer";

export async function renderMdxPreviewAction(content: string) {
  await verifyAdmin();
  
  // Limpiar caracteres especiales de Windows y espacios extra
  const rawContent = content.replace(/\r\n/g, "\n").trim();
  
  // Intentar separar el frontmatter del contenido
  let mdxContent = rawContent;
  let displayTitle = "";

  try {
    const { data, content: strippedContent } = matter(rawContent);
    displayTitle = data.title || "";
    // Solo usamos strippedContent si realmente había frontmatter
    if (rawContent.startsWith("---")) {
      mdxContent = strippedContent.trim();
    }
  } catch (e) {
    console.error("Error parsing matter:", e);
  }

  let mdxSource;
  try {
    // Rendereamos el Server Component directamente para enviarlo al cliente
    // Esto evita usar serialize() de next-mdx-remote, que causa errores de módulo no encontrado
    // en Vercel con Turbopack debido a cómo se compila JSX internamente.
    const previewNode = <MarkdownRenderer content={mdxContent} isPreview={true} />;

    return {
      success: true as const,
      displayTitle,
      previewNode,
    };
  } catch (compilationError: any) {
    console.error("MDX Compilation Error in preview:", compilationError);
    let errorMessage = compilationError?.message || compilationError?.reason || String(compilationError);
    if (!errorMessage || errorMessage === "[object Object]") {
      errorMessage = JSON.stringify(compilationError, Object.getOwnPropertyNames(compilationError));
    }
    return {
      success: false as const,
      error: `Error interno Vercel: ${errorMessage}`,
      displayTitle,
    };
  }
}

export async function moveItemAction(projectId: string, oldPath: string, newParentPath: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const normalizedNewParent = newParentPath === projectId || newParentPath === project.slug || newParentPath === project.id ? "" : newParentPath;
  await adminService.moveItem(project.slug, oldPath, normalizedNewParent);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");
  return { success: true };
}

export async function updatePageMetadataAction(
  projectId: string, 
  path: string, 
  metadata: { 
    title?: string, 
    description?: string, 
    category?: string, 
    order?: number, 
    categoryOrder?: number,
    draft?: boolean,
    public?: boolean,
    date?: string,
    icon?: string
  }
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);

  const page = await prisma.docPage.findFirst({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: path },
        { slug: `${path}/index` }
      ]
    }
  });

  if (!page) throw new Error(`Página no encontrada: ${path}`);

  await prisma.docPage.update({
    where: { id: page.id },
    data: {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      order: metadata.order,
      categoryOrder: metadata.categoryOrder,
      draft: metadata.draft,
      icon: metadata.icon,
      publishDate: (metadata.date && metadata.date.trim() !== "") ? new Date(metadata.date) : null,
    }
  });

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");


  return { success: true };
}

export async function reorderItemAction(projectId: string, path: string, direction: 'up' | 'down') {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);

  const parts = path.split('/');
  const isIndex = path === 'index' || path.endsWith('/index');
  const parentPath = parts.slice(0, -1).join('/');
  
  const isTopic = isIndex;
  const sortField = isTopic ? 'categoryOrder' : 'order';

  let siblings = project.pages.filter((p: any) => {
    const pParts = p.slug.split('/');
    const pParent = pParts.slice(0, -1).join('/');
    if (isTopic) {
      return p.slug.endsWith('/index') && pParent === parentPath.split('/').slice(0, -1).join('/');
    } else {
      return pParent === parentPath && !p.slug.endsWith('/index');
    }
  });

  siblings.sort((a: any, b: any) => (a as any)[sortField] - (b as any)[sortField]);

  const currentIndex = siblings.findIndex((s: any) => s.slug === path || s.slug === `${path}/index`);
  if (currentIndex === -1) {
    return { success: false };
  }

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= siblings.length) return { success: false };

  const target = siblings[newIndex];
  const current = siblings[currentIndex];
  
  const targetVal = (target as any)[sortField];
  const currentVal = (current as any)[sortField];

  if (targetVal === currentVal) {
     for (let i = 0; i < siblings.length; i++) {
        await prisma.docPage.update({ where: { id: siblings[i].id }, data: { [sortField]: i * 10 } });
     }
     return reorderItemAction(projectId, path, direction);
  }

  await prisma.$transaction([
    prisma.docPage.update({ where: { id: current.id }, data: { [sortField]: targetVal } }),
    prisma.docPage.update({ where: { id: target.id }, data: { [sortField]: currentVal } })
  ]);

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");

  return { success: true };
}

export async function moveAndReorderAction(
  projectId: string, 
  sourcePath: string, 
  targetPath: string, 
  position: 'before' | 'after' | 'inside'
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);

  const findPage = (p: string) => 
    project.pages.find((pg: any) => pg.slug === p) || project.pages.find((pg: any) => pg.slug === `${p}/index`);

  const sourcePage = findPage(sourcePath);
  const targetPage = findPage(targetPath);
  
  if (!sourcePage || !targetPage) {
    throw new Error(`Página no encontrada. Origen: ${sourcePath}, Destino: ${targetPath}`);
  }

  if (sourcePage.id === targetPage.id && position !== 'inside') return { success: true };

  const sourceIsTopic = sourcePage.slug === 'index' || sourcePage.slug.endsWith('/index');
  const targetIsTopic = targetPage.slug === 'index' || targetPage.slug.endsWith('/index');
  const sortField = sourceIsTopic ? 'categoryOrder' : 'order';

  const sourceFileName = sourcePage.slug.split('/').pop() || '';
  const sourceFolderPrefix = sourcePage.slug.replace(/\/index$/, '');
  const sourceBaseName = sourceFolderPrefix.split('/').pop() || '';
  const targetBase = targetPage.slug.replace(/\/index$/, '');
  
  let newSlug = sourcePage.slug;
  if (position === 'inside') {
    newSlug = sourceIsTopic ? `${targetBase}/${sourceBaseName}/index` : `${targetBase}/${sourceFileName}`;
  } else {
    const targetHierarchyParent = targetBase.split('/').slice(0, -1).join('/');
    newSlug = sourceIsTopic 
      ? (targetHierarchyParent ? `${targetHierarchyParent}/${sourceBaseName}/index` : `${sourceBaseName}/index`)
      : (targetHierarchyParent ? `${targetHierarchyParent}/${sourceFileName}` : sourceFileName);
  }

  const newSlugParts = newSlug.split('/');
  if (newSlugParts.length > 3) {
    throw new Error("No se pueden anidar elementos a más de 3 niveles de profundidad (Tópico > Categoría > Página).");
  }
  
  if (sourceIsTopic) {
    const descendants = project.pages.filter((p: any) => p.slug.startsWith(`${sourceFolderPrefix}/`) && p.id !== sourcePage.id);
    const maxDescendantDepth = descendants.reduce((max: number, d: any) => {
      const depth = d.slug.split('/').length;
      return Math.max(max, depth);
    }, 0);
    
    const depthShift = newSlugParts.length - sourcePage.slug.split('/').length;
    if (maxDescendantDepth + depthShift > 3) {
      throw new Error("El movimiento excedería el límite de 3 niveles de profundidad para los elementos hijos.");
    }
  }

  const oldFolderPrefix = sourceFolderPrefix;
  const newFolderPrefix = newSlug.replace(/\/index$/, '');

  await prisma.$transaction(async (tx: any) => {
    if (sourceIsTopic && oldFolderPrefix !== newFolderPrefix) {
      const descendants = project.pages.filter((p: any) => p.slug.startsWith(`${oldFolderPrefix}/`) && p.id !== sourcePage.id);
      for (const desc of descendants) {
        const relativePath = desc.slug.substring(oldFolderPrefix.length);
        await tx.docPage.update({
          where: { id: desc.id },
          data: { slug: `${newFolderPrefix}${relativePath}` }
        });
      }
    }

    let newOrder = (targetPage as any)[sortField] || 0;
    if (position === 'before') newOrder -= 5;
    else if (position === 'after') newOrder += 5;

    await tx.docPage.update({
      where: { id: sourcePage.id },
      data: { 
        slug: newSlug,
        [sortField]: position === 'inside' ? undefined : newOrder
      }
    });

    const allPages = await tx.docPage.findMany({
      where: { docProjectId: project.id },
      orderBy: { [sortField]: 'asc' }
    });

    const currentTargetParent = newFolderPrefix.split('/').slice(0, -1).join('/');
    const siblings = allPages.filter((p: any) => {
       const pParent = p.slug.replace(/\/index$/, '').split('/').slice(0, -1).join('/');
       const pIsTopic = p.slug === 'index' || p.slug.endsWith('/index');
       return pParent === currentTargetParent && pIsTopic === sourceIsTopic;
    });

    for (let i = 0; i < siblings.length; i++) {
      await tx.docPage.update({
        where: { id: siblings[i].id },
        data: { [sortField]: i * 10 }
      });
    }
  });

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");

  return { success: true };
}

import { generateText } from "ai";
import { getAIModel } from "@/features/teacher/services/ai/client";

export async function generateDocContentAction(prompt: string, currentContent?: string, mode: "append" | "replace" | "integrate" | "improve" = "append") {
  const session = await verifyAdmin();
  const userId = session.user.id;
  const model = await getAIModel(userId);

  let systemPrompt = `Eres un redactor experto de documentación técnica y contenido académico en formato MDX.
Tu tarea es generar, expandir o mejorar contenido para un archivo de documentación en base a la solicitud del usuario.
  
Directrices:
- Escribe en español
- Devuelve SIEMPRE contenido en formato Markdown/MDX válido
- Mantén un tono profesional, claro y estructurado
- No incluyas explicaciones adicionales ni bloques de código redundantes. Devuelve ÚNICAMENTE el contenido en MDX final.`;

  if (mode === "integrate") {
    systemPrompt += `\n- Estás en modo de FUSIÓN E INTEGRACIÓN. Lee el contenido actual completo, y combínalo/adáptalo coherentemente con la nueva solicitud. No borres partes importantes ya existentes a menos que la solicitud lo indique expresamente. El resultado final debe ser el documento completo y fusionado de manera fluida.`;
  } else if (mode === "improve") {
    systemPrompt += `\n- Estás en modo de MEJORAR Y EXPANDIR. Lee el contenido actual completo y expande los temas, profundiza las explicaciones, corrige errores o enriquece el documento con nuevos ejemplos o detalles técnicos solicitados. El resultado final debe ser el documento completo mejorado y expandido de manera fluida.`;
  }

  const userPrompt = currentContent 
    ? `Contenido actual del documento:\n\n${currentContent}\n\nSolicitud de mejora/generación:\n\n${prompt}`
    : `Solicitud de generación:\n\n${prompt}`;

  const { text } = await generateText({
    model,
    prompt: `${systemPrompt}\n\n${userPrompt}`,
  });

  return { success: true, content: text };
}

import { generateObject } from "ai";
import { z } from "zod";

export async function generateFullProjectAction(name: string, prompt: string) {
  const session = await verifyAdmin();
  const userId = session.user.id;
  const model = await getAIModel(userId);

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const existing = await prisma.docProject.findUnique({ where: { slug } });
  if (existing) throw new Error("Ya existe un proyecto con ese nombre o identificador similar.");

  const systemPrompt = `Eres un redactor experto de documentación técnica y contenido académico en formato MDX.
Tu tarea es generar la estructura y el contenido completo de un proyecto de documentación para el tema o descripción suministrado por el usuario.

REGLAS DE FORMATO DE SLUGS Y ESTRUCTURA:
Este sistema organiza los documentos mediante carpetas/categorías y subarchivos utilizando los slugs.
- Para la página de INICIO principal del proyecto (raíz), el slug debe ser exactamente "index".
- Para las categorías/tópicos del proyecto, utiliza el formato "XX-nombre-categoria/index" donde XX es un número de dos dígitos de orden (ej: "01-introduccion/index", "02-conceptos-basicos/index", etc.). Estas páginas actuarán como los índices de las categorías.
- Para los documentos/archivos dentro de una categoría, utiliza el formato "XX-nombre-categoria/YY-nombre-archivo" donde XX es el orden de la categoría y YY es el orden de la página dentro de esa categoría (ej: "01-introduccion/01-que-es-python", "01-introduccion/02-instalacion").
- El contenido debe estar en MDX válido.

EJEMPLO DE ESTRUCTURA GENERADA PARA UN CURSO:
[
  { "slug": "index", "title": "Inicio", "category": "General", "order": 0, "categoryOrder": 0, "content": "# Bienvenidos..." },
  { "slug": "01-fundamentos/index", "title": "Fundamentos", "category": "Fundamentos", "order": 0, "categoryOrder": 1, "content": "# Módulo 1..." },
  { "slug": "01-fundamentos/01-introduccion", "title": "Introducción", "category": "Fundamentos", "order": 1, "categoryOrder": 1, "content": "# Introducción completa..." },
  { "slug": "02-estructuras/index", "title": "Estructuras de Control", "category": "Estructuras de Control", "order": 0, "categoryOrder": 2, "content": "# Módulo 2..." }
]

REGLAS DE CONTENIDO OBLIGATORIAS:
- NO dejes secciones incompletas, no utilices frases de relleno, resúmenes breves ni marcadores de posición (placeholders).
- Escribe contenido completo, detallado, útil y muy estético (usando componentes como Accordion, Terminal, Alert, Steps si es necesario).
- Asegúrate de incluir explicaciones exhaustivas, profundas y rigurosas con ejemplos de código completos y prácticos para cada tema solicitado por el profesor.

Estructura solicitada: ${prompt}`;

  const { object } = await generateObject({
    model,
    schema: z.object({
      pages: z.array(z.object({
        slug: z.string(),
        title: z.string(),
        content: z.string(),
        category: z.string().optional(),
        order: z.number().optional(),
        categoryOrder: z.number().optional()
      }))
    }),
    prompt: `${systemPrompt}\n\nGenera la documentación completa para: ${prompt}`,
  });

  if (!object?.pages || object.pages.length === 0) {
    throw new Error("No se pudo generar la estructura de la documentación.");
  }

  // Ensure an index page is present
  const hasIndex = object.pages.some(p => p.slug === "index");
  if (!hasIndex) {
    object.pages.unshift({
      slug: "index",
      title: "Inicio",
      content: `# Bienvenidos a ${name}\n\nEsta es la página principal del proyecto generado automáticamente por la IA.`,
      category: "General",
      order: 0,
      categoryOrder: 0
    });
  }

  const project = await prisma.docProject.create({
    data: {
      name,
      slug,
      teacherId: userId,
      pages: {
        create: object.pages.map(p => ({
          slug: p.slug,
          title: p.title,
          content: p.content,
          category: p.category || "General",
          order: p.order || 0,
          categoryOrder: p.categoryOrder || 0
        }))
      }
    }
  });

  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true, slug: project.slug };
}

export async function getProjectCoursesAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  const projectWithCourses = await prisma.docProject.findFirst({
    where: { id: project.id },
    include: {
      courses: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
  
  return projectWithCourses?.courses || [];
}

export async function linkProjectToCourseAction(courseId: string, projectId: string | null) {
  const session = await verifyAdmin();
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true }
  });

  if (!course) throw new Error("Curso no encontrado");
  if (course.teacherId !== session.user.id && session.user.role !== "admin") {
    throw new Error("No tienes permiso sobre este curso");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { docProjectId: projectId }
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  return { success: true };
}

export async function getTeacherDocProjectsAction() {
  const session = await verifyAdmin();
  return await prisma.docProject.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  return {
    id: project.id,
    name: project.name,
    slug: project.slug
  };
}

export async function updateProjectNameAction(projectId: string, newName: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  await prisma.docProject.update({
    where: { id: project.id },
    data: { name: newName }
  });
  
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/dashboard/teacher/docs");
  
  
  return { success: true };
}

export async function exportProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);
  
  return project.pages.map((p: any) => ({
    slug: p.slug,
    title: p.title,
    content: p.content
  }));
}

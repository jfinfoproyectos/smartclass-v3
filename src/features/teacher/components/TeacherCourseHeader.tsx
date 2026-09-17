"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { CodeThemeSelector } from "@/components/theme/CodeThemeSelector";
import { CreditsModal } from "@/components/CreditsModal";
import { useRouter, usePathname, useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    ChevronLeft, 
    Users, 
    ExternalLink, 
    ClipboardCheck, 
    FileCheck, 
    BarChart3, 
    Dices,
    Settings2,
    LayoutDashboard,
    Share2,
    CalendarCheck2,
    BookOpenText,
    Layers,
    Loader2
} from "lucide-react";
import { useTransition } from "react";
import Link from "next/link";
import { ThemeSelector, ThemeInfo } from "@/components/theme/ThemeSelector";
import { MobileSettingsMenu } from "@/components/MobileSettingsMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TeacherCourseHeaderProps {
    courseId: string;
    courseTitle: string;
    userName: string;
    themes: ThemeInfo[];
    activeTab?: string;
    themeMode?: string;
    allowThemeColorChange?: boolean;
}

export function TeacherCourseHeader({ 
    courseId, 
    courseTitle, 
    userName, 
    themes, 
    activeTab, 
    themeMode = "STUDENT", 
    allowThemeColorChange = true 
}: TeacherCourseHeaderProps) {
    const showModeToggle = true;
    const showThemeSelector = true;
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTab = searchParams.get("tab") || (pathname?.includes("/evaluations") ? "evaluations" : "activities");

    return (
        <div className="flex-none bg-background/95 backdrop-blur-xl w-full border-b border-border/50 shadow-sm transition-all duration-300">
            <style jsx global>{`
                main[data-slot="sidebar-inset"] > header {
                    display: none !important;
                }
                main[data-slot="sidebar-inset"] > div > div {
                    padding-top: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
            `}</style>

            <TooltipProvider delayDuration={300}>
                {/* Row 1: Primary Controls & Identity (h-12 to match AppIdentity sidebar header and dashboard layout) */}
                <div className="flex items-center h-12 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                    {/* Left: Sidebar trigger */}
                    <div className="flex items-center h-full px-2 sm:px-3 border-r border-border/40">
                        <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-xl transition-colors" />
                    </div>

                    {/* Middle: Course details */}
                    <div className="flex-1 flex items-center gap-2 h-full px-2.5 sm:px-4 min-w-0">
                        <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
                            {courseTitle}
                        </h2>
                        <div className="hidden sm:flex items-center gap-1 shrink-0 text-muted-foreground">
                            <span className="text-[10px] opacity-40">•</span>
                            <Users className="h-3 w-3 text-primary" />
                            <span className="text-[11px] font-medium truncate">{userName}</span>
                        </div>
                    </div>

                    <div className="flex items-center h-full px-1.5 sm:px-2.5 border-l border-border/40">
                        {/* Mobile Settings dropdown */}
                        <div className="flex md:hidden items-center">
                            <MobileSettingsMenu 
                                themes={themes} 
                                showThemeSelector={showThemeSelector} 
                                showModeToggle={showModeToggle} 
                            />
                        </div>

                        {/* Desktop Settings pill */}
                        <div className="hidden md:flex items-center gap-0.5 bg-muted/60 dark:bg-muted/30 p-0.5 rounded-xl border border-border/70 shadow-2xs backdrop-blur-md">
                            {showThemeSelector && <ThemeSelector themes={themes} />}
                            <CodeThemeSelector />
                            {showModeToggle && <ModeToggle />}
                            <div className="h-3.5 w-[1px] bg-border/80 mx-0.5" />
                            <CreditsModal />
                        </div>
                    </div>
                </div>

                {/* Row 2: Content Navigation (Pestañas Reales) */}
                <div className="bg-background border-b border-border/60">
                    <div className="overflow-x-auto scrollbar-none w-full flex items-center justify-start lg:justify-center px-1 sm:px-4 scroll-smooth">
                        <TabsList className="!flex h-10 sm:h-11 w-max lg:w-full lg:max-w-6xl lg:grid lg:grid-cols-8 !bg-transparent !p-0 !border-0 !rounded-none !shadow-none gap-0 sm:gap-1">
                            <NavTab value="activities" icon={<ClipboardCheck className="h-4 w-4" />} label="Actividades" />
                            <NavTab value="students" icon={<Users className="h-4 w-4" />} label="Estudiantes" />
                            <NavTab value="attendance" icon={<CalendarCheck2 className="h-4 w-4" />} label="Asistencia" />
                            <NavTab value="evaluations" icon={<FileCheck className="h-4 w-4" />} label="Evaluaciones" />
                            <NavTab value="grades" icon={<LayoutDashboard className="h-4 w-4" />} label="Calificaciones" />
                            <NavTab value="stats" icon={<BarChart3 className="h-4 w-4" />} label="Estadísticas" />
                            <NavTab value="share" icon={<Share2 className="h-4 w-4" />} label="Compartir" />
                            <NavTab value="docs" icon={<BookOpenText className="h-4 w-4" />} label="Documentación" />
                        </TabsList>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
}

function NavTab({ value, icon, label }: { value: string, icon: React.ReactNode, label: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const { courseId } = useParams();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const handleClick = (e: React.MouseEvent) => {
        // Optimization: avoid redundant navigations if we are already in the base course path and on the same tab
        const currentTab = searchParams.get("tab") || (pathname?.includes('/evaluations') ? "evaluations" : "activities");
        const isBaseCoursePath = !pathname?.includes('/activities/') && 
                                !pathname?.includes('/evaluations/') &&
                                !pathname?.includes('/duplicates/');

        if (currentTab === value && isBaseCoursePath) {
            return;
        }

        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", value);
            router.replace(`/dashboard/teacher/courses/${courseId}?${params.toString()}`, { scroll: false });
        });
    };

    return (
        <TabsTrigger 
            value={value} 
            onClick={handleClick}
            disabled={isPending}
            className="group relative flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-11 px-2.5 sm:px-4 text-xs font-semibold !rounded-none !border-0 !border-b-2 !border-transparent transition-all text-muted-foreground hover:text-foreground hover:!border-border/80 data-[state=active]:!border-primary data-[state=active]:!text-primary data-[state=active]:font-bold data-[state=active]:!bg-transparent data-[state=active]:!shadow-none disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
        >
            <span className="transition-colors group-data-[state=active]:text-primary">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : icon}
            </span>
            <span className="transition-colors group-data-[state=active]:text-primary">{label}</span>
            {isPending && (
                <span className="absolute top-2 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
            )}
        </TabsTrigger>
    );
}



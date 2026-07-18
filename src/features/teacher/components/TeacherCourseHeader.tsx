"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/ModeToggle";
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
    Loader2
} from "lucide-react";
import { useTransition } from "react";
import Link from "next/link";
import { AttendanceTaker } from "@/features/attendance/components/AttendanceTaker";
import { ThemeSelector, ThemeInfo } from "@/components/theme/ThemeSelector";
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
     return (
        <div className="flex-none relative bg-background/95 backdrop-blur-md w-full z-30 border-b border-border/50 shadow-sm transition-all duration-300">
            <style jsx global>{`
                /* Global layout adjustments for the course dashboard */
                main[data-slot="sidebar-inset"] > header {
                    display: none !important;
                }

                main[data-slot="sidebar-inset"] > div > div {
                    padding: 0 !important;
                    overflow: hidden !important;
                }

                .nav-indicator-active {
                    position: relative;
                }
                
                .nav-indicator-active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: hsl(var(--primary));
                    border-radius: 2px 2px 0 0;
                    box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
                }
            `}</style>

            <TooltipProvider delayDuration={300}>
                {/* Row 1: Primary Controls & Identity (h-12 with full-height border dividers) */}
                <div className="flex items-center h-12 border-b border-foreground/10 bg-background/50">
                    {/* Left: Sidebar trigger with full-height border */}
                    <div className="flex items-center h-full px-3 border-r border-foreground/10">
                        <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-lg transition-colors" />
                    </div>

                    {/* Middle: Course details */}
                    <div className="flex-1 flex flex-col justify-center h-full px-4 min-w-0">
                        <h2 className="text-[13px] font-black tracking-tight leading-none uppercase truncate opacity-90 transition-opacity">
                            {courseTitle}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Users className="h-2.5 w-2.5 text-primary/60" />
                            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest truncate">{userName}</span>
                        </div>
                    </div>

                    {/* Right: Asistencia & utilities separated by full-height borders */}
                    <div className="flex items-center h-full px-2 sm:px-4 border-l border-foreground/10">
                        <AttendanceTaker 
                            courseId={courseId} 
                            trigger={
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold px-2 gap-1.5 hover:bg-muted transition-all">
                                    <CalendarCheck2 className="h-3.5 w-3.5 text-primary" />
                                    <span className="hidden sm:inline uppercase tracking-tighter">Asistencia</span>
                                </Button>
                            }
                        />
                    </div>

                    <div className="flex items-center h-full px-3 gap-1.5 border-l border-foreground/10">
                        {showThemeSelector && <ThemeSelector themes={themes} />}
                        {showModeToggle && <ModeToggle />}
                        <CreditsModal />
                    </div>
                </div>

                {/* Row 2: Content Navigation (scrollable on mobile, grid on desktop) */}
                <div className="border-b border-foreground/10 bg-muted/5">
                    <div className="overflow-x-auto scrollbar-none w-full flex items-center justify-start lg:justify-center lg:h-11 px-4 py-1.5 lg:py-0">
                        <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-9 h-9 p-0.5 bg-muted/60 dark:bg-muted/30 rounded-lg gap-0.5 border border-border/30 lg:border-none shadow-none min-w-full">
                            <NavTab value="activities" icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Actividades" />
                            <NavTab value="students" icon={<Users className="h-3.5 w-3.5" />} label="Estudiantes" />
                            <NavTab value="evaluations" icon={<FileCheck className="h-3.5 w-3.5" />} label="Evaluaciones" />
                            <NavTab value="grades" icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Calificaciones" />
                            <NavTab value="stats" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Estadísticas" />
                            <NavTab value="roulette" icon={<Dices className="h-3.5 w-3.5" />} label="Ruleta" />
                            <NavTab value="groups" icon={<Settings2 className="h-3.5 w-3.5" />} label="Grupos" />
                            <NavTab value="share" icon={<Share2 className="h-3.5 w-3.5" />} label="Compartir" />
                            <NavTab value="docs" icon={<BookOpenText className="h-3.5 w-3.5" />} label="Documentación" />
                        </TabsList>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
}

function NavTab({ value, icon, label }: { value: string, icon: React.ReactNode, label: string }) {
    const router = useRouter();
    const { courseId } = useParams();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const handleClick = (e: React.MouseEvent) => {
        // Optimization: avoid redundant navigations if we are already in the base course path and on the same tab
        const currentTab = searchParams.get("tab") || "activities";
        const isBaseCoursePath = !window.location.pathname.includes('/activities/') && 
                                !window.location.pathname.includes('/evaluations/') &&
                                !window.location.pathname.includes('/duplicates/');

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
            className="group relative flex items-center justify-center gap-1.5 h-8 px-2.5 text-[9px] uppercase tracking-wider font-extrabold rounded-md transition-all hover:bg-background/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm disabled:opacity-40 whitespace-nowrap shrink-0"
        >
            <span className="group-data-[state=active]:text-primary transition-colors">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
            </span>
            <span className="hidden sm:inline group-data-[state=active]:text-primary transition-colors">{label}</span>
            {isPending && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
        </TabsTrigger>
    );
}



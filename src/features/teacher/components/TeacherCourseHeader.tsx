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
                {/* Row 1: Primary Controls & Identity (h-16 to match AppIdentity sidebar header) */}
                <div className="flex items-center h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                    {/* Left: Sidebar trigger */}
                    <div className="flex items-center h-full px-3 border-r border-border/40">
                        <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-xl transition-colors" />
                    </div>

                    {/* Middle: Course details */}
                    <div className="flex-1 flex flex-col justify-center h-full px-4 min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                            {courseTitle}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Users className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-muted-foreground truncate">{userName}</span>
                        </div>
                    </div>

                    {/* Right: Asistencia & utilities */}
                    <div className="flex items-center h-full px-2 sm:px-4 border-l border-border/40">
                        <AttendanceTaker 
                            courseId={courseId} 
                            trigger={
                                <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold px-3 gap-1.5 hover:bg-muted/80 rounded-xl transition-all">
                                    <CalendarCheck2 className="h-4 w-4 text-primary" />
                                    <span className="hidden sm:inline">Asistencia</span>
                                </Button>
                            }
                        />
                    </div>

                    <div className="flex items-center h-full px-3 gap-1.5 border-l border-border/40">
                        {showThemeSelector && <ThemeSelector themes={themes} />}
                        {showModeToggle && <ModeToggle />}
                        <CreditsModal />
                    </div>
                </div>

                {/* Row 2: Content Navigation */}
                <div className="border-b border-border/40 bg-muted/30">
                    <div className="overflow-x-auto scrollbar-none w-full flex items-center justify-start lg:justify-center px-3 py-1.5">
                        <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-9 h-10 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl gap-1 border border-border/40 shadow-none min-w-full">
                            <NavTab value="activities" icon={<ClipboardCheck className="h-4 w-4" />} label="Actividades" />
                            <NavTab value="students" icon={<Users className="h-4 w-4" />} label="Estudiantes" />
                            <NavTab value="evaluations" icon={<FileCheck className="h-4 w-4" />} label="Evaluaciones" />
                            <NavTab value="grades" icon={<LayoutDashboard className="h-4 w-4" />} label="Calificaciones" />
                            <NavTab value="stats" icon={<BarChart3 className="h-4 w-4" />} label="Estadísticas" />
                            <NavTab value="roulette" icon={<Dices className="h-4 w-4" />} label="Ruleta" />
                            <NavTab value="groups" icon={<Settings2 className="h-4 w-4" />} label="Grupos" />
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
            className="group relative flex items-center justify-center gap-2 h-8 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-background/40 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm disabled:opacity-40 whitespace-nowrap shrink-0"
        >
            <span className="group-data-[state=active]:text-primary transition-colors">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
            </span>
            <span className="hidden sm:inline group-data-[state=active]:text-primary transition-colors">{label}</span>
            {isPending && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
        </TabsTrigger>
    );
}



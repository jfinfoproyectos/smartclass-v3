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
    GraduationCap, 
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
import { RefreshButton } from "@/components/navigation/RefreshButton";

interface TeacherCourseHeaderProps {
    courseId: string;
    courseTitle: string;
    courseExternalUrl?: string | null;
    userName: string;
    themes: ThemeInfo[];
    activeTab?: string;
    themeMode?: string;
    allowThemeColorChange?: boolean;
}

export function TeacherCourseHeader({ 
    courseId, 
    courseTitle, 
    courseExternalUrl, 
    userName, 
    themes, 
    activeTab, 
    themeMode = "STUDENT",
    allowThemeColorChange = true 
}: TeacherCourseHeaderProps) {
    const showModeToggle = themeMode === "STUDENT";
    const showThemeSelector = allowThemeColorChange;
    return (
        <div className="flex-none bg-background/95 backdrop-blur-md w-full z-30 border-b border-border/50 shadow-sm transition-all duration-300">
            <style jsx global>{`
                /* Global layout adjustments for the course dashboard */
                main[data-slot="sidebar-inset"] > header {
                    display: none !important;
                }

                main[data-slot="sidebar-inset"] {
                    margin: 0 !important;
                    border-radius: 0 !important;
                    height: 100vh !important;
                    overflow: hidden !important;
                    display: flex !important;
                    flex-direction: column !important;
                }

                main[data-slot="sidebar-inset"] > div {
                    padding: 0 !important;
                    margin: 0 !important;
                    height: 100vh !important;
                    max-height: 100vh !important;
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
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
                {/* Row 1: Primary Controls & Identity (h-12) */}
                <div className="flex items-center px-4 h-12 border-b-2 border-foreground/10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="h-8 w-8 hover:bg-muted/80 rounded-lg transition-colors" />
                            <div className="h-6 w-[2px] bg-foreground/15" />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        asChild
                                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                                    >
                                        <Link href="/dashboard/teacher">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Salir del curso</TooltipContent>
                            </Tooltip>
                        </div>
                        
                        <div className="h-6 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />

                        <div className="flex flex-col min-w-0">
                            <h2 className="text-[13px] font-black tracking-tight leading-none uppercase truncate opacity-90 transition-opacity">
                                {courseTitle}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Users className="h-2.5 w-2.5 text-primary/60" />
                                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest truncate">{userName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right utilities */}
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="h-6 w-[2px] bg-foreground/15 hidden md:block mx-1" />
                        <div className="hidden lg:flex items-center bg-muted/60 hover:bg-muted/80 transition-colors rounded-full px-1 py-1 h-8 gap-1 border border-foreground/10">
                            <AttendanceTaker 
                                courseId={courseId} 
                                trigger={
                                    <Button variant="ghost" size="sm" className="h-6 rounded-full text-[10px] font-bold px-2.5 gap-1.5 hover:bg-background/50 transition-all">
                                        <CalendarCheck2 className="h-3 w-3 text-primary" />
                                        <span className="hidden xl:inline uppercase tracking-tighter">Asistencia</span>
                                    </Button>
                                }
                            />
                            
                            {courseExternalUrl && (
                                <>
                                    <div className="h-4 w-[1px] bg-foreground/20" />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                                            >
                                                <Link href={courseExternalUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">Documentación externa</TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                        </div>

                        <div className="h-6 w-[2px] bg-foreground/15 mx-1 hidden sm:block" />
                        
                        <div className="flex items-center gap-1">
                            <RefreshButton />
                            {showThemeSelector && <ThemeSelector themes={themes} />}
                            {showModeToggle && <ModeToggle />}
                            <CreditsModal />
                        </div>
                    </div>
                </div>

                {/* Row 2: Content Navigation (h-10) */}
                <div className="px-4 h-10 flex items-center justify-center bg-muted/5 border-b border-foreground/10 shadow-[0_1px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <TabsList className="flex w-full md:w-auto h-10 p-0 bg-transparent gap-0 overflow-x-auto scrollbar-none justify-center">
                        <NavTab value="activities" icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Actividades" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="students" icon={<Users className="h-3.5 w-3.5" />} label="Estudiantes" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="evaluations" icon={<GraduationCap className="h-3.5 w-3.5" />} label="Evaluaciones" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="grades" icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Calificaciones" />
                        
                        <div className="h-8 w-[2px] bg-foreground/20 mx-4 self-center hidden sm:block" />
                        
                        <NavTab value="stats" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Estadísticas" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="roulette" icon={<Dices className="h-3.5 w-3.5" />} label="Ruleta" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="groups" icon={<Settings2 className="h-3.5 w-3.5" />} label="Grupos" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="share" icon={<Share2 className="h-3.5 w-3.5" />} label="Compartir" />
                        <div className="h-5 w-[1px] bg-foreground/15 self-center hidden sm:block" />
                        <NavTab value="docs" icon={<BookOpenText className="h-3.5 w-3.5" />} label="Documentación" />
                    </TabsList>
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
            className="group relative flex items-center gap-2 h-10 px-3 text-[10px] uppercase tracking-wider font-bold bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none transition-all opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:nav-indicator-active disabled:opacity-40"
        >
            <span className="group-data-[state=active]:text-primary transition-colors">
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
            </span>
            <span className="hidden sm:inline group-data-[state=active]:text-primary transition-colors">{label}</span>
            {isPending && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
        </TabsTrigger>
    );
}



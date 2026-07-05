"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCatalog } from "./CourseCatalog";
import { MyEnrollments } from "./MyEnrollments";
import { formatName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function StudentDashboard({
    availableCourses,
    myEnrollments,
    studentName,
    pendingEnrollments = [],
    themes = []
}: {
    availableCourses: any[],
    myEnrollments: any[],
    studentName: string,
    pendingEnrollments?: string[],
    themes?: any[]
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const selectedCourse = searchParams.get("courseId") || "";
    const activeTab = searchParams.get("tab") || "activities";
    const isInsideCourse = !!selectedCourse;

    const handleSelectCourse = (courseId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (courseId) {
            params.set("courseId", courseId);
            params.set("tab", "activities"); // Default tab when entering
        } else {
            params.delete("courseId");
            params.delete("tab");
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className={cn(
            "flex-1 w-full",
            isInsideCourse ? "p-0 h-[calc(100vh-4rem)] overflow-hidden flex flex-col" : "p-4 sm:p-6 md:p-8 space-y-6"
        )}>
            {/* Header - Hidden when inside a course */}
            {!isInsideCourse && (
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">¡Hola, {formatName(studentName)}!</h1>
                    <p className="text-muted-foreground">
                        Aquí tienes un resumen de tu actividad académica en SmartClass.
                    </p>
                </div>
            )}

            {pendingEnrollments.length > 0 && !isInsideCourse && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200 ml-4 sm:ml-6 md:ml-8 mr-4 sm:mr-6 md:mr-8">
                    Tienes {pendingEnrollments.length} solicitud{pendingEnrollments.length !== 1 ? 'es' : ''} de inscripción pendiente{pendingEnrollments.length !== 1 ? 's' : ''} de aprobación por el profesor.
                </div>
            )}

            {/* Content area */}
            <div className={cn(isInsideCourse ? "h-full" : "")}>
                {isInsideCourse && (
                    <style jsx global>{`
                        /* Hide the global App Header when inside a course to allow course-specific unified header */
                        main[data-slot="sidebar-inset"] > header {
                            display: none !important;
                        }

                        /* Remove all margins, radius and force full height on the main inset */
                        main[data-slot="sidebar-inset"] {
                            margin: 0 !important;
                            border-radius: 0 !important;
                            height: 100vh !important;
                            overflow: hidden !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }

                        /* Force the child container to be flush and fill the ENTIRE height since we hid the header */
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

                        /* Hide any potential footers and lock global scroll */
                        footer, .footer {
                            display: none !important;
                        }
                        /* Ocultar scrollbar global de windows si persiste */
                        body, html {
                            overflow: hidden !important;
                            height: 100vh !important;
                        }
                    `}</style>
                )}
                {isInsideCourse ? (
                    <MyEnrollments
                        enrollments={myEnrollments}
                        selectedCourse={selectedCourse}
                        onSelectCourse={handleSelectCourse}
                        themes={themes}
                    />
                ) : (
                    <Tabs defaultValue="my-courses" className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <TabsList className="grid w-full sm:w-auto grid-cols-2">
                                <TabsTrigger value="my-courses">Mis Cursos</TabsTrigger>
                                <TabsTrigger value="catalog">Catálogo de Cursos</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="my-courses" className="space-y-6 mt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <MyEnrollments 
                                    enrollments={myEnrollments} 
                                    selectedCourse={selectedCourse} 
                                    onSelectCourse={handleSelectCourse}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    themes={themes}
                                />
                            </motion.div>
                        </TabsContent>
                        <TabsContent value="catalog" className="space-y-6 mt-0">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CourseCatalog
                                    courses={availableCourses.filter(course =>
                                        !myEnrollments.some(enrollment => enrollment.courseId === course.id) &&
                                        (!course.endDate || new Date(course.endDate) >= new Date()) &&
                                        course.registrationOpen &&
                                        (!course.registrationDeadline || new Date(course.registrationDeadline) >= new Date())
                                    )}
                                    pendingEnrollments={pendingEnrollments}
                                />
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}

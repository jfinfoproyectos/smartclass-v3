"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MyEnrollments } from "./MyEnrollments";
import { formatName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EnrollCourseDialog } from "./EnrollCourseDialog";

export function StudentDashboard({
    myEnrollments,
    studentName,
    themes = []
}: {
    myEnrollments: any[],
    studentName: string,
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-3xl font-bold tracking-tight">¡Hola, {formatName(studentName).split(' ')[0]}!</h2>
                        <p className="text-muted-foreground">
                            Aquí tienes un resumen de tu actividad académica en SmartClass
                        </p>
                    </div>

                    <EnrollCourseDialog />
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

                        /* Force the scrollable child container to be flush and fill the ENTIRE height since we hid the header */
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

                        /* Also force the inner padding wrapper to fill completely */
                        main[data-slot="sidebar-inset"] > div > div {
                            padding: 0 !important;
                            margin: 0 !important;
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
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-2 border-border/50">
                            <h2 className="text-xl font-bold tracking-tight">Mis Cursos</h2>
                        </div>
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
                    </div>
                )}
            </div>
        </div>
    );
}

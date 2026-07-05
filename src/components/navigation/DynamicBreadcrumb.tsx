"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useEffect, useState, useRef } from "react";
import { getCourseTitle, getActivityTitle } from "@/app/actions/breadcrumb-actions";
import { cn } from "@/lib/utils";

interface BreadcrumbSegment {
    label: string;
    href?: string;
}

export function DynamicBreadcrumb() {
    const pathname = usePathname();
    const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);
    const breadcrumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const generateBreadcrumbs = async () => {
            const pathSegments = pathname.split("/").filter(Boolean);
            const breadcrumbs: BreadcrumbSegment[] = [];

            // Always start with Dashboard
            breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });

            // Process path segments
            for (let i = 1; i < pathSegments.length; i++) {
                const segment = pathSegments[i];
                const isLast = i === pathSegments.length - 1;

                const roleSegments = ["teacher", "student", "admin"];
                if (roleSegments.includes(segment) && !isLast) {
                    continue; 
                }

                const segmentMap: Record<string, string> = {
                    teacher: "Cursos", 
                    student: "Cursos", 
                    admin: "Administración",
                    courses: "Cursos",
                    activities: "Actividades",
                    attendance: "Asistencia",
                    statistics: "Estadísticas",
                    duplicates: "Reporte de Duplicados"
                };

                const href = isLast ? undefined : `/${pathSegments.slice(0, i + 1).join("/")}`;
                const isId = segment.match(/^[a-f0-9-]{36}$/) || (!segmentMap[segment] && segment.match(/^[a-z0-9]+$/i));

                if (isId) {
                    const prevSegment = pathSegments[i - 1];
                    if (prevSegment === "courses") {
                        const courseTitle = await getCourseTitle(segment);
                        breadcrumbs.push({ label: courseTitle || "Curso", href });
                    } else if (prevSegment === "activities") {
                        const activityTitle = await getActivityTitle(segment);
                        breadcrumbs.push({ label: activityTitle || "Actividad", href });
                    } else {
                        breadcrumbs.push({ label: segment, href });
                    }
                } else {
                    const label = segmentMap[segment] || segment;
                    breadcrumbs.push({ label, href });
                }
            }
            setSegments(breadcrumbs);
        };

        generateBreadcrumbs();
    }, [pathname]);

    if (pathname === "/dashboard") {
        return null;
    }

    return (
        <div ref={breadcrumbRef} className="overflow-hidden">
            <Breadcrumb>
                <BreadcrumbList>
                    {segments.map((segment, index) => {
                        const isLast = index === segments.length - 1;
                        return (
                            <div key={index} className={cn("flex items-center", !isLast && "hidden sm:flex")}>
                                <BreadcrumbItem>
                                    {segment.href ? (
                                        <BreadcrumbLink asChild>
                                            <Link href={segment.href} className="transition-colors hover:text-primary">
                                                {segment.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage className="font-semibold text-foreground">
                                            {segment.label}
                                        </BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                                {index < segments.length - 1 && <BreadcrumbSeparator className="hidden sm:block" />}
                            </div>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}

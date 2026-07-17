"use client";

import dynamic from 'next/dynamic';

const GithubActivityDetails = dynamic(() => import('./GithubActivityDetails').then(m => m.GithubActivityDetails), { ssr: false });
const ManualActivityDetails = dynamic(() => import('./ManualActivityDetails').then(m => m.ManualActivityDetails), { ssr: false });
const PdfReviewActivityDetails = dynamic(() => import('./PdfReviewActivityDetails').then(m => m.PdfReviewActivityDetails), { ssr: false });
const CodeProjectActivityDetails = dynamic(() => import('./CodeProjectActivityDetails').then(m => m.CodeProjectActivityDetails), { ssr: false });
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

export function ActivityDetails({ activity, userId, studentName }: ActivityDetailsProps) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-6 pt-4">
                <Button variant="ghost" size="sm" asChild className="w-fit h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <Link href={`/dashboard/student?courseId=${activity.courseId}&tab=activities`} className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-widest">
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        Volver a Actividades
                    </Link>
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <ActivityContent activity={activity} userId={userId} studentName={studentName} />
            </div>
        </div>
    );
}

function ActivityContent({ activity, userId, studentName }: ActivityDetailsProps) {
    switch (activity.type) {
        case "GITHUB":
            return <GithubActivityDetails activity={activity} userId={userId} studentName={studentName} />;

        case "MANUAL":
            return <ManualActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "PDF_REVIEW":
            return <PdfReviewActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "CODE_PROJECT":
            return <CodeProjectActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        default:
            return <div>Tipo de actividad no soportado</div>;
    }
}

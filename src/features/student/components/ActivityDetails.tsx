"use client";

import dynamic from 'next/dynamic';

const GithubActivityDetails = dynamic(() => import('./GithubActivityDetails').then(m => m.GithubActivityDetails), { ssr: false });
const ManualActivityDetails = dynamic(() => import('./ManualActivityDetails').then(m => m.ManualActivityDetails), { ssr: false });
const PdfReviewActivityDetails = dynamic(() => import('./PdfReviewActivityDetails').then(m => m.PdfReviewActivityDetails), { ssr: false });
const CodeProjectActivityDetails = dynamic(() => import('./CodeProjectActivityDetails').then(m => m.CodeProjectActivityDetails), { ssr: false });
const CodeChallengeActivityDetails = dynamic(() => import('./CodeChallengeActivityDetails').then(m => m.CodeChallengeActivityDetails), { ssr: false });
const VideoPitchActivityDetails = dynamic(() => import('./VideoPitchActivityDetails').then(m => m.VideoPitchActivityDetails), { ssr: false });
const AiInterviewActivityDetails = dynamic(() => import('./AiInterviewActivityDetails').then(m => m.AiInterviewActivityDetails), { ssr: false });
const DbModelingActivityDetails = dynamic(() => import('./DbModelingActivityDetails').then(m => m.DbModelingActivityDetails), { ssr: false });
const AudioDefenseActivityDetails = dynamic(() => import('./AudioDefenseActivityDetails').then(m => m.AudioDefenseActivityDetails), { ssr: false });
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Users, Crown, AlertCircle, CheckCircle2, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/utils";

interface ActivityDetailsProps {
    activity: any;
    userId: string;
    studentName: string;
}

function GroupActivityBanner({ activity }: { activity: any }) {
    if (!activity.isGroupActivity) return null;

    const group = activity.studentGroup;
    const isLeader = Boolean(activity.isLeader);
    const hasSubmission = Boolean(activity.submissions && activity.submissions.length > 0 && activity.submissions[0]?.url);
    const leaderName = group?.leader ? formatName(group.leader.name, group.leader.profile) : "Líder por designar";

    if (!group) {
        return (
            <div className="mb-2.5 p-3 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                    <p className="font-bold text-foreground">Actividad Grupal — Sin Grupo Asignado</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        Esta actividad requiere entrega en equipo, pero aún no perteneces a ningún grupo en este curso. Contacta a tu docente para que te asigne a un grupo de trabajo.
                    </p>
                </div>
            </div>
        );
    }

    if (isLeader) {
        return (
            <div className="mb-2.5 p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <Crown className="h-4 w-4 fill-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">
                                Eres el Líder de {group.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                                👑 Líder de Equipo
                            </Badge>
                            {activity.groupScope === "ACTIVITY" && (
                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                    <Target className="h-3 w-3 mr-1" /> Equipo Exclusivo
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Tu entrega representará a todo el equipo ({group.members?.length || 1} integrantes). Cuando el docente califique, la nota y retroalimentación se aplicarán automáticamente a todos los integrantes.
                        </p>
                    </div>
                </div>
                {hasSubmission && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 hidden sm:inline-flex">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Entrega Realizada
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <div className="mb-2.5 p-3 rounded-2xl border border-primary/20 bg-primary/5 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Users className="h-4 w-4" />
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">
                            Actividad Grupal — {group.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                            Integrante
                        </Badge>
                        {activity.groupScope === "ACTIVITY" && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                <Target className="h-3 w-3 mr-1" /> Equipo Exclusivo
                            </Badge>
                        )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        El líder asignado de tu equipo es <strong>{leaderName}</strong>. Únicamente el líder puede realizar la entrega. {hasSubmission ? "Tu líder ya ha realizado la entrega del equipo; se te asignará la misma nota una vez evaluada." : "Espera a que tu líder realice la entrega para ver el estado de tu equipo."}
                    </p>
                </div>
            </div>
            {hasSubmission && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 hidden sm:inline-flex">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Entregado por Líder
                </Badge>
            )}
        </div>
    );
}

export function ActivityDetails({ activity, userId, studentName }: ActivityDetailsProps) {
    const isFullHeight = activity.type === "GITHUB" || activity.type === "CODE_CHALLENGE";

    return (
        <div className={`flex flex-col ${isFullHeight ? "h-full min-h-0 overflow-hidden flex-1" : "min-h-full w-full"} p-1 sm:p-2`}>
            <GroupActivityBanner activity={activity} />
            <ActivityContent activity={activity} userId={userId} studentName={studentName} />
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
        case "CODE_CHALLENGE":
            return (
                <CodeChallengeActivityDetails
                    key={`${activity.id}_${activity.updatedAt ? new Date(activity.updatedAt).getTime() : ''}_${activity.description ? activity.description.length : 0}`}
                    activity={activity}
                    userId={userId}
                    studentName={studentName}
                />
            );
        case "VIDEO_PITCH":
            return <VideoPitchActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "AI_INTERVIEW":
            return <AiInterviewActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "DB_MODELING":
            return <DbModelingActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "AUDIO_DEFENSE":
            return <AudioDefenseActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        case "CODE_PROJECT":
            return <CodeProjectActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        default:
            return <div>Tipo de actividad no soportado</div>;
    }
}

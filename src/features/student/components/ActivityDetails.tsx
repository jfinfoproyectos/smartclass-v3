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
const WorkshopActivityDetails = dynamic(() => import('./WorkshopActivityDetails').then(m => m.WorkshopActivityDetails), { ssr: false });
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

export function GroupActivityBanner({ activity, compact = false }: { activity: any; compact?: boolean }) {
    if (!activity.isGroupActivity) return null;

    const group = activity.studentGroup;
    const isLeader = Boolean(activity.isLeader);
    const hasSubmission = Boolean(activity.submissions && activity.submissions.length > 0 && activity.submissions[0]?.url);
    const leaderName = group?.leader ? formatName(group.leader.name, group.leader.profile) : "Líder por designar";

    if (!group) {
        return (
            <div className={`${compact ? "p-1.5 px-2.5 rounded-lg text-[11px]" : "mb-2.5 p-3 rounded-2xl text-xs"} border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-2`}>
                <div className="flex items-center gap-1.5 truncate">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-bold truncate">Actividad Grupal — Sin Grupo Asignado</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">Contacta a tu docente</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="p-1.5 px-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs flex items-center justify-between gap-2 shadow-2xs shrink-0">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                    {isLeader ? (
                        <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500" />
                    ) : (
                        <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span className="font-bold text-foreground truncate text-[11px]">
                        {group.name}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 shrink-0 font-medium ${isLeader ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>
                        {isLeader ? "👑 Líder" : "Integrante"}
                    </Badge>
                    {!isLeader && (
                        <span className="text-[10px] text-muted-foreground truncate hidden sm:inline" title={`Líder del equipo: ${leaderName}`}>
                            • Líder: <strong>{leaderName}</strong>
                        </span>
                    )}
                </div>
                {hasSubmission ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0 font-bold">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Entregado por Líder
                    </Badge>
                ) : (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">Pendiente de entrega</span>
                )}
            </div>
        );
    }

    if (isLeader) {
        return (
            <div className="shrink-0 mb-2.5 p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-center justify-between gap-3 shadow-2xs">
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
        <div className="shrink-0 mb-2.5 p-3 rounded-2xl border border-primary/20 bg-primary/5 text-xs flex items-center justify-between gap-3 shadow-2xs">
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
    const isFullHeight =
        activity.type === "GITHUB" ||
        activity.type === "CODE_CHALLENGE" ||
        activity.type === "AI_INTERVIEW" ||
        activity.type === "VIDEO_PITCH" ||
        activity.type === "AUDIO_DEFENSE" ||
        activity.type === "DB_MODELING" ||
        activity.type === "CODE_PROJECT" ||
        activity.type === "WORKSHOP_CODE" ||
        activity.type === "WORKSHOP_GITHUB";

    return (
        <div className={`flex flex-col ${isFullHeight ? "h-full min-h-0 overflow-hidden flex-1" : "min-h-full w-full"} p-0.5 sm:p-1`}>
            {activity.type !== "GITHUB" && <GroupActivityBanner activity={activity} />}
            <div className={isFullHeight ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "w-full"}>
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
        case "WORKSHOP_CODE":
        case "WORKSHOP_GITHUB":
            return <WorkshopActivityDetails activity={activity} userId={userId} studentName={studentName} />;
        default:
            return <div>Tipo de actividad no soportado</div>;
    }
}

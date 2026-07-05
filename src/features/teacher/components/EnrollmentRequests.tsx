"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, User, Clock, Filter, GraduationCap } from "lucide-react";
import { approveEnrollmentAction, rejectEnrollmentAction } from "@/features/teacher/actions/enrollmentActions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PendingEnrollment {
    id: string;
    course: {
        id: string;
        title: string;
    };
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
        profile?: {
            nombres: string | null;
            apellido: string | null;
        } | null;
    };
    createdAt: Date;
}

export function EnrollmentRequests({ requests: initialRequests }: { requests: PendingEnrollment[] }) {
    const [requests, setRequests] = useState<PendingEnrollment[]>(initialRequests);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

    useMemo(() => {
        setRequests(initialRequests);
    }, [initialRequests]);

    const uniqueCourses = useMemo(() => {
        const courses = new Map();
        requests.forEach(req => {
            if (!courses.has(req.course.id)) {
                courses.set(req.course.id, req.course.title);
            }
        });
        return Array.from(courses.entries());
    }, [requests]);

    const filteredRequests = useMemo(() => {
        if (selectedCourseId === "all") return requests;
        return requests.filter(req => req.course.id === selectedCourseId);
    }, [requests, selectedCourseId]);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        const promise = approveEnrollmentAction(id);
        toast.promise(promise, {
            loading: 'Aprobando estudiante...',
            success: () => {
                setRequests(prev => prev.filter(req => req.id !== id));
                return 'Estudiante aprobado correctamente';
            },
            error: 'Error al aprobar estudiante',
        });
        await promise.finally(() => setProcessingId(null));
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        const promise = rejectEnrollmentAction(id);
        toast.promise(promise, {
            loading: 'Rechazando solicitud...',
            success: () => {
                setRequests(prev => prev.filter(req => req.id !== id));
                return 'Solicitud rechazada';
            },
            error: 'Error al rechazar solicitud',
        });
        await promise.finally(() => setProcessingId(null));
    };

    if (requests.length === 0) {
        return (
            <Card className="border-dashed border-2 bg-muted/5">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full text-primary">
                        <Check className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xl font-semibold">¡Estás al día!</p>
                        <p className="text-muted-foreground">No hay solicitudes de inscripción pendientes.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-card">
            <CardHeader className="pb-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <GraduationCap className="h-6 w-6 text-primary" />
                            </div>
                            Gestión de Inscripciones
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            Nuevos estudiantes esperando unirse a tus cursos.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {uniqueCourses.length > 0 && (
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger className="w-[240px] h-10 border-muted-foreground/20 rounded-xl transition-all hover:bg-muted/50">
                                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Filtrar por curso" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">Todos los cursos</SelectItem>
                                    {uniqueCourses.map(([id, title]) => (
                                        <SelectItem key={id} value={id}>{title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Badge variant="secondary" className="h-10 px-4 py-0 rounded-xl bg-primary/10 text-primary border-none text-sm font-semibold">
                            {filteredRequests.length} Solicitud{filteredRequests.length !== 1 ? 'es' : ''}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid gap-4">
                    {filteredRequests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl">
                            No hay solicitudes pendientes para este filtro.
                        </div>
                    ) : (
                        filteredRequests.map((request) => (
                            <div 
                                key={request.id} 
                                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/10 hover:bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all duration-300 gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/10">
                                        <AvatarImage src={request.user.image || undefined} />
                                        <AvatarFallback className="bg-primary/5 text-primary">
                                            <User className="h-6 w-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <div className="font-bold text-lg group-hover:text-primary transition-colors">{formatName(request.user.name, request.user.profile)}</div>
                                        <div className="text-sm text-muted-foreground font-medium">{request.user.email}</div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 border-emerald-500/20 bg-emerald-500/5 text-emerald-600">
                                                {request.course.title}
                                            </Badge>
                                            <div className="text-[10px] flex items-center gap-1.5 text-muted-foreground/70 uppercase font-bold tracking-wider">
                                                <Clock className="h-3 w-3" />
                                                Solicitado há {formatDistanceToNow(new Date(request.createdAt), { locale: es })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:ml-auto">
                                    <Button
                                        variant="outline"
                                        className="flex-1 sm:flex-none border-rose-500/30 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl h-11 px-6 font-semibold transition-all active:scale-95"
                                        onClick={() => handleReject(request.id)}
                                        disabled={processingId === request.id}
                                    >
                                        <X className="h-5 w-5 mr-2" />
                                        Rechazar
                                    </Button>
                                    <Button
                                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                                        onClick={() => handleApprove(request.id)}
                                        disabled={processingId === request.id}
                                    >
                                        <Check className="h-5 w-5 mr-2" />
                                        Aprobar
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

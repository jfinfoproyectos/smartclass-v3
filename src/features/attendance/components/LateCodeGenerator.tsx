"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, RefreshCw, Trash2 } from "lucide-react";
import { generateLateCodeAction, deleteLateCodeAction } from "@/features/teacher/actions/attendanceActions";;

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface LateCodeGeneratorProps {
    courseId: string;
}

export function LateCodeGenerator({ courseId }: LateCodeGeneratorProps) {
    const [lateCode, setLateCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateCode = async () => {
        setLoading(true);
        try {
            const result = await generateLateCodeAction(courseId);
            setLateCode(result.lateCode);
            toast.success("Código generado exitosamente");
        } catch (error) {
            toast.error("Error al generar código");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCode = async () => {
        setLoading(true);
        try {
            await deleteLateCodeAction(courseId);
            setLateCode(null);
            toast.success("Código eliminado exitosamente");
        } catch (error) {
            toast.error("Error al eliminar código");
        } finally {
            setLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                {lateCode ? (
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-md border border-yellow-200 dark:border-yellow-800">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Código Activo
                            </span>
                            <span className="text-xl font-mono font-bold tracking-widest">{lateCode}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={handleGenerateCode}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Regenerar código</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                        onClick={handleDeleteCode}
                                        disabled={loading}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Eliminar código</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                onClick={handleGenerateCode}
                                disabled={loading}
                                className="gap-2"
                            >
                                <Clock className="h-4 w-4" />
                                Generar Código Tarde
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Generar un código permanente para llegadas tarde</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

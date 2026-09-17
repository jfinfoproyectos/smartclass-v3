"use client";

import React, { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    GitCommit, 
    GitPullRequest, 
    UploadCloud, 
    CheckCircle2, 
    ExternalLink, 
    Loader2, 
    AlertCircle, 
    KeyRound, 
    ShieldCheck, 
    FolderGit2,
    FileText,
    Check,
    Copy,
    Laptop
} from "lucide-react";
import { toast } from "sonner";
import { pushDocsToRepoAction } from "../../actions/gitDocsActions";

export interface PushFileItem {
    path: string;
    content: string;
    description?: string;
}

interface PushToGitHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    repoUrl: string;
    defaultBranch: string;
    availableBranches: string[];
    files: PushFileItem[];
    localAccount?: {
        hasLocalAccount: boolean;
        name: string | null;
        email: string | null;
        label: string;
    };
    hasConfiguredToken?: boolean;
    onSuccess?: (result: any) => void;
}

export function PushToGitHubModal({
    isOpen,
    onClose,
    repoUrl,
    defaultBranch,
    availableBranches,
    files,
    localAccount,
    hasConfiguredToken,
    onSuccess
}: PushToGitHubModalProps) {
    // Selection of files to commit
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => {
        return new Set(files.filter(f => f.content && f.content.trim().length > 0).map(f => f.path));
    });

    // Form states
    const [targetBranch, setTargetBranch] = useState<string>(defaultBranch || "main");
    const [mode, setMode] = useState<"direct" | "pull_request">("direct");
    const [commitMessage, setCommitMessage] = useState<string>("docs: actualizar README y suite de gobernanza con SmartClass IA");
    const [newBranchName, setNewBranchName] = useState<string>("docs/smartclass-documentation");
    const [prTitle, setPrTitle] = useState<string>("docs: actualizar suite de documentación y arquitectura");
    const [customPat, setCustomPat] = useState<string>("");

    // Execution states
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [result, setResult] = useState<{
        commitUrl?: string;
        prUrl?: string;
        branch: string;
        mode: "direct" | "pull_request";
        message: string;
    } | null>(null);

    const toggleFile = (path: string) => {
        setSelectedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        setSelectedPaths(new Set(files.map(f => f.path)));
    };

    const handleDeselectAll = () => {
        setSelectedPaths(new Set());
    };

    const handlePush = async () => {
        if (selectedPaths.size === 0) {
            toast.error("Selecciona al menos un archivo para subir.");
            return;
        }

        const filesToUpload = files.filter(f => selectedPaths.has(f.path));
        if (filesToUpload.length === 0) {
            toast.error("Los archivos seleccionados no contienen datos válidos.");
            return;
        }

        if (!localAccount?.hasLocalAccount && !customPat.trim()) {
            toast.error("No se detectó cuenta de Git en tu computadora ni se suministró un Personal Access Token.");
            return;
        }

        try {
            setIsSubmitting(true);
            setResult(null);

            const res = await pushDocsToRepoAction({
                repoUrl,
                targetBranch: targetBranch.trim() || "main",
                files: filesToUpload.map(f => ({ path: f.path, content: f.content })),
                commitMessage: commitMessage.trim(),
                mode,
                newBranchName: mode === "pull_request" ? newBranchName.trim() : undefined,
                prTitle: mode === "pull_request" ? prTitle.trim() : undefined,
                customToken: customPat.trim() || undefined
            });

            setResult({
                commitUrl: res.commitUrl,
                prUrl: res.prUrl,
                branch: res.branch,
                mode: res.mode,
                message: res.message
            });

            toast.success(res.message);
            if (onSuccess) {
                onSuccess(res);
            }
        } catch (error: any) {
            console.error("Error al subir a GitHub:", error);
            toast.error(error.message || "Error al subir cambios a GitHub.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Subir Documentación a GitHub</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Confirma y envía los archivos generados directamente a tu repositorio sin salir de SmartClass.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Vista de Éxito */}
                {result ? (
                    <div className="space-y-4 py-4">
                        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-3">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <h3 className="text-base font-bold text-foreground">
                                {result.mode === "pull_request" ? "¡Pull Request Creado con Éxito!" : "¡Cambios Confirmados en el Repositorio!"}
                            </h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                                {result.message}
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                {result.prUrl && (
                                    <a
                                        href={result.prUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-xs"
                                    >
                                        <GitPullRequest className="w-4 h-4" />
                                        Ver Pull Request en GitHub
                                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                                    </a>
                                )}
                                {result.commitUrl && (
                                    <a
                                        href={result.commitUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
                                    >
                                        <GitCommit className="w-4 h-4" />
                                        Ver Commit en GitHub
                                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="flex sm:justify-between items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs cursor-pointer">
                                Subir Más Cambios
                            </Button>
                            <Button size="sm" onClick={onClose} className="text-xs font-semibold cursor-pointer">
                                Cerrar
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    /* Formulario de Configuración de Commit / PR */
                    <div className="space-y-4 py-2 text-xs">
                        {/* 1. Selección de Archivos */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Archivos a Subir ({selectedPaths.size} de {files.length} seleccionados)
                                </Label>
                                <div className="flex items-center gap-2 text-[11px]">
                                    <button 
                                        type="button" 
                                        onClick={handleSelectAll} 
                                        className="text-primary hover:underline cursor-pointer"
                                    >
                                        Todos
                                    </button>
                                    <span className="text-muted-foreground">•</span>
                                    <button 
                                        type="button" 
                                        onClick={handleDeselectAll} 
                                        className="text-muted-foreground hover:underline cursor-pointer"
                                    >
                                        Ninguno
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-border/70 rounded-xl bg-muted/20">
                                {files.map((file) => {
                                    const isSelected = selectedPaths.has(file.path);
                                    const hasContent = file.content && file.content.trim().length > 0;

                                    return (
                                        <label
                                            key={file.path}
                                            className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                                isSelected 
                                                    ? "border-primary/50 bg-primary/5 text-foreground" 
                                                    : "border-border/40 bg-card text-muted-foreground hover:bg-muted/40"
                                            } ${!hasContent ? "opacity-40 pointer-events-none" : ""}`}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleFile(file.path)}
                                                disabled={!hasContent}
                                                className="rounded border-border"
                                            />
                                            <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-mono text-[11px] font-semibold truncate">{file.path}</p>
                                                <p className="text-[10px] text-muted-foreground">{file.content.length} caracteres</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Modo de Subida */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Estrategia de Entrega
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMode("direct")}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        mode === "direct"
                                            ? "border-blue-500 bg-blue-500/10 text-foreground shadow-xs"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <GitCommit className="w-4 h-4 text-blue-500" />
                                        <span className="font-bold text-xs text-foreground">Commit Directo</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Confirma y empuja los archivos directamente en la rama base (rápido para ramas de trabajo personal).
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("pull_request")}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        mode === "pull_request"
                                            ? "border-purple-500 bg-purple-500/10 text-foreground shadow-xs"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <GitPullRequest className="w-4 h-4 text-purple-500" />
                                        <span className="font-bold text-xs text-foreground">Crear Rama + Pull Request</span>
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">Recomendado</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Crea una rama separada y abre un Pull Request hacia la rama base para revisión colaborativa.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 3. Parámetros de la Rama y Mensaje */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Rama Base de Destino</Label>
                                <Input 
                                    value={targetBranch}
                                    onChange={(e) => setTargetBranch(e.target.value)}
                                    placeholder="ej: main"
                                    className="h-8 text-xs font-mono"
                                />
                            </div>

                            {mode === "pull_request" && (
                                <div>
                                    <Label className="text-[11px] text-muted-foreground mb-1 block">Nombre de la Nueva Rama</Label>
                                    <Input 
                                        value={newBranchName}
                                        onChange={(e) => setNewBranchName(e.target.value)}
                                        placeholder="docs/smartclass-documentation"
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-[11px] text-muted-foreground mb-1 block">Mensaje del Commit</Label>
                            <Input 
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                placeholder="docs: agregar README y archivos de gobernanza"
                                className="h-8 text-xs"
                            />
                        </div>

                        {mode === "pull_request" && (
                            <div>
                                <Label className="text-[11px] text-muted-foreground mb-1 block">Título del Pull Request</Label>
                                <Input 
                                    value={prTitle}
                                    onChange={(e) => setPrTitle(e.target.value)}
                                    placeholder="docs: actualizar documentación del repositorio"
                                    className="h-8 text-xs"
                                />
                            </div>
                        )}

                        {/* 4. Cuenta Activa de la Computadora */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Laptop className="w-4 h-4 text-emerald-500" />
                                    Cuenta Activa en tu Computadora
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                    Git Local Conectado
                                </Badge>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Se confirmarán los cambios usando la cuenta activa de tu equipo: <strong className="text-foreground">{localAccount?.label || "Cuenta Git del Sistema"}</strong>. No se requiere token de la aplicación.
                            </p>

                            <div className="pt-2 border-t border-border/50">
                                <details className="text-[11px]">
                                    <summary className="text-primary hover:underline cursor-pointer font-medium">
                                        ¿Deseas usar un Personal Access Token (PAT) alternativo? (Opcional)
                                    </summary>
                                    <div className="mt-2 space-y-1">
                                        <Input 
                                            type="password"
                                            placeholder="ghp_xxxxxxxxxxxx (Opcional: solo si deseas sobreescribir la cuenta de tu PC)"
                                            value={customPat}
                                            onChange={(e) => setCustomPat(e.target.value)}
                                            className="h-8 text-xs font-mono bg-background"
                                        />
                                    </div>
                                </details>
                            </div>
                        </div>

                        {/* Footer de Acciones */}
                        <DialogFooter className="pt-2 flex sm:justify-between items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                disabled={isSubmitting}
                                className="text-xs cursor-pointer"
                            >
                                Cancelar
                            </Button>

                            <Button 
                                size="sm" 
                                onClick={handlePush}
                                disabled={isSubmitting || selectedPaths.size === 0}
                                className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Confirmando y subiendo...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>
                                            {mode === "direct" ? `Subir a '${targetBranch}'` : "Crear Rama y Abrir PR"}
                                        </span>
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

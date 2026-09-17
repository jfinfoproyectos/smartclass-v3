"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    GitCommitFileChange, 
    GitReportCommit 
} from "../../services/gitReportService";
import { 
    getCommitFullDiffAction, 
    explainDiffWithAiAction, 
    GitDiffAiExplanation 
} from "../../actions/gitReportActions";
import { 
    Code2, 
    FileCode, 
    ExternalLink, 
    Copy, 
    Check, 
    Sparkles, 
    Loader2, 
    Search, 
    GitBranch, 
    Clock, 
    User, 
    CheckCircle2, 
    AlertTriangle, 
    Lightbulb, 
    FilePlus2, 
    FileMinus2, 
    FileEdit
} from "lucide-react";

interface LiveCodeInspectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    commit: GitReportCommit | null;
    initialFilename?: string | null;
    repoFullName: string;
    repoUrl: string;
    customToken?: string;
}

interface ParsedDiffLine {
    type: "header" | "add" | "delete" | "context";
    content: string;
    oldLine?: number;
    newLine?: number;
}

/**
 * Parsea el texto del patch de Git en líneas estructuradas con números de línea
 */
function parseGitPatch(patch?: string): ParsedDiffLine[] {
    if (!patch) return [];

    const lines = patch.split("\n");
    const result: ParsedDiffLine[] = [];

    let currentOld = 1;
    let currentNew = 1;

    for (const rawLine of lines) {
        if (rawLine.startsWith("@@")) {
            // Formato de cabecera: @@ -oldStart,oldCount +newStart,newCount @@
            const match = rawLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                currentOld = parseInt(match[1], 10);
                currentNew = parseInt(match[2], 10);
            }
            result.push({
                type: "header",
                content: rawLine
            });
        } else if (rawLine.startsWith("+")) {
            result.push({
                type: "add",
                content: rawLine.substring(1),
                newLine: currentNew++
            });
        } else if (rawLine.startsWith("-")) {
            result.push({
                type: "delete",
                content: rawLine.substring(1),
                oldLine: currentOld++
            });
        } else if (rawLine.startsWith("\\")) {
            result.push({
                type: "context",
                content: rawLine
            });
        } else {
            // Línea de contexto (empieza con espacio o está vacía)
            const text = rawLine.startsWith(" ") ? rawLine.substring(1) : rawLine;
            result.push({
                type: "context",
                content: text,
                oldLine: currentOld++,
                newLine: currentNew++
            });
        }
    }

    return result;
}

export function LiveCodeInspectorModal({
    isOpen,
    onClose,
    commit,
    initialFilename,
    repoFullName,
    repoUrl,
    customToken
}: LiveCodeInspectorModalProps) {
    const [files, setFiles] = useState<GitCommitFileChange[]>([]);
    const [activeFilename, setActiveFilename] = useState<string | null>(null);
    const [fileSearch, setFileSearch] = useState("");
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<GitDiffAiExplanation | null>(null);
    const [copiedSha, setCopiedSha] = useState(false);
    const [copiedDiff, setCopiedDiff] = useState(false);

    // Cargar o actualizar archivos y patches completos al abrir o cambiar de commit
    useEffect(() => {
        if (!isOpen || !commit) {
            setFiles([]);
            setActiveFilename(null);
            setAiExplanation(null);
            return;
        }

        // Si el commit ya trae archivos, cargarlos inicialmente
        const existingFiles = commit.files || [];
        setFiles(existingFiles);

        const targetFile = initialFilename 
            ? existingFiles.find(f => f.filename === initialFilename)?.filename 
            : existingFiles[0]?.filename;
        setActiveFilename(targetFile || existingFiles[0]?.filename || null);
        setAiExplanation(null);

        // Si los archivos no tienen patch o tienen un patch truncado (800 chars), consultar el diff íntegro
        const needsFullFetch = existingFiles.length === 0 || existingFiles.some(f => !f.patch || f.patch.length >= 790);

        if (needsFullFetch) {
            setIsLoadingDiff(true);
            getCommitFullDiffAction({
                repoUrl,
                sha: commit.sha,
                customToken
            }).then(detail => {
                if (detail && detail.files && detail.files.length > 0) {
                    setFiles(detail.files);
                    if (!activeFilename || !detail.files.some(f => f.filename === activeFilename)) {
                        const nextTarget = initialFilename 
                            ? detail.files.find(f => f.filename === initialFilename)?.filename 
                            : detail.files[0].filename;
                        setActiveFilename(nextTarget || detail.files[0].filename);
                    }
                }
            }).catch(err => {
                console.error("Error al obtener el diff completo del commit:", err);
            }).finally(() => {
                setIsLoadingDiff(false);
            });
        }
    }, [isOpen, commit?.sha, initialFilename]);

    // Limpiar explicación IA al cambiar de archivo
    const handleSelectFile = (filename: string) => {
        setActiveFilename(filename);
        setAiExplanation(null);
    };

    // Archivo activo actual
    const activeFile = useMemo(() => {
        return files.find(f => f.filename === activeFilename) || files[0] || null;
    }, [files, activeFilename]);

    // Parsear el diff del archivo activo
    const parsedLines = useMemo(() => {
        return parseGitPatch(activeFile?.patch);
    }, [activeFile?.patch]);

    // Archivos filtrados por la barra de búsqueda interna
    const filteredFiles = useMemo(() => {
        if (!fileSearch.trim()) return files;
        const q = fileSearch.toLowerCase();
        return files.filter(f => f.filename.toLowerCase().includes(q));
    }, [files, fileSearch]);

    // Copiar SHA del commit
    const handleCopySha = () => {
        if (!commit) return;
        navigator.clipboard.writeText(commit.sha);
        setCopiedSha(true);
        setTimeout(() => setCopiedSha(false), 2000);
    };

    // Copiar el contenido del diff actual
    const handleCopyDiff = () => {
        if (!activeFile?.patch) return;
        navigator.clipboard.writeText(activeFile.patch);
        setCopiedDiff(true);
        setTimeout(() => setCopiedDiff(false), 2000);
    };

    // Solicitar explicación pedagógica con IA del diff del archivo activo
    const handleExplainWithAi = async () => {
        if (!commit || !activeFile || !activeFile.patch) return;

        setIsExplaining(true);
        try {
            const explanation = await explainDiffWithAiAction({
                repoFullName,
                commitTitle: commit.title,
                authorName: commit.authorName,
                filename: activeFile.filename,
                patch: activeFile.patch
            });
            setAiExplanation(explanation);
        } catch (err) {
            console.error("Error al explicar diff con IA:", err);
        } finally {
            setIsExplaining(false);
        }
    };

    if (!commit) return null;

    const totalAdditions = commit.stats?.additions ?? files.reduce((acc, f) => acc + f.additions, 0);
    const totalDeletions = commit.stats?.deletions ?? files.reduce((acc, f) => acc + f.deletions, 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                showCloseButton={true}
                className="sm:max-w-7xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border bg-card shadow-2xl"
            >
                {/* 1. CABECERA DEL INSPECTOR */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30 shrink-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                                <Code2 className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <DialogTitle className="text-sm sm:text-base font-black text-foreground tracking-tight">
                                        Inspección de Código en Vivo
                                    </DialogTitle>
                                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
                                        {repoFullName}
                                    </Badge>
                                </div>
                                <DialogDescription className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    Exploración interactiva del diff exacto y cambios implementados por commit
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Metadatos y acciones rápidas */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={handleCopySha}
                                className="font-mono text-xs px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-primary font-bold flex items-center gap-1.5 border border-border/60 transition-colors cursor-pointer"
                                title="Copiar Hash SHA completo"
                            >
                                {copiedSha ? (
                                    <>
                                        <Check className="h-3 w-3 text-emerald-500" />
                                        <span>Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-muted-foreground font-normal">SHA:</span>
                                        <span>{commit.shortSha}</span>
                                        <Copy className="h-2.5 w-2.5 text-muted-foreground ml-0.5" />
                                    </>
                                )}
                            </button>

                            <a
                                href={commit.commitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-foreground font-semibold border border-border/80 transition-colors"
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span>Ver en GitHub</span>
                            </a>
                        </div>
                    </div>

                    {/* Fila de detalles del Commit */}
                    <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        <div className="space-y-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {commit.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-medium text-foreground/90">
                                    {commit.authorAvatar ? (
                                        <img src={commit.authorAvatar} alt={commit.authorName} className="w-4 h-4 rounded-full ring-1 ring-border" />
                                    ) : (
                                        <User className="h-3.5 w-3.5 text-primary" />
                                    )}
                                    {commit.authorName}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {commit.regionalDate} a las {commit.regionalTime}
                                </span>
                                {commit.branches && commit.branches.length > 0 && (
                                    <span className="flex items-center gap-1 font-mono text-[10px]">
                                        <GitBranch className="h-3 w-3 text-blue-500" />
                                        {commit.branches.join(", ")}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Balance de líneas modificadas */}
                        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                +{totalAdditions}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
                                -{totalDeletions}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                                en {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {/* 2. CUERPO PRINCIPAL: SIDEBAR DE ARCHIVOS + CANVAS DE DIFF */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                    {/* SIDEBAR IZQUIERDO: LISTA DE ARCHIVOS */}
                    <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border/80 flex flex-col bg-muted/20 shrink-0">
                        <div className="p-2.5 border-b border-border/60">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={fileSearch}
                                    onChange={(e) => setFileSearch(e.target.value)}
                                    placeholder="Buscar archivo modificado..."
                                    className="pl-8 text-xs bg-background h-8"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1.5 space-y-0.5">
                            {filteredFiles.length === 0 ? (
                                <div className="p-6 text-center text-xs text-muted-foreground">
                                    No se encontraron archivos coincidentes.
                                </div>
                            ) : (
                                filteredFiles.map((file) => {
                                    const isSelected = file.filename === activeFile?.filename;
                                    const isAdded = file.status === "added";
                                    const isRemoved = file.status === "removed";

                                    return (
                                        <button
                                            key={file.filename}
                                            type="button"
                                            onClick={() => handleSelectFile(file.filename)}
                                            className={`w-full text-left p-2 rounded-lg transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-primary/10 text-primary font-bold shadow-xs border border-primary/30' 
                                                    : 'hover:bg-muted/60 text-foreground/80'
                                            }`}
                                        >
                                            <div className="min-w-0 flex items-start gap-1.5">
                                                <span className="mt-0.5 shrink-0">
                                                    {isAdded ? (
                                                        <FilePlus2 className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : isRemoved ? (
                                                        <FileMinus2 className="h-3.5 w-3.5 text-rose-500" />
                                                    ) : (
                                                        <FileEdit className="h-3.5 w-3.5 text-blue-500" />
                                                    )}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs truncate font-mono" title={file.filename}>
                                                        {file.filename.split('/').pop()}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate font-mono opacity-80" title={file.filename}>
                                                        {file.filename}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 font-mono text-[10px] flex items-center gap-1">
                                                <span className="text-emerald-500 font-semibold">+{file.additions}</span>
                                                <span className="text-muted-foreground">/</span>
                                                <span className="text-rose-500 font-semibold">-{file.deletions}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CANVAS DERECHO: VISOR DE DIFF + ASISTENTE IA */}
                    <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
                        {/* Barra de herramientas del archivo activo */}
                        <div className="p-3 border-b border-border/80 bg-muted/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileCode className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-xs font-mono font-bold text-foreground truncate" title={activeFile?.filename}>
                                    {activeFile?.filename || "Sin archivo seleccionado"}
                                </span>
                                {activeFile && (
                                    <Badge 
                                        variant="outline" 
                                        className={`text-[9px] font-mono uppercase font-bold ${
                                            activeFile.status === "added" ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                                            activeFile.status === "removed" ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                                            'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                        }`}
                                    >
                                        {activeFile.status}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyDiff}
                                    disabled={!activeFile?.patch}
                                    className="h-7 text-xs gap-1 cursor-pointer"
                                    title="Copiar diff completo"
                                >
                                    {copiedDiff ? (
                                        <>
                                            <Check className="h-3 w-3 text-emerald-500" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            Copiar Diff
                                        </>
                                    )}
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={handleExplainWithAi}
                                    disabled={isExplaining || !activeFile?.patch}
                                    className="h-7 text-xs gap-1.5 bg-gradient-to-r from-primary to-teal-500 text-primary-foreground font-bold shadow-xs cursor-pointer hover:opacity-90"
                                >
                                    {isExplaining ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Analizando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3 w-3" />
                                            Explicar con IA
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Panel de Explicación IA si fue solicitada */}
                        {aiExplanation && (
                            <div className="p-3.5 bg-gradient-to-r from-primary/5 via-teal-500/5 to-transparent border-b border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span>Explicación Docente del Cambio (IA)</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAiExplanation(null)}
                                            className="h-5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            Ocultar
                                        </Button>
                                    </div>

                                    <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                                        {aiExplanation.summary}
                                    </p>

                                    {/* Desglose de cambios */}
                                    {aiExplanation.changesBreakdown && aiExplanation.changesBreakdown.length > 0 && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Modificaciones específicas:
                                            </span>
                                            <ul className="list-disc list-inside text-xs text-foreground/85 space-y-0.5 pl-1">
                                                {aiExplanation.changesBreakdown.map((item, idx) => (
                                                    <li key={idx}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Aspectos positivos y observaciones pedagógicas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {aiExplanation.pedagogicalAssessment.strengths?.length > 0 && (
                                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                                                    <CheckCircle2 className="h-3 w-3" /> Puntos Fuertes:
                                                </span>
                                                <ul className="text-muted-foreground text-[11px] space-y-0.5">
                                                    {aiExplanation.pedagogicalAssessment.strengths.map((s, idx) => (
                                                        <li key={idx}>• {s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {aiExplanation.pedagogicalAssessment.observations?.length > 0 && (
                                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                                                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                                                    <AlertTriangle className="h-3 w-3" /> Observaciones / Riesgos:
                                                </span>
                                                <ul className="text-muted-foreground text-[11px] space-y-0.5">
                                                    {aiExplanation.pedagogicalAssessment.observations.map((o, idx) => (
                                                        <li key={idx}>• {o}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {aiExplanation.pedagogicalAssessment.suggestedFeedback && (
                                        <div className="p-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground flex items-start gap-2">
                                            <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-[11px] text-foreground">Retroalimentación Sugerida:</strong>{" "}
                                                <span className="text-muted-foreground">{aiExplanation.pedagogicalAssessment.suggestedFeedback}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Visor de líneas de Diff */}
                        <div className="flex-1 overflow-auto font-mono text-xs bg-[#0d1117] text-slate-100 dark:bg-card">
                            {isLoadingDiff ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <p className="text-xs text-muted-foreground">
                                        Cargando diff de alta resolución desde GitHub...
                                    </p>
                                </div>
                            ) : !activeFile ? (
                                <div className="h-full flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
                                    Selecciona un archivo del panel izquierdo para inspeccionar su código.
                                </div>
                            ) : !activeFile.patch ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                                    <FileCode className="h-10 w-10 text-muted-foreground opacity-50" />
                                    <div className="space-y-1 max-w-md">
                                        <p className="text-sm font-bold text-foreground">
                                            Sin diff de texto disponible
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Este archivo puede ser binario (imagen, video, paquete compilado) o el cambio superó el límite de diff de GitHub.
                                        </p>
                                    </div>
                                    <a
                                        href={activeFile.blobUrl || commit.commitUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Inspeccionar archivo en GitHub
                                    </a>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/20 py-2">
                                    {parsedLines.map((line, idx) => {
                                        if (line.type === "header") {
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="py-1 px-3 bg-blue-500/15 text-blue-400 font-mono text-[11px] font-semibold border-y border-blue-500/20 select-none"
                                                >
                                                    {line.content}
                                                </div>
                                            );
                                        }

                                        const isAdd = line.type === "add";
                                        const isDelete = line.type === "delete";

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-stretch font-mono text-xs leading-5 hover:bg-white/5 transition-colors ${
                                                    isAdd ? 'bg-emerald-500/15 text-emerald-300' :
                                                    isDelete ? 'bg-rose-500/15 text-rose-300' :
                                                    'text-slate-300'
                                                }`}
                                            >
                                                {/* Columna de línea anterior */}
                                                <span className="w-12 py-0.5 px-1 text-right text-[10px] text-muted-foreground/60 select-none bg-black/20 border-r border-border/20">
                                                    {line.oldLine ?? ""}
                                                </span>

                                                {/* Columna de línea nueva */}
                                                <span className="w-12 py-0.5 px-1 text-right text-[10px] text-muted-foreground/60 select-none bg-black/20 border-r border-border/20">
                                                    {line.newLine ?? ""}
                                                </span>

                                                {/* Signo del cambio (+ / - / espacio) */}
                                                <span className={`w-6 py-0.5 text-center font-bold select-none ${
                                                    isAdd ? 'text-emerald-400 font-bold' :
                                                    isDelete ? 'text-rose-400 font-bold' :
                                                    'text-transparent'
                                                }`}>
                                                    {isAdd ? "+" : isDelete ? "-" : " "}
                                                </span>

                                                {/* Código */}
                                                <div className="flex-1 py-0.5 px-2 whitespace-pre-wrap break-all">
                                                    {line.content || " "}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

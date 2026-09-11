"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Link as LinkIcon,
    Code,
    ExternalLink,
    FileCode,
    Calendar,
    Clock,
    BookOpen,
    Eye,
    Search,
    Download,
    Copy,
    Check,
    FolderArchive,
    Sparkles,
    FileText,
    ChevronRight,
    X
} from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TabEmptyState } from "@/components/ui/tab-empty-state";

interface SharedContentProps {
    contents: any[];
    hideHeader?: boolean;
}

export function SharedContentList({ contents, hideHeader = false }: SharedContentProps) {
    const { resolvedTheme } = useTheme();
    const [selectedContent, setSelectedContent] = useState<any | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    const filteredContents = useMemo(() => {
        if (!searchQuery.trim()) return contents;
        const q = searchQuery.toLowerCase();
        return contents.filter((c) => {
            const matchTitle = (c.title || "").toLowerCase().includes(q);
            const matchDesc = (c.description || "").toLowerCase().includes(q);
            const matchFile = (c.files as any[] || []).some((f) => (f.name || "").toLowerCase().includes(q));
            const matchLink = (c.links as any[] || []).some((l) => (l.label || "").toLowerCase().includes(q) || (l.url || "").toLowerCase().includes(q));
            return matchTitle || matchDesc || matchFile || matchLink;
        });
    }, [contents, searchQuery]);

    if (contents.length === 0) {
        return (
            <TabEmptyState
                icon={BookOpen}
                title="No hay contenido compartido"
                description="Tu profesor todavía no ha compartido recursos, archivos o código en este curso."
            />
        );
    }

    const handleView = (content: any) => {
        setSelectedContent(content);
        setIsViewOpen(true);
    };

    const handleDownloadAllZip = async (content: any) => {
        const files = (content.files as any[]) || [];
        if (files.length === 0) {
            toast.error("Este recurso no contiene archivos para descargar");
            return;
        }

        setIsDownloadingZip(true);
        const toastId = toast.loading("Generando archivo ZIP...");

        try {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();

            files.forEach((file: any, idx: number) => {
                const fileName = file.relativePath || file.name || `archivo_${idx + 1}.txt`;
                zip.file(fileName, file.content || "");
            });

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeTitle = (content.title || "recursos").replace(/[^a-zA-Z0-9_-]/g, "_");
            a.download = `${safeTitle}_archivos.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Descarga iniciada exitosamente", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el archivo comprimido", { id: toastId });
        } finally {
            setIsDownloadingZip(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="flex items-center gap-2.5">
                    {!hideHeader && (
                        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Recursos Compartidos
                        </h3>
                    )}
                    <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                        {contents.length} {contents.length === 1 ? 'recurso' : 'recursos'}
                    </Badge>
                </div>

                {contents.length > 2 && (
                    <div className="relative w-full sm:w-64 md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en recursos o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-8 text-xs bg-muted/20"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile View: Clean, touch-friendly Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredContents.map((content) => {
                    const linksCount = (content.links as any[] || []).length;
                    const filesCount = (content.files as any[] || []).length;

                    return (
                        <Card 
                            key={content.id}
                            onClick={() => handleView(content)}
                            className="cursor-pointer border border-border/60 hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.99] overflow-hidden"
                        >
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                        <h4 className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="truncate">{content.title}</span>
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            {format(new Date(content.createdAt), "PPP", { locale: es })}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                                </div>

                                {content.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/20 p-2 rounded-md">
                                        {content.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                                    <div className="flex items-center gap-2">
                                        {linksCount > 0 && (
                                            <Badge variant="outline" className="gap-1 text-[10px] py-0 px-2 bg-background font-medium">
                                                <LinkIcon className="h-2.5 w-2.5 text-primary" />
                                                {linksCount} enlace{linksCount !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                        {filesCount > 0 && (
                                            <Badge variant="outline" className="gap-1 text-[10px] py-0 px-2 bg-background font-medium">
                                                <Code className="h-2.5 w-2.5 text-primary" />
                                                {filesCount} archivo{filesCount !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
                                        Ver material <ChevronRight className="h-3 w-3" />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Desktop View: Polished Table */}
            <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden shadow-xs bg-background">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                            <TableHead className="font-bold uppercase tracking-wider text-[11px] pl-5">Título</TableHead>
                            <TableHead className="font-bold uppercase tracking-wider text-[11px]">Fecha de Envío</TableHead>
                            <TableHead className="font-bold uppercase tracking-wider text-[11px]">Recursos Incluidos</TableHead>
                            <TableHead className="text-right font-bold uppercase tracking-wider text-[11px] pr-5 w-[120px]">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContents.map((content) => {
                            const linksCount = (content.links as any[] || []).length;
                            const filesCount = (content.files as any[] || []).length;

                            return (
                                <TableRow 
                                    key={content.id} 
                                    className="group hover:bg-muted/20 transition-colors border-b border-border/30 cursor-pointer"
                                    onClick={() => handleView(content)}
                                >
                                    <TableCell className="font-semibold text-sm py-4 pl-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                <FileCode className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate text-foreground group-hover:text-primary transition-colors">{content.title}</span>
                                                {content.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                                                        {content.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="font-medium text-foreground">{format(new Date(content.createdAt), "PPP", { locale: es })}</span>
                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(content.createdAt), "p", { locale: es })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {linksCount > 0 && (
                                                <Badge variant="outline" className="gap-1.5 bg-background text-xs font-medium border-border/70">
                                                    <LinkIcon className="h-3 w-3 text-primary" />
                                                    {linksCount} {linksCount === 1 ? 'enlace' : 'enlaces'}
                                                </Badge>
                                            )}
                                            {filesCount > 0 && (
                                                <Badge variant="outline" className="gap-1.5 bg-background text-xs font-medium border-border/70">
                                                    <Code className="h-3 w-3 text-primary" />
                                                    {filesCount} {filesCount === 1 ? 'archivo' : 'archivos'}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                                            onClick={() => handleView(content)}
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>Explorar</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {filteredContents.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No se encontraron resultados</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Ningún contenido coincide con &ldquo;{searchQuery}&rdquo;.
                    </p>
                </div>
            )}

            {/* Student Resource Viewer Modal (Balanced Dialog for desktop, full-card for mobile) */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-[92vw] lg:max-w-5xl xl:max-w-[1080px] w-full h-[84vh] max-h-[86vh] p-0 flex flex-col gap-0 overflow-hidden shadow-2xl border border-border/80 rounded-xl sm:rounded-2xl bg-background">
                    {selectedContent && (
                        <>
                            {/* Modal Header */}
                            <DialogHeader className="px-4 sm:px-6 py-3.5 border-b shrink-0 bg-background/95 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-0.5 min-w-0 pr-6">
                                    <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 truncate">
                                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                                        <span className="truncate">{selectedContent.title}</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                                        <span className="flex items-center gap-1 font-medium">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(selectedContent.createdAt), "PPP", { locale: es })}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(selectedContent.createdAt), "p", { locale: es })}
                                        </span>
                                    </DialogDescription>
                                </div>

                                {/* Header Quick Actions */}
                                {(selectedContent.files as any[] || []).length > 0 && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isDownloadingZip}
                                            onClick={() => handleDownloadAllZip(selectedContent)}
                                            className="h-8 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary shadow-xs"
                                        >
                                            <FolderArchive className="h-3.5 w-3.5 text-primary" />
                                            <span className="hidden sm:inline">Descargar Todo (.ZIP)</span>
                                            <span className="sm:hidden">Descargar .ZIP</span>
                                        </Button>
                                    </div>
                                )}
                            </DialogHeader>

                            {/* Modal Body Workspace */}
                            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                                {/* Left Panel: Description & Links (Sidebar) */}
                                {((selectedContent.description) || (selectedContent.links as any[] || []).length > 0) && (
                                    <div className="w-full lg:w-[310px] max-h-[35vh] lg:max-h-none shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/15 p-4 sm:p-5 overflow-y-auto space-y-5 flex flex-col">
                                        {/* Description */}
                                        {selectedContent.description && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Instrucciones y Contexto
                                                </h4>
                                                <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-background/80 p-3.5 rounded-lg border border-border/70 shadow-2xs">
                                                    {selectedContent.description}
                                                </div>
                                            </div>
                                        )}

                                        {/* External Links */}
                                        {(selectedContent.links as any[] || []).length > 0 && (
                                            <div className="space-y-2.5">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <LinkIcon className="h-3.5 w-3.5" />
                                                    Enlaces de Referencia ({(selectedContent.links as any[]).length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {(selectedContent.links as any[]).map((link, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/90 hover:border-primary/40 hover:shadow-2xs transition-all gap-2"
                                                        >
                                                            <div className="flex flex-col min-w-0 pr-2">
                                                                <span className="font-semibold text-xs text-foreground truncate">
                                                                    {link.label || `Enlace ${idx + 1}`}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground font-mono truncate">
                                                                    {link.url}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                    title="Copiar enlace"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(link.url);
                                                                        toast.success("Enlace copiado al portapapeles");
                                                                    }}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <a
                                                                    href={link.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                                                    title="Abrir en nueva pestaña"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Right Panel: Interactive Code Workspace */}
                                <div className="flex-1 min-w-0 flex flex-col h-full bg-background overflow-hidden">
                                    {(selectedContent.files as any[] || []).length > 0 ? (
                                        <StudentCodeViewer
                                            files={selectedContent.files as any[]}
                                            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                                                <LinkIcon className="h-6 w-6" />
                                            </div>
                                            <h4 className="text-sm font-semibold mb-1">Sin archivos de código adjuntos</h4>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                Esta publicación contiene únicamente instrucciones y enlaces de referencia.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <DialogFooter className="px-4 sm:px-6 py-2.5 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between sm:justify-between w-full">
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="font-medium">
                                        {(selectedContent.files as any[] || []).length} archivo(s) de código
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium">
                                        {(selectedContent.links as any[] || []).length} enlace(s)
                                    </span>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>
                                    Cerrar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StudentCodeViewer({ files, theme }: { files: any[]; theme: string }) {
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [hasCopied, setHasCopied] = useState(false);
    const [containerWidth, setContainerWidth] = useState<number | string>("100%");
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeFile = files[activeFileIndex] || files[0];

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setTimeout(() => {
            editor.layout();
        }, 100);
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            if (width > 0) {
                setContainerWidth(width);
                if (editorRef.current) {
                    requestAnimationFrame(() => {
                        editorRef.current.layout();
                    });
                }
            }
        });

        observer.observe(containerRef.current);
        const timer = setTimeout(() => {
            if (editorRef.current) editorRef.current.layout();
        }, 300);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [activeFileIndex, files.length]);

    const handleCopyCode = () => {
        if (!activeFile) return;
        navigator.clipboard.writeText(activeFile.content || "");
        setHasCopied(true);
        toast.success(`Código de ${activeFile.name} copiado al portapapeles`);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const handleDownloadCurrentFile = () => {
        if (!activeFile) return;
        try {
            const blob = new Blob([activeFile.content || ""], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = activeFile.name || "codigo.txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(`Descargado ${activeFile.name}`);
        } catch (error) {
            toast.error("Error al descargar el archivo");
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return null;
        if (bytes < 1024) return `${bytes} B`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-background">
            {/* File Tabs Navigation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-border/50 shrink-0 bg-muted/10 scrollbar-thin">
                {files.map((file, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveFileIndex(idx)}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all shrink-0 max-w-[220px]",
                            activeFileIndex === idx
                                ? "bg-primary/10 text-primary border-primary/40 font-semibold shadow-2xs"
                                : "bg-card text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <FileCode className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        {file.size && (
                            <span className="text-[10px] opacity-60 font-mono hidden sm:inline">
                                {formatSize(file.size)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Active File Control Bar */}
            {activeFile && (
                <div className="px-4 py-2 bg-muted/20 border-b border-border/60 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-foreground truncate">
                            {activeFile.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold font-mono">
                            {activeFile.language || "text"}
                        </Badge>
                        {activeFile.size && (
                            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                                ({formatSize(activeFile.size)})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyCode}
                            className="h-7 px-2.5 text-xs font-semibold gap-1.5 shadow-2xs"
                        >
                            {hasCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{hasCopied ? "Copiado" : "Copiar"}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCurrentFile}
                            className="h-7 px-2.5 text-xs font-semibold gap-1.5 shadow-2xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Descargar</span>
                        </Button>
                    </div>
                </div>
            )}

            {/* Monaco Editor Container */}
            <div 
                ref={containerRef}
                className="flex-1 min-h-[350px] w-full relative overflow-hidden bg-background"
            >
                {activeFile && (
                    <Editor
                        key={`${activeFileIndex}-${theme}`}
                        height="100%" 
                        width={containerWidth || "100%"}
                        language={activeFile.language || "plaintext"}
                        theme={theme}
                        value={activeFile.content || ""}
                        onMount={handleEditorDidMount}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            automaticLayout: true,
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                            lineNumbers: "on",
                            renderValidationDecorations: "off",
                            hideCursorInOverviewRuler: true,
                            wordWrap: "on",
                            tabSize: 2,
                            domReadOnly: true
                        }}
                    />
                )}
            </div>
        </div>
    );
}

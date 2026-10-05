"use client";

import { useState } from "react";
import { 
    Search, 
    Video, 
    Play, 
    Download, 
    Trash2, 
    MoreVertical, 
    Calendar, 
    Clock, 
    HardDrive, 
    Plus,
    X,
    FolderOpen,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StoredRecordingMeta } from "../types";
import { getRecordingBlob, deleteRecordingFromDB } from "../utils/indexedDb";
import { toast } from "sonner";

interface LoomLibraryViewProps {
    recordings: StoredRecordingMeta[];
    onRefresh: () => void;
    onStartNewRecording: () => void;
}

export function LoomLibraryView({
    recordings,
    onRefresh,
    onStartNewRecording,
}: LoomLibraryViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<{
        meta: StoredRecordingMeta;
        blobUrl: string;
    } | null>(null);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);

    const filtered = recordings.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePlayVideo = async (meta: StoredRecordingMeta) => {
        try {
            setIsLoadingVideo(true);
            const blob = await getRecordingBlob(meta.id);
            if (!blob) {
                toast.error("No se pudo cargar el archivo del video");
                return;
            }
            const blobUrl = URL.createObjectURL(blob);
            setSelectedVideo({ meta, blobUrl });
        } catch {
            toast.error("Error al acceder a la grabación");
        } finally {
            setIsLoadingVideo(false);
        }
    };

    const handleCloseModal = () => {
        if (selectedVideo?.blobUrl) {
            URL.revokeObjectURL(selectedVideo.blobUrl);
        }
        setSelectedVideo(null);
    };

    const handleDownload = async (meta: StoredRecordingMeta) => {
        try {
            const blob = await getRecordingBlob(meta.id);
            if (!blob) {
                toast.error("Video no disponible para descarga");
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeName = meta.title.replace(/[^a-zA-Z0-9_\-]/g, "_");
            a.download = `${safeName}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Descarga iniciada");
        } catch {
            toast.error("Error al descargar");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteRecordingFromDB(id);
            toast.success("Video eliminado de la biblioteca");
            onRefresh();
            if (selectedVideo?.meta.id === id) {
                handleCloseModal();
            }
        } catch {
            toast.error("Error al eliminar el video");
        }
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m === 0) return `${s}s`;
        return `${m}m ${s > 0 ? `${s}s` : ""}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return "Fecha desconocida";
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header de la Biblioteca estilo Loom Videos */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                            Biblioteca de Videos
                        </h2>
                        <Badge variant="outline" className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20">
                            {recordings.length} grabaciones
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Gestiona, reproduce y descarga tus clases, explicaciones y grabaciones locales.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar video..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-8 text-xs bg-card rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <Button
                        type="button"
                        onClick={onStartNewRecording}
                        className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md shadow-orange-500/20 cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Grabar Loom</span>
                    </Button>
                </div>
            </div>

            {/* Grid de Videos */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className="group relative flex flex-col rounded-2xl border border-border/80 bg-card hover:border-orange-500/40 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                            onClick={() => handlePlayVideo(item)}
                        >
                            {/* Thumbnail con píldora de duración estilo Loom */}
                            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                                {item.thumbnailDataUrl ? (
                                    <img
                                        src={item.thumbnailDataUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                                        <Video className="w-8 h-8 text-white/30" />
                                    </div>
                                )}

                                {/* Overlay play button en hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <Play className="w-5 h-5 fill-white ml-0.5" />
                                    </div>
                                </div>

                                {/* Badge de Duración en esquina inferior derecha estilo Loom (ej: "2 min", "25 sec") */}
                                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/10">
                                    {formatDuration(item.duration)}
                                </div>

                                {/* Badge de Modo */}
                                <div className="absolute top-2 left-2">
                                    <Badge variant="secondary" className="text-[10px] font-bold bg-black/60 text-white/90 border border-white/10 backdrop-blur-xs">
                                        {item.mode === "screen-cam" ? "Pantalla + Cam" : item.mode === "screen-only" ? "Pantalla" : "Cámara"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Contenido / Metadatos de la tarjeta */}
                            <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                                        {item.title}
                                    </h3>

                                    {/* Menú de Opciones */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="text-xs">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(item);
                                                }}
                                                className="gap-2 cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Descargar (.webm)</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item.id);
                                                }}
                                                className="gap-2 text-destructive cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Eliminar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(item.createdAt)}
                                    </span>
                                    <span>{formatFileSize(item.sizeBytes)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-3xl border border-dashed border-border/80 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <FolderOpen className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-bold text-foreground">
                            {searchQuery ? "No se encontraron grabaciones" : "Tu biblioteca está vacía"}
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            {searchQuery 
                                ? `No hay videos que coincidan con "${searchQuery}".` 
                                : "Comienza a grabar videos cortos estilo Loom para compartir explicaciones, feedback y retroalimentación con tus aprendices."}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button
                            type="button"
                            onClick={onStartNewRecording}
                            className="h-10 px-5 rounded-2xl text-xs font-bold gap-2 bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Crear mi primer Loom</span>
                        </Button>
                    )}
                </div>
            )}

            {/* Modal de Reproducción de Video */}
            <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && handleCloseModal()}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl bg-slate-950 border-slate-800 text-white">
                    <DialogHeader className="p-4 pb-2 border-b border-white/10 flex flex-row items-center justify-between">
                        <DialogTitle className="text-sm font-bold truncate max-w-md">
                            {selectedVideo?.meta.title}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedVideo?.blobUrl && (
                        <div className="p-4 flex flex-col gap-4">
                            <video
                                src={selectedVideo.blobUrl}
                                controls
                                autoPlay
                                className="w-full aspect-video rounded-2xl bg-black object-contain"
                            />

                            <div className="flex items-center justify-between pt-1">
                                <div className="text-xs text-white/60 flex items-center gap-3">
                                    <span>{formatDate(selectedVideo.meta.createdAt)}</span>
                                    <span>•</span>
                                    <span>{formatDuration(selectedVideo.meta.duration)}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(selectedVideo.meta.sizeBytes)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDownload(selectedVideo.meta)}
                                        className="h-8 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Descargar</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(selectedVideo.meta.id)}
                                        className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Eliminar</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

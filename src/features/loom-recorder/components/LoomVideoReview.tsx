"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { 
    Download, 
    RotateCcw, 
    Trash2, 
    Edit2, 
    Check, 
    Play, 
    Pause, 
    Volume2, 
    VolumeX, 
    Maximize, 
    Clock, 
    HardDrive, 
    Video, 
    ArrowLeft,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { StoredRecording } from "../types";

interface LoomVideoReviewProps {
    recording: StoredRecording;
    onDiscard: () => void;
    onRecordAgain: () => void;
}

export function LoomVideoReview({
    recording,
    onDiscard,
    onRecordAgain,
}: LoomVideoReviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [title, setTitle] = useState(recording.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(recording.duration || 0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        if (!recording.blob) return;
        const url = URL.createObjectURL(recording.blob);
        setVideoUrl(url);

        // Confeti de felicitación al completar el video
        try {
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
            });
        } catch {}

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [recording.blob]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || recording.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = parseFloat(e.target.value);
        setVolume(newVol);
        setIsMuted(newVol === 0);
        if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        if (isMuted) {
            videoRef.current.muted = false;
            setIsMuted(false);
            if (volume === 0) setVolume(0.5);
        } else {
            videoRef.current.muted = true;
            setIsMuted(true);
        }
    };

    const changePlaybackRate = () => {
        const rates = [1, 1.25, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        setPlaybackRate(nextRate);
        if (videoRef.current) {
            videoRef.current.playbackRate = nextRate;
        }
    };

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const handleDownload = () => {
        if (!videoUrl) return;
        const a = document.createElement("a");
        a.href = videoUrl;
        const safeName = title.trim().replace(/[^a-zA-Z0-9_\-]/g, "_") || "grabacion_video";
        a.download = `${safeName}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Descarga iniciada con éxito");
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="w-full h-full min-h-0 flex flex-col justify-center animate-in fade-in-50 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 items-center">
                {/* Columna Izquierda: Reproductor de Video */}
                <div className="lg:col-span-8 xl:col-span-8 h-full min-h-0 flex flex-col justify-center">
                    <div className="relative w-full aspect-video max-h-[calc(100vh-140px)] rounded-2xl overflow-hidden bg-slate-950 border border-border dark:border-slate-800 shadow-xl group mx-auto flex items-center justify-center">
                        {videoUrl ? (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                                onClick={handlePlayPause}
                                className="w-full h-full object-contain bg-black cursor-pointer"
                            />
                        ) : (
                            <div className="w-full aspect-video flex items-center justify-center bg-black">
                                <span className="text-xs text-white/50 animate-pulse">Cargando previsualización del video...</span>
                            </div>
                        )}

                        {/* Overlay de pausa en el centro */}
                        {!isPlaying && (
                            <div 
                                onClick={handlePlayPause}
                                className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-2xs cursor-pointer"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                                    <Play className="w-6 h-6 fill-current ml-0.5" />
                                </div>
                            </div>
                        )}

                        {/* Barra de Controles Inferior */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-3 flex flex-col gap-1.5 transition-opacity duration-200">
                            {/* Barra de progreso */}
                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                step={0.1}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
                            />

                            <div className="flex items-center justify-between text-white text-xs pt-0.5">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePlayPause}
                                        className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                                    </button>

                                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-white/80">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>/</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>

                                    <div className="flex items-center gap-1 pl-1">
                                        <button
                                            type="button"
                                            onClick={toggleMute}
                                            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                                        >
                                            {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                        </button>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className="w-14 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={changePlaybackRate}
                                        className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold font-mono transition-colors cursor-pointer"
                                    >
                                        {playbackRate}x
                                    </button>

                                    <button
                                        type="button"
                                        onClick={toggleFullscreen}
                                        className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                                    >
                                        <Maximize className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Tarjeta de Acciones, Título y Metadatos */}
                <div className="lg:col-span-4 xl:col-span-4 h-full min-h-0 flex flex-col justify-center">
                    <div className="bg-card border border-border rounded-2xl shadow-xs p-4 space-y-3">
                        {/* Status y Regresar */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRecordAgain}
                                className="h-7 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground cursor-pointer -ml-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Volver</span>
                            </Button>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                Grabación Completada
                            </Badge>
                        </div>

                        {/* Título editable */}
                        <div>
                            {isEditingTitle ? (
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") setIsEditingTitle(false);
                                        }}
                                        className="text-sm font-bold h-8 bg-card rounded-lg border-primary"
                                        autoFocus
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => setIsEditingTitle(false)}
                                        className="h-8 px-2.5 rounded-lg"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingTitle(true)}
                                    className="flex items-center justify-between gap-2 cursor-pointer rounded-lg p-1 hover:bg-muted/50 transition-colors group"
                                >
                                    <h2 className="text-sm font-bold tracking-tight text-foreground truncate">
                                        {title}
                                    </h2>
                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0" />
                                </div>
                            )}
                        </div>

                        {/* Aviso de Privacidad y Descarga */}
                        <div className="p-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/70 text-[11px] text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
                                Sin almacenamiento en la nube
                            </p>
                            <p className="leading-tight text-[10px]">
                                El video reside solo en tu navegador. Haz clic en el botón de abajo para descargarlo ahora a tu equipo.
                            </p>
                        </div>

                        {/* Metadatos compactos */}
                        <div className="grid grid-cols-3 gap-1.5 py-1">
                            <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center">
                                <Clock className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                                <span className="text-[10px] text-muted-foreground block">Duración</span>
                                <strong className="text-xs text-foreground font-mono">{formatTime(duration)}</strong>
                            </div>

                            <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center">
                                <HardDrive className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                                <span className="text-[10px] text-muted-foreground block">Tamaño</span>
                                <strong className="text-xs text-foreground">{formatFileSize(recording.sizeBytes)}</strong>
                            </div>

                            <div className="p-2 rounded-xl bg-muted/30 border border-border/60 text-center">
                                <Video className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                                <span className="text-[10px] text-muted-foreground block">Modo</span>
                                <strong className="text-xs text-foreground truncate block">
                                    {recording.mode === "screen-cam" ? "Pant + Cam" : recording.mode === "screen-only" ? "Pantalla" : "Cámara"}
                                </strong>
                            </div>
                        </div>

                        {/* Botón Principal de Descarga */}
                        <Button
                            variant="default"
                            size="default"
                            onClick={handleDownload}
                            className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar Video Ahora (.webm)</span>
                        </Button>

                        {/* Botones secundarios */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRecordAgain}
                                className="flex-1 h-8 text-xs font-semibold rounded-lg border-border hover:bg-muted"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                <span>Nuevo Video</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDiscard}
                                className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                <span>Descartar</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

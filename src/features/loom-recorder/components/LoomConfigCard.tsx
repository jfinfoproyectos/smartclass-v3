"use client";

import { useEffect, useState } from "react";
import { 
    Monitor, 
    Camera, 
    Mic, 
    MicOff, 
    VideoOff, 
    Sparkles, 
    Settings2, 
    Globe, 
    Clock, 
    SlidersHorizontal,
    Check,
    Volume2,
    Info,
    Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { RecordingMode, BubblePosition, BubbleSize, RecorderSettings } from "../types";

interface LoomConfigCardProps {
    settings: RecorderSettings;
    onSettingsChange: (newSettings: Partial<RecorderSettings>) => void;
    onStartRecording: () => void;
    micLevel: number; // 0 - 100
    isRequestingMedia: boolean;
}

export function LoomConfigCard({
    settings,
    onSettingsChange,
    onStartRecording,
    micLevel,
    isRequestingMedia
}: LoomConfigCardProps) {
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Enumerar dispositivos de entrada disponibles una sola vez al montar
    useEffect(() => {
        let isMounted = true;
        async function loadDevices() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
                const devices = await navigator.mediaDevices.enumerateDevices();
                const video = devices.filter((d) => d.kind === "videoinput");
                const audio = devices.filter((d) => d.kind === "audioinput");

                if (!isMounted) return;
                setVideoDevices(video);
                setAudioDevices(audio);

                if (video.length > 0 && !settings.selectedCameraId) {
                    onSettingsChange({ selectedCameraId: video[0].deviceId });
                }
                if (audio.length > 0 && !settings.selectedMicId) {
                    onSettingsChange({ selectedMicId: audio[0].deviceId });
                }
            } catch (err) {
                console.warn("No se pudieron listar los dispositivos:", err);
            }
        }

        loadDevices();
        const handleDeviceChange = () => loadDevices();
        navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange);
        return () => {
            isMounted = false;
            navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
        };
    }, []); // Run on mount

    return (
        <div className="w-full max-w-md mx-auto bg-card border border-border rounded-2xl shadow-xs p-3.5 relative transition-all duration-300 max-h-[calc(100vh-8.5rem)] overflow-y-auto">
            {/* Header estilo Loom con tema SmartClass */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm tracking-tight text-foreground">
                                Estudio de Video
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold bg-primary/10 text-primary border-primary/20">
                                PRO
                            </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Grabación de pantalla & cámara</p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`h-7 w-7 p-0 rounded-full transition-colors cursor-pointer ${showAdvanced ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title="Ajustes avanzados"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Selector de Modos (Screen + Cam / Screen Only / Cam Only) */}
            <div className="grid grid-cols-3 gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-xl my-2 border border-border/50">
                {[
                    { id: "screen-cam", label: "Pantalla + Cam", icon: Monitor },
                    { id: "screen-only", label: "Solo Pantalla", icon: Monitor },
                    { id: "cam-only", label: "Solo Cámara", icon: Camera },
                ].map((modeItem) => {
                    const isSelected = settings.mode === modeItem.id;
                    const Icon = modeItem.icon;
                    return (
                        <button
                            key={modeItem.id}
                            type="button"
                            onClick={() => onSettingsChange({ mode: modeItem.id as RecordingMode })}
                            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                isSelected
                                    ? "bg-background text-foreground shadow-xs border border-border"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : ""}`} />
                            <span className="text-[10px] tracking-tight">{modeItem.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Panel de Dispositivos tipo Tarjeta Loom */}
            <div className="space-y-1.5">
                {/* 1. Opción Pantalla Completa Compacta */}
                {settings.mode !== "cam-only" && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/70 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Monitor className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-foreground leading-tight">Toda la Pantalla</p>
                                <p className="text-[10px] text-muted-foreground truncate">Graba fuera del navegador (VS Code, apps)</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
                            Monitor Total
                        </Badge>
                    </div>
                )}



                {/* 3. Opción Cámara */}
                {settings.mode !== "screen-only" && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-lg shrink-0 ${settings.cameraEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    {settings.cameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-semibold text-foreground leading-tight">Cámara Web</p>
                                    <p className="text-[10px] text-muted-foreground">Burbuja circular</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onSettingsChange({ cameraEnabled: !settings.cameraEnabled })}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all border ${
                                    settings.cameraEnabled
                                        ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25"
                                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                                }`}
                            >
                                {settings.cameraEnabled ? "On" : "Off"}
                            </button>
                        </div>

                        {settings.cameraEnabled && videoDevices.length > 0 && (
                            <div className="pt-0.5">
                                <Select
                                    value={settings.selectedCameraId}
                                    onValueChange={(val) => onSettingsChange({ selectedCameraId: val })}
                                >
                                    <SelectTrigger className="h-7 text-xs bg-card border-border rounded-lg">
                                        <SelectValue placeholder="Seleccionar cámara" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {videoDevices.map((d, i) => (
                                            <SelectItem key={d.deviceId || i} value={d.deviceId || `cam-${i}`} className="text-xs">
                                                {d.label || `Cámara ${i + 1}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Opción Micrófono + VU Meter */}
                <div className="px-2.5 py-1.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/70 space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-lg shrink-0 ${settings.micEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {settings.micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-semibold text-foreground leading-tight">Micrófono & Audio</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-75"
                                            style={{ width: `${settings.micEnabled ? micLevel : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {settings.micEnabled ? `${micLevel}%` : "Mute"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onSettingsChange({ micEnabled: !settings.micEnabled })}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all border ${
                                settings.micEnabled
                                    ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25"
                                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                        >
                            {settings.micEnabled ? "On" : "Off"}
                        </button>
                    </div>

                    {settings.micEnabled && audioDevices.length > 0 && (
                        <div className="pt-0.5">
                            <Select
                                value={settings.selectedMicId}
                                onValueChange={(val) => onSettingsChange({ selectedMicId: val })}
                            >
                                <SelectTrigger className="h-7 text-xs bg-card border-border rounded-lg">
                                    <SelectValue placeholder="Seleccionar micrófono" />
                                </SelectTrigger>
                                <SelectContent>
                                    {audioDevices.map((d, i) => (
                                        <SelectItem key={d.deviceId || i} value={d.deviceId || `mic-${i}`} className="text-xs">
                                            {d.label || `Micrófono ${i + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Opciones avanzadas de burbuja y temporizador si está expandido */}
                {showAdvanced && (
                    <div className="p-2.5 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border space-y-2 animate-in fade-in-50 duration-200">
                        <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-semibold text-foreground">Posición burbuja</Label>
                            <div className="grid grid-cols-2 gap-1">
                                {[
                                    { id: "bottom-left", label: "↙ Abajo Izq" },
                                    { id: "bottom-right", label: "↘ Abajo Der" },
                                    { id: "top-left", label: "↖ Arriba Izq" },
                                    { id: "top-right", label: "↗ Arriba Der" },
                                ].map((pos) => (
                                    <button
                                        key={pos.id}
                                        type="button"
                                        onClick={() => onSettingsChange({ bubblePosition: pos.id as BubblePosition })}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer ${
                                            settings.bubblePosition === pos.id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card text-muted-foreground border-border hover:bg-muted"
                                        }`}
                                    >
                                        {pos.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                            <Label className="text-[11px] font-semibold text-foreground">Tamaño burbuja</Label>
                            <div className="flex items-center gap-1">
                                {(["sm", "md", "lg"] as BubbleSize[]).map((sz) => (
                                    <button
                                        key={sz}
                                        type="button"
                                        onClick={() => onSettingsChange({ bubbleSize: sz })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase cursor-pointer ${
                                            settings.bubbleSize === sz
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-card text-muted-foreground border-border hover:bg-muted"
                                        }`}
                                    >
                                        {sz}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                            <Label className="text-[11px] font-semibold text-foreground">Límite tiempo</Label>
                            <Select
                                value={String(settings.maxDurationMinutes)}
                                onValueChange={(val) => onSettingsChange({ maxDurationMinutes: Number(val) })}
                            >
                                <SelectTrigger className="h-6 w-24 text-[10px] bg-card border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0" className="text-xs">Sin límite</SelectItem>
                                    <SelectItem value="5" className="text-xs">5 minutos</SelectItem>
                                    <SelectItem value="10" className="text-xs">10 minutos</SelectItem>
                                    <SelectItem value="15" className="text-xs">15 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Botón Principal "Start Recording" con tema primario SmartClass */}
            <div className="pt-2 space-y-1">
                <Button
                    type="button"
                    onClick={onStartRecording}
                    disabled={isRequestingMedia}
                    className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-primary/20 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                    {isRequestingMedia ? (
                        <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            <span>Solicitando permisos...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-foreground animate-pulse" />
                            <span>Start recording</span>
                        </div>
                    )}
                </Button>

                <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {settings.maxDurationMinutes > 0 
                        ? `Límite: ${settings.maxDurationMinutes} min · Descarga directa WebM`
                        : "Grabación ilimitada · Descarga directa WebM"}
                </p>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { 
    Video, 
    Sparkles, 
    HelpCircle, 
    ArrowLeft, 
    ShieldCheck, 
    Zap, 
    Monitor, 
    Camera, 
    CheckCircle2,
    HardDrive,
    Lock,
    AlertTriangle,
    ExternalLink,
    Square,
    Play,
    Pause
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { 
    RecordingStatus, 
    RecorderSettings, 
    StoredRecording 
} from "../types";
import { LoomRecorderEngine } from "../utils/recorderEngine";

import { LoomConfigCard } from "./LoomConfigCard";
import { LoomFloatingControls } from "./LoomFloatingControls";
import { LoomCameraBubble } from "./LoomCameraBubble";
import { LoomCountdownOverlay } from "./LoomCountdownOverlay";
import { LoomVideoReview } from "./LoomVideoReview";

const DEFAULT_SETTINGS: RecorderSettings = {
    mode: "screen-cam",
    selectedCameraId: "",
    selectedMicId: "",
    cameraEnabled: true,
    micEnabled: true,
    bubblePosition: "bottom-left",
    bubbleSize: "md",
    isMirrored: true,
    countdownDuration: 3,
    maxDurationMinutes: 5, // Default 5 min like Loom free tier
    audioQuality: "high",
    screenCaptureType: "monitor",
};

export function LoomRecorderView() {
    const [status, setStatus] = useState<RecordingStatus>("idle");
    const [activeTab, setActiveTab] = useState<"studio" | "guide">("studio");
    const [settings, setSettings] = useState<RecorderSettings>(DEFAULT_SETTINGS);
    const [micLevel, setMicLevel] = useState<number>(0);
    const [isRequestingMedia, setIsRequestingMedia] = useState<boolean>(false);
    const [surfaceWarning, setSurfaceWarning] = useState<{ open: boolean; surfaceType: string; stream: MediaStream } | null>(null);

    // Grabación activa actual (sin persistir en base de datos)
    const [activeRecording, setActiveRecording] = useState<StoredRecording | null>(null);

    // Streams en vivo persistentes
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const [cameraStreamState, setCameraStreamState] = useState<MediaStream | null>(null);

    // Live monitor stream y Picture in Picture
    const [compositeStreamState, setCompositeStreamState] = useState<MediaStream | null>(null);
    const liveMonitorVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isPiPActive, setIsPiPActive] = useState<boolean>(false);
    const pipWindowRef = useRef<Window | null>(null);

    // Cronómetro
    const [duration, setDuration] = useState<number>(0);
    const timerIntervalRef = useRef<number | null>(null);
    const thumbnailRef = useRef<string>("");

    // Motor de grabación
    const engineRef = useRef<LoomRecorderEngine | null>(null);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Conectar el stream de video compuesto al monitor en vivo durante la grabación
    useEffect(() => {
        if (liveMonitorVideoRef.current && compositeStreamState) {
            liveMonitorVideoRef.current.srcObject = compositeStreamState;
            liveMonitorVideoRef.current.play().catch(() => {});
        }
    }, [compositeStreamState, status]);

    // Sincronizar temporizador en la ventana flotante Picture-in-Picture
    useEffect(() => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
            const timerEl = pipWindowRef.current.document.getElementById("pip-timer");
            if (timerEl) {
                timerEl.textContent = formatTime(duration);
            }
        }
    }, [duration]);



    // Limpiar streams y ventanas al desmontar la vista
    useEffect(() => {
        return () => {
            stopAllStreams();
            if (engineRef.current) {
                engineRef.current.cleanup();
            }
            if (pipWindowRef.current) {
                try { pipWindowRef.current.close(); } catch {}
                pipWindowRef.current = null;
            }
        };
    }, []);

    // Inicializar previsualización estable de cámara y micrófono sin reinicializaciones repetidas
    useEffect(() => {
        let isMounted = true;

        async function initPreviewStreams() {
            if (status !== "idle" && status !== "configuring") return;

            // 1. Micrófono
            if (settings.micEnabled && navigator.mediaDevices?.getUserMedia) {
                const hasLiveMic = micStreamRef.current && 
                    micStreamRef.current.getAudioTracks().some(t => t.readyState === "live");

                if (!hasLiveMic) {
                    try {
                        const audioConstraints: MediaStreamConstraints = {
                            audio: settings.selectedMicId ? { deviceId: { exact: settings.selectedMicId } } : true,
                            video: false,
                        };
                        const micStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
                        if (!isMounted) {
                            micStream.getTracks().forEach((t) => t.stop());
                            return;
                        }
                        micStreamRef.current = micStream;

                        if (!engineRef.current) {
                            engineRef.current = new LoomRecorderEngine({
                                onVolumeChange: (vol) => {
                                    if (isMounted) setMicLevel(vol);
                                },
                            });
                        }
                        engineRef.current.setupAudioAnalyser(micStream);
                    } catch (e) {
                        console.warn("No se pudo iniciar el micrófono:", e);
                    }
                }
            }

            // 2. Cámara (Verificar si ya está activa para evitar parpadeos de apagado/encendido)
            if (settings.cameraEnabled && settings.mode !== "screen-only" && navigator.mediaDevices?.getUserMedia) {
                const hasLiveCam = cameraStreamRef.current && 
                    cameraStreamRef.current.getVideoTracks().some(t => t.readyState === "live");

                if (!hasLiveCam) {
                    try {
                        const videoConstraints: MediaStreamConstraints = {
                            video: settings.selectedCameraId
                                ? { deviceId: { exact: settings.selectedCameraId }, width: 1280, height: 720 }
                                : { width: 1280, height: 720 },
                            audio: false,
                        };
                        const camStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
                        if (!isMounted) {
                            camStream.getTracks().forEach((t) => t.stop());
                            return;
                        }
                        cameraStreamRef.current = camStream;
                        setCameraStreamState(camStream);
                    } catch (err) {
                        console.warn("No se pudo iniciar la cámara:", err);
                    }
                }
            } else {
                if (cameraStreamRef.current) {
                    cameraStreamRef.current.getTracks().forEach((t) => t.stop());
                    cameraStreamRef.current = null;
                    setCameraStreamState(null);
                }
            }
        }

        initPreviewStreams();

        return () => {
            isMounted = false;
        };
    }, [settings.cameraEnabled, settings.micEnabled, settings.selectedCameraId, settings.selectedMicId, settings.mode, status]);

    const stopAllStreams = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((t) => t.stop());
            cameraStreamRef.current = null;
            setCameraStreamState(null);
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop());
            micStreamRef.current = null;
        }
    };

    // Actualizar configuración
    const handleSettingsChange = (newSettings: Partial<RecorderSettings>) => {
        setSettings((prev) => {
            const updated = { ...prev, ...newSettings };
            if (engineRef.current) {
                engineRef.current.updateBubbleConfig(
                    updated.bubblePosition,
                    updated.bubbleSize,
                    updated.isMirrored
                );
            }
            return updated;
        });
    };

    const finalizePreparation = async (screenStream: MediaStream | null) => {
        try {
            if (screenStream) {
                screenStreamRef.current = screenStream;
            }

            // 2. Reutilizar o iniciar cámara
            if (settings.cameraEnabled && settings.mode !== "screen-only") {
                const isLive = cameraStreamRef.current && cameraStreamRef.current.getVideoTracks().some(t => t.readyState === "live");
                if (!isLive) {
                    const camStream = await navigator.mediaDevices.getUserMedia({
                        video: settings.selectedCameraId
                            ? { deviceId: { exact: settings.selectedCameraId }, width: 1280, height: 720 }
                            : { width: 1280, height: 720 },
                        audio: false,
                    });
                    cameraStreamRef.current = camStream;
                    setCameraStreamState(camStream);
                }
            }

            // 3. Reutilizar o iniciar micrófono
            if (settings.micEnabled) {
                const isLive = micStreamRef.current && micStreamRef.current.getAudioTracks().some(t => t.readyState === "live");
                if (!isLive) {
                    const micStream = await navigator.mediaDevices.getUserMedia({
                        audio: settings.selectedMicId ? { deviceId: { exact: settings.selectedMicId } } : true,
                        video: false,
                    });
                    micStreamRef.current = micStream;
                }
            }

            setIsRequestingMedia(false);
            setStatus("countdown");
        } catch (err) {
            setIsRequestingMedia(false);
            toast.error("Error al preparar los dispositivos");
            stopAllStreams();
        }
    };

    // Solicitar pantalla y pasar a cuenta regresiva
    const handlePrepareRecording = async () => {
        try {
            setIsRequestingMedia(true);

            // 1. Obtener stream de pantalla
            if (settings.mode !== "cam-only") {
                if (!navigator.mediaDevices?.getDisplayMedia) {
                    toast.error("Tu navegador no soporta grabación de pantalla (getDisplayMedia)");
                    setIsRequestingMedia(false);
                    return;
                }

                const displayMediaOptions: any = {
                    video: {
                        displaySurface: "monitor",
                        frameRate: 30,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: {
                        suppressLocalAudioPlayback: false,
                    },
                    preferCurrentTab: false,
                    selfBrowserSurface: "exclude",
                    systemAudio: "include",
                    monitorTypeSurfaces: "include"
                };

                const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                const videoTrack = screenStream.getVideoTracks()[0];
                const trackSettings = videoTrack?.getSettings();
                const surface = trackSettings?.displaySurface;

                // Si el usuario seleccionó solo una pestaña o ventana en vez de Toda la pantalla
                if (surface && surface !== "monitor") {
                    setIsRequestingMedia(false);
                    setSurfaceWarning({
                        open: true,
                        surfaceType: surface === "browser" ? "Pestaña de Chrome" : "Ventana de aplicación",
                        stream: screenStream
                    });
                    return;
                }

                await finalizePreparation(screenStream);
            } else {
                await finalizePreparation(null);
            }
        } catch (err: any) {
            setIsRequestingMedia(false);
            if (err?.name === "NotAllowedError") {
                toast.info("Grabación cancelada: Se canceló la selección de pantalla");
            } else {
                toast.error("Error al preparar los dispositivos de grabación");
            }
            stopAllStreams();
        }
    };

    const handleResolveWarning = (retryEntireScreen: boolean) => {
        if (!surfaceWarning) return;
        const currentStream = surfaceWarning.stream;
        setSurfaceWarning(null);

        if (retryEntireScreen) {
            // Detener el stream de pestaña anterior y reintentar para Toda la Pantalla
            currentStream.getTracks().forEach((t) => t.stop());
            setTimeout(() => {
                handlePrepareRecording();
            }, 150);
        } else {
            // Continuar con la pestaña seleccionada
            finalizePreparation(currentStream);
        }
    };

    // Iniciar grabación tras cuenta regresiva
    const handleStartActualRecording = async () => {
        try {
            setDuration(0);
            thumbnailRef.current = "";

            engineRef.current = new LoomRecorderEngine({
                onVolumeChange: (vol) => setMicLevel(vol),
                onThumbnailReady: (dataUrl) => {
                    thumbnailRef.current = dataUrl;
                },
                onAutoStop: () => {
                    handleStopRecording();
                },
                onError: (err) => {
                    toast.error(`Error en grabación: ${err.message}`);
                    setStatus("idle");
                },
            });

            await engineRef.current.startRecording({
                mode: settings.mode,
                screenStream: screenStreamRef.current,
                cameraStream: settings.cameraEnabled ? cameraStreamRef.current : null,
                micStream: settings.micEnabled ? micStreamRef.current : null,
                bubblePosition: settings.bubblePosition,
                bubbleSize: settings.bubbleSize,
                isMirrored: settings.isMirrored,
                instructorName: "Docente SmartClass",
            });

            const comp = engineRef.current.getCompositeStream();
            setCompositeStreamState(comp || screenStreamRef.current);

            setStatus("recording");

            // Iniciar temporizador
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = window.setInterval(() => {
                setDuration((prev) => {
                    const next = prev + 1;
                    if (settings.maxDurationMinutes > 0 && next >= settings.maxDurationMinutes * 60) {
                        toast.info(`Límite de ${settings.maxDurationMinutes} minutos alcanzado`);
                        handleStopRecording();
                    }
                    return next;
                });
            }, 1000);
        } catch (err: any) {
            toast.error(`Error al iniciar la grabación: ${err.message}`);
            setStatus("idle");
            stopAllStreams();
        }
    };

    // Control flotante Picture-in-Picture siempre visible sobre otras apps (VS Code, etc.)
    const handleTogglePiP = async () => {
        if (typeof window === "undefined" || !("documentPictureInPicture" in window)) {
            toast.info("Para usar la ventana flotante siempre visible, usa Chrome o Edge moderno.");
            return;
        }

        try {
            if (pipWindowRef.current) {
                pipWindowRef.current.close();
                pipWindowRef.current = null;
                setIsPiPActive(false);
                return;
            }

            const pipWin = await (window as any).documentPictureInPicture.requestWindow({
                width: 320,
                height: 85,
            });
            pipWindowRef.current = pipWin;
            setIsPiPActive(true);

            pipWin.addEventListener("pagehide", () => {
                pipWindowRef.current = null;
                setIsPiPActive(false);
            });

            const doc = pipWin.document;
            doc.body.style.margin = "0";
            doc.body.style.padding = "10px 14px";
            doc.body.style.backgroundColor = "#020617";
            doc.body.style.color = "#ffffff";
            doc.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
            doc.body.style.display = "flex";
            doc.body.style.alignItems = "center";
            doc.body.style.justifyContent = "space-between";
            doc.body.style.userSelect = "none";
            doc.body.style.boxSizing = "border-box";

            const infoDiv = doc.createElement("div");
            infoDiv.style.display = "flex";
            infoDiv.style.alignItems = "center";
            infoDiv.style.gap = "8px";

            const dot = doc.createElement("span");
            dot.style.width = "9px";
            dot.style.height = "9px";
            dot.style.borderRadius = "50%";
            dot.style.backgroundColor = "#ef4444";
            dot.style.display = "inline-block";

            const timerSpan = doc.createElement("span");
            timerSpan.id = "pip-timer";
            timerSpan.style.fontFamily = "monospace";
            timerSpan.style.fontWeight = "bold";
            timerSpan.style.fontSize = "13px";
            timerSpan.textContent = formatTime(duration);
            infoDiv.appendChild(dot);
            infoDiv.appendChild(timerSpan);

            const actionsDiv = doc.createElement("div");
            actionsDiv.style.display = "flex";
            actionsDiv.style.alignItems = "center";
            actionsDiv.style.gap = "6px";

            const pauseBtn = doc.createElement("button");
            pauseBtn.textContent = status === "paused" ? "▶ Reanudar" : "⏸";
            pauseBtn.style.padding = "5px 9px";
            pauseBtn.style.borderRadius = "7px";
            pauseBtn.style.border = "1px solid rgba(255,255,255,0.2)";
            pauseBtn.style.backgroundColor = "rgba(255,255,255,0.15)";
            pauseBtn.style.color = "#ffffff";
            pauseBtn.style.fontWeight = "bold";
            pauseBtn.style.fontSize = "11px";
            pauseBtn.style.cursor = "pointer";
            pauseBtn.onclick = () => {
                handlePauseToggle();
            };

            const stopBtn = doc.createElement("button");
            stopBtn.textContent = "⏹ Finalizar";
            stopBtn.style.padding = "5px 10px";
            stopBtn.style.borderRadius = "7px";
            stopBtn.style.border = "none";
            stopBtn.style.backgroundColor = "#dc2626";
            stopBtn.style.color = "#ffffff";
            stopBtn.style.fontWeight = "bold";
            stopBtn.style.fontSize = "11px";
            stopBtn.style.cursor = "pointer";
            stopBtn.onclick = () => {
                pipWin.close();
                handleStopRecording();
            };

            actionsDiv.appendChild(pauseBtn);
            actionsDiv.appendChild(stopBtn);

            doc.body.appendChild(infoDiv);
            doc.body.appendChild(actionsDiv);
        } catch (e) {
            console.warn("Error al abrir PiP:", e);
        }
    };

    // Pausar / Reanudar
    const handlePauseToggle = () => {
        if (!engineRef.current) return;
        if (status === "recording") {
            engineRef.current.pause();
            setStatus("paused");
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        } else if (status === "paused") {
            engineRef.current.resume();
            setStatus("recording");
            timerIntervalRef.current = window.setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
    };

    // Reiniciar desde cero
    const handleRestart = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (pipWindowRef.current) {
            try { pipWindowRef.current.close(); } catch {}
            pipWindowRef.current = null;
            setIsPiPActive(false);
        }
        if (engineRef.current) {
            engineRef.current.cleanup();
        }
        setDuration(0);
        setStatus("countdown");
    };

    // Descartar
    const handleDiscard = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (pipWindowRef.current) {
            try { pipWindowRef.current.close(); } catch {}
            pipWindowRef.current = null;
            setIsPiPActive(false);
        }
        if (engineRef.current) {
            engineRef.current.cleanup();
        }
        stopAllStreams();
        setDuration(0);
        setStatus("idle");
        toast.info("Grabación cancelada");
    };

    // Detener y pasar a revisión (SOLO para descarga directa, sin guardar en BD)
    const handleStopRecording = async () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (pipWindowRef.current) {
            try { pipWindowRef.current.close(); } catch {}
            pipWindowRef.current = null;
            setIsPiPActive(false);
        }

        try {
            if (!engineRef.current) return;
            const finalBlob = await engineRef.current.stop();

            const dateStr = new Date().toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
            });

            const newRec: StoredRecording = {
                id: `loom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: `Grabación de Video - ${dateStr}`,
                blob: finalBlob,
                duration: duration || 1,
                sizeBytes: finalBlob.size,
                createdAt: new Date().toISOString(),
                thumbnailDataUrl: thumbnailRef.current || "",
                mode: settings.mode,
                mimeType: finalBlob.type || "video/webm",
            };

            setActiveRecording(newRec);
            setStatus("review");
            stopAllStreams();
        } catch (e: any) {
            toast.error("Error al procesar la grabación");
            setStatus("idle");
            stopAllStreams();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full overflow-hidden p-2.5 sm:p-4 space-y-2">
            {/* Header del Estudio consistente con el tema */}
            <div className="flex items-center justify-between gap-3 p-2.5 px-4 rounded-2xl border border-border bg-card shadow-xs shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Link href="/dashboard/teacher/tools">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Video className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground truncate">
                            Grabador de Pantalla y Cámara
                        </h1>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold hidden sm:inline-flex shrink-0">
                            Descarga Inmediata
                        </Badge>
                    </div>
                </div>

                {/* Pestañas de navegación */}
                <div className="flex items-center gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-xl border border-border shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("studio");
                            if (status === "review") setStatus("idle");
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "studio"
                                ? "bg-background text-foreground shadow-xs border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>Estudio</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("guide")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "guide"
                                ? "bg-background text-foreground shadow-xs border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-primary" />
                        <span>Guía</span>
                    </button>
                </div>
            </div>

            {/* VISTA 1: ESTUDIO DE GRABACIÓN */}
            {activeTab === "studio" && (
                <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col justify-center">
                    {/* Caso A: Revisión y descarga inmediata del video grabado */}
                    {status === "review" && activeRecording && (
                        <div className="h-full min-h-0 w-full flex flex-col justify-center">
                            <LoomVideoReview
                                recording={activeRecording}
                                onDiscard={() => {
                                    setActiveRecording(null);
                                    setStatus("idle");
                                }}
                                onRecordAgain={() => {
                                    setActiveRecording(null);
                                    setStatus("idle");
                                }}
                            />
                        </div>
                    )}

                    {/* Caso B: Cuenta regresiva 3, 2, 1 */}
                    {status === "countdown" && (
                        <LoomCountdownOverlay
                            duration={settings.countdownDuration}
                            onFinish={handleStartActualRecording}
                            onCancel={() => {
                                setStatus("idle");
                                stopAllStreams();
                            }}
                        />
                    )}

                    {/* Caso C: Grabando o Pausado (Controles flotantes estilo Loom + Cámara Circular + Monitor Interactivo) */}
                    {(status === "recording" || status === "paused") && (
                        <div className="relative w-full h-full min-h-0 flex flex-col items-center justify-center">
                            {/* Widget de controles flotantes en el borde izquierdo */}
                            <LoomFloatingControls
                                duration={duration}
                                isPaused={status === "paused"}
                                onStop={handleStopRecording}
                                onPauseToggle={handlePauseToggle}
                                onRestart={handleRestart}
                                onDiscard={handleDiscard}
                                onTogglePiP={handleTogglePiP}
                                isPiPActive={isPiPActive}
                            />

                            {/* Burbuja de cámara flotante */}
                            {settings.cameraEnabled && (
                                <LoomCameraBubble
                                    stream={cameraStreamState}
                                    position={settings.bubblePosition}
                                    size={settings.bubbleSize}
                                    isMirrored={settings.isMirrored}
                                    isRecording={status === "recording"}
                                    onPositionChange={(pos) => handleSettingsChange({ bubblePosition: pos })}
                                    onSizeChange={(sz) => handleSettingsChange({ bubbleSize: sz })}
                                    onMirrorToggle={() => handleSettingsChange({ isMirrored: !settings.isMirrored })}
                                />
                            )}

                            {/* Monitor de Grabación en Vivo */}
                            <div className="relative w-full aspect-video max-h-[calc(100vh-215px)] rounded-2xl overflow-hidden bg-slate-950 border border-border dark:border-slate-800 shadow-2xl p-3 flex flex-col justify-between mx-auto ring-1 ring-border/50 dark:ring-white/10 shrink min-h-0">
                                {/* Barra Superior del Monitor */}
                                <div className="flex items-center justify-between z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${status === "paused" ? "bg-amber-400" : "bg-red-500 animate-pulse"}`} />
                                        <span className="text-xs font-bold text-white tracking-wide">
                                            {status === "paused" ? "PAUSADO" : "GRABANDO EN VIVO"}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-white/90 bg-white/10 px-2 py-0.5 rounded-md">
                                            {formatTime(duration)}
                                        </span>
                                    </div>

                                    {/* Insignia de Calidad */}
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-white/80 border-white/20 bg-black/40 text-[11px]">
                                            Grabación Full HD · 1080p
                                        </Badge>
                                    </div>

                                    {/* Botón PiP y estado */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleTogglePiP}
                                            className="text-[10px] h-6 px-2 bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            {isPiPActive ? "Cerrar PiP" : "Control Flotante (PiP)"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Video Monitor */}
                                <div 
                                    id="loom-live-monitor"
                                    className="absolute inset-0 z-0 flex items-center justify-center bg-black select-none overflow-hidden"
                                >
                                    <video
                                        ref={(el) => {
                                            liveMonitorVideoRef.current = el;
                                            if (el && compositeStreamState && el.srcObject !== compositeStreamState) {
                                                el.srcObject = compositeStreamState;
                                                el.play().catch(() => {});
                                            }
                                        }}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain pointer-events-none"
                                    />
                                </div>

                                {/* Barra Inferior de Acciones Rápidas */}
                                <div className="flex items-center justify-between z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                                    <span className="text-[11px] text-white/70">
                                        Composición en tiempo real 30 FPS · Full HD
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handlePauseToggle}
                                            className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                                        >
                                            {status === "paused" ? <Play className="w-3.5 h-3.5 mr-1 fill-current" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
                                            {status === "paused" ? "Reanudar" : "Pausar"}
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={handleStopRecording}
                                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-bold shadow-md cursor-pointer"
                                        >
                                            <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                                            Finalizar Grabación
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Caso D: Estado Idle / Configuración (Tarjeta Popout de Loom) */}
                    {(status === "idle" || status === "configuring") && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0 items-center">
                            {/* Columna Izquierda: Tarjeta Flotante estilo Loom Popout con scroll vertical interno */}
                            <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0 flex flex-col justify-center">
                                <LoomConfigCard
                                    settings={settings}
                                    onSettingsChange={handleSettingsChange}
                                    onStartRecording={handlePrepareRecording}
                                    micLevel={micLevel}
                                    isRequestingMedia={isRequestingMedia}
                                />
                            </div>

                            {/* Columna Derecha: Vista previa en vivo adaptada a la pantalla para evitar scroll */}
                            <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0 flex flex-col justify-center items-center gap-2 overflow-hidden">
                                <div className="relative w-full aspect-video max-h-[calc(100vh-215px)] rounded-2xl overflow-hidden bg-slate-950 border border-border dark:border-slate-800 shadow-lg dark:shadow-2xl p-4 flex flex-col justify-between mx-auto ring-1 ring-border/50 dark:ring-white/10 shrink min-h-0">
                                    <div className="flex items-center justify-between z-10">
                                        <Badge variant="outline" className="text-xs bg-black/40 text-white border-white/20 backdrop-blur-md">
                                            Previsualización en Vivo
                                        </Badge>
                                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[11px] font-medium text-white/90">Estudio Listo</span>
                                        </div>
                                    </div>

                                    {/* Mockup de pantalla */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                        <div className="text-center space-y-1.5 px-4">
                                            <Monitor className="w-12 h-12 text-white/30 mx-auto" />
                                            <p className="text-xs text-white/60">
                                                Al pulsar &quot;Start recording&quot; podrás elegir tu pantalla completa, ventana o pestaña
                                            </p>
                                        </div>
                                    </div>

                                    {/* Previsualización estable de la burbuja sin parpadeo */}
                                    {settings.cameraEnabled && (
                                        <div className={`absolute ${
                                            settings.bubblePosition === "bottom-left" ? "bottom-4 left-4" :
                                            settings.bubblePosition === "bottom-right" ? "bottom-4 right-4" :
                                            settings.bubblePosition === "top-left" ? "top-4 left-4" : "top-4 right-4"
                                        } transition-all duration-300`}>
                                            <div className={`${
                                                settings.bubbleSize === "sm" ? "w-20 h-20 sm:w-24 sm:h-24" :
                                                settings.bubbleSize === "lg" ? "w-40 h-40 sm:w-52 sm:h-52" :
                                                "w-28 h-28 sm:w-36 sm:h-36"
                                            } rounded-full overflow-hidden border-3 border-primary shadow-2xl bg-slate-900 transition-all duration-300`}>
                                                {cameraStreamState ? (
                                                    <video
                                                        ref={(el) => {
                                                            if (el && cameraStreamState && el.srcObject !== cameraStreamState) {
                                                                el.srcObject = cameraStreamState;
                                                            }
                                                        }}
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        className={`w-full h-full object-cover ${settings.isMirrored ? "-scale-x-100" : ""}`}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/60 text-xs">
                                                        <Camera className="w-5 h-5 mb-1 text-primary" />
                                                        <span>Cámara</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="z-10 text-[10px] text-white/50 text-right font-mono">
                                        Composición en tiempo real 1080p @ 30fps
                                    </div>
                                </div>

                                {/* Barra compacta inferior de valor */}
                                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-card border border-border shadow-xs text-[11px] text-muted-foreground w-full shrink-0">
                                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                                        <Zap className="w-3.5 h-3.5 text-primary" />
                                        <span>Sin Almacenamiento</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                                        <Lock className="w-3.5 h-3.5 text-primary" />
                                        <span>100% Privado</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                        <span>Descarga Directa WebM</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 2: GUÍA Y CONSEJOS */}
            {activeTab === "guide" && (
                <div className="flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto space-y-4 py-2 pr-1 w-full">
                    <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-foreground">Cómo utilizar el Grabador de Pantalla</h2>
                                <p className="text-xs text-muted-foreground">Flujo de trabajo para grabaciones rápidas sin almacenamiento</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Descarga Inmediata
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Al terminar de grabar, el video se procesa en tu navegador y aparece inmediatamente listo para descargarse en formato WebM. No queda guardado en ninguna base de datos para no saturar tu equipo ni el servidor.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Grabación Full HD 1080p
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Captura tu pantalla con máxima nitidez y alta tasa de cuadros. Tu cámara web se superpone fluidamente sin comprometer la resolución.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Grabar Otras Pestañas
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Para alternar libremente entre pestañas de tu navegador o mostrar editores como VS Code, asegúrate de seleccionar &quot;Toda la pantalla&quot; en el selector de pantalla del navegador.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Audio Nítido
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    El audio del micrófono se mezcla de forma fluida con el audio del sistema si decides compartir también el sonido de tu computadora.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button
                                onClick={() => setActiveTab("studio")}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                                Ir al Estudio de Grabación
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Advertencia si el usuario eligió solo una pestaña */}
            <Dialog open={!!surfaceWarning?.open} onOpenChange={(open) => !open && handleResolveWarning(false)}>
                <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border/80">
                    <DialogHeader className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-base font-black text-foreground">
                            Has seleccionado solo una pestaña
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Has seleccionado <strong>{surfaceWarning?.surfaceType}</strong>. Con esta opción, solo se grabará esta pestaña del navegador. Si cambias de pestaña o abres programas externos (VS Code, terminal, escritorio), <strong>no se grabarán</strong>.
                            <br /><br />
                            Para grabar toda tu computadora y cualquier programa, debes elegir la pestaña <strong>&quot;Toda la pantalla&quot;</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveWarning(false)}
                            className="text-xs rounded-xl"
                        >
                            Continuar con esta pestaña
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolveWarning(true)}
                            className="text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20"
                        >
                            🖥️ Seleccionar Toda la Pantalla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

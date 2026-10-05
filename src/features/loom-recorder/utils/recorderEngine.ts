import { RecordingMode, BubblePosition, BubbleSize } from "../types";

export interface StreamCompositeConfig {
    mode: RecordingMode;
    screenStream: MediaStream | null;
    cameraStream: MediaStream | null;
    micStream: MediaStream | null;
    bubblePosition: BubblePosition;
    bubbleSize: BubbleSize;
    isMirrored: boolean;
    instructorName?: string;
}

export interface RecorderEngineCallbacks {
    onVolumeChange?: (volume: number) => void;
    onThumbnailReady?: (dataUrl: string) => void;
    onDataChunk?: (blob: Blob) => void;
    onError?: (err: Error) => void;
    onAutoStop?: () => void;
}

export class LoomRecorderEngine {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private animFrameId: number | null = null;
    private timerWorker: Worker | null = null;

    private screenVideoEl: HTMLVideoElement | null = null;
    private cameraVideoEl: HTMLVideoElement | null = null;

    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private volumeIntervalId: number | null = null;

    private compositeStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private cameraStream: MediaStream | null = null;
    private micStream: MediaStream | null = null;

    private callbacks: RecorderEngineCallbacks = {};
    private config: StreamCompositeConfig | null = null;

    constructor(callbacks: RecorderEngineCallbacks = {}) {
        this.callbacks = callbacks;
    }

    public getCompositeStream(): MediaStream | null {
        return this.compositeStream;
    }

    public async setupAudioAnalyser(stream: MediaStream): Promise<void> {
        try {
            if (this.audioContext && this.audioContext.state !== "closed") {
                await this.audioContext.close();
            }
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;

            this.audioContext = new AudioCtx();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);

            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            if (this.volumeIntervalId) window.clearInterval(this.volumeIntervalId);

            this.volumeIntervalId = window.setInterval(() => {
                if (!this.analyser) return;
                this.analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((average / 128) * 100));
                if (this.callbacks.onVolumeChange) {
                    this.callbacks.onVolumeChange(normalized);
                }
            }, 60);
        } catch (e) {
            console.warn("No se pudo iniciar el analizador de audio:", e);
        }
    }

    public updateBubbleConfig(position: BubblePosition, size: BubbleSize, isMirrored: boolean) {
        if (this.config) {
            this.config.bubblePosition = position;
            this.config.bubbleSize = size;
            this.config.isMirrored = isMirrored;
        }
    }

    // Web Worker con reloj de 30 FPS para evitar congelamiento de captura en pestañas secundarias
    private createTimerWorker(): Worker {
        const workerScript = `
            let timerId = null;
            self.onmessage = function(e) {
                if (e.data === "start") {
                    if (timerId) clearInterval(timerId);
                    timerId = setInterval(function() {
                        self.postMessage("tick");
                    }, 1000 / 30);
                } else if (e.data === "stop") {
                    if (timerId) {
                        clearInterval(timerId);
                        timerId = null;
                    }
                }
            };
        `;
        const blob = new Blob([workerScript], { type: "application/javascript" });
        return new Worker(URL.createObjectURL(blob));
    }

    public async startRecording(config: StreamCompositeConfig): Promise<void> {
        this.config = config;
        this.recordedChunks = [];
        this.screenStream = config.screenStream;
        this.cameraStream = config.cameraStream;
        this.micStream = config.micStream;

        let outputStream: MediaStream;

        if (config.mode === "cam-only" && config.cameraStream) {
            // Solo cámara directa con audio
            outputStream = new MediaStream([
                ...config.cameraStream.getVideoTracks(),
                ...(config.micStream ? config.micStream.getAudioTracks() : [])
            ]);
        } else if (config.mode === "screen-cam" && config.screenStream && config.cameraStream) {
            // Pantalla + Burbuja de cámara superpuesta mediante Compositor Canvas
            outputStream = this.createCompositeStream(config);
        } else if (config.screenStream) {
            // Solo pantalla directa en calidad nativa
            const mixedAudio = this.mixAudioStreams(config.screenStream, config.micStream);
            const audioTracks = mixedAudio ? mixedAudio.getAudioTracks() : [];
            outputStream = new MediaStream([
                ...config.screenStream.getVideoTracks(),
                ...audioTracks
            ]);
            this.compositeStream = outputStream;
        } else {
            throw new Error("No hay stream de video disponible para grabar");
        }

        // Detectar mimeType soportado
        const mimeTypes = [
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm",
            "video/mp4"
        ];
        let selectedMimeType = "";
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                selectedMimeType = type;
                break;
            }
        }

        const options: MediaRecorderOptions = {
            mimeType: selectedMimeType || undefined,
            videoBitsPerSecond: 4_000_000 // 4 Mbps para nitidez Full HD
        };

        this.mediaRecorder = new MediaRecorder(outputStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
                if (this.callbacks.onDataChunk) {
                    this.callbacks.onDataChunk(event.data);
                }
            }
        };

        if (config.screenStream) {
            const screenTrack = config.screenStream.getVideoTracks()[0];
            if (screenTrack) {
                screenTrack.onended = () => {
                    if (this.callbacks.onAutoStop) {
                        this.callbacks.onAutoStop();
                    }
                };
            }
        }

        // Mantener viva la pestaña con oscilador inaudible de audio en Chromium
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                if (!this.audioContext || this.audioContext.state === "closed") {
                    this.audioContext = new AudioCtx();
                }
                if (this.audioContext.state === "suspended") {
                    this.audioContext.resume().catch(() => {});
                }
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                gain.gain.value = 0.00001; // Inaudible
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.start();
            }
        } catch (e) {
            console.warn("Audio keep-alive warning:", e);
        }

        this.mediaRecorder.start(1000); // chunk cada 1 segundo

        window.setTimeout(() => {
            this.captureThumbnail();
        }, 1500);
    }

    private createCompositeStream(config: StreamCompositeConfig): MediaStream {
        // Fijar el lienzo Canvas en resolución Full HD estándar 1080p
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("No se pudo obtener el contexto 2D del Canvas");

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Ubicar en viewport activo para evitar que Chromium pause la rasterización por optimización
        canvas.style.position = "fixed";
        canvas.style.bottom = "0px";
        canvas.style.right = "0px";
        canvas.style.width = "4px";
        canvas.style.height = "4px";
        canvas.style.opacity = "0.01";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "-99998";
        document.body.appendChild(canvas);

        this.canvas = canvas;
        this.ctx = ctx;

        // Elemento de video para la pantalla
        const screenVideo = document.createElement("video");
        screenVideo.srcObject = config.screenStream;
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        screenVideo.autoplay = true;
        screenVideo.style.position = "fixed";
        screenVideo.style.bottom = "0px";
        screenVideo.style.right = "4px";
        screenVideo.style.width = "4px";
        screenVideo.style.height = "4px";
        screenVideo.style.opacity = "0.01";
        screenVideo.style.pointerEvents = "none";
        screenVideo.style.zIndex = "-99999";
        document.body.appendChild(screenVideo);
        screenVideo.play().catch(() => {});
        this.screenVideoEl = screenVideo;

        // Elemento de video para la cámara
        let cameraVideo: HTMLVideoElement | null = null;
        if (config.cameraStream) {
            cameraVideo = document.createElement("video");
            cameraVideo.srcObject = config.cameraStream;
            cameraVideo.muted = true;
            cameraVideo.playsInline = true;
            cameraVideo.autoplay = true;
            cameraVideo.style.position = "fixed";
            cameraVideo.style.bottom = "0px";
            cameraVideo.style.right = "8px";
            cameraVideo.style.width = "4px";
            cameraVideo.style.height = "4px";
            cameraVideo.style.opacity = "0.01";
            cameraVideo.style.pointerEvents = "none";
            cameraVideo.style.zIndex = "-99999";
            document.body.appendChild(cameraVideo);
            cameraVideo.play().catch(() => {});
            this.cameraVideoEl = cameraVideo;
        }

        const renderFrame = () => {
            if (!this.ctx || !this.canvas) return;

            // 1. Dibujar la pantalla capturada completa
            if (screenVideo && (screenVideo.readyState >= 2 || screenVideo.currentTime > 0)) {
                this.ctx.drawImage(screenVideo, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.ctx.fillStyle = "#0f172a";
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // 2. Dibujar burbuja de cámara circular
            if (cameraVideo && (cameraVideo.readyState >= 2 || cameraVideo.currentTime > 0)) {
                const bubbleRadius = this.getBubbleRadius(this.config?.bubbleSize || "md");
                const { cx, cy } = this.getBubbleCenter(
                    this.canvas.width, 
                    this.canvas.height, 
                    this.config?.bubblePosition || "bottom-left", 
                    bubbleRadius
                );

                this.ctx.save();
                this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
                this.ctx.shadowBlur = 24;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 6;

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, bubbleRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = "#1e293b";
                this.ctx.fill();
                this.ctx.clip();

                this.ctx.shadowColor = "transparent";

                const camW = cameraVideo.videoWidth || 1280;
                const camH = cameraVideo.videoHeight || 720;
                const camAspect = camW / camH;
                const diameter = bubbleRadius * 2;

                let drawW = diameter;
                let drawH = diameter;
                if (camAspect > 1) {
                    drawW = diameter * camAspect;
                } else {
                    drawH = diameter / camAspect;
                }

                if (this.config?.isMirrored) {
                    this.ctx.translate(cx, cy);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(cameraVideo, -drawW / 2, -drawH / 2, drawW, drawH);
                } else {
                    this.ctx.drawImage(cameraVideo, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
                }

                this.ctx.restore();

                // Borde circular elegante para la cámara
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, bubbleRadius, 0, Math.PI * 2);
                this.ctx.lineWidth = 5;
                this.ctx.strokeStyle = "#8b5cf6";
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, bubbleRadius - 2, 0, Math.PI * 2);
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
                this.ctx.stroke();
                this.ctx.restore();
            }
        };

        // Renderizado en primer plano
        const frameLoop = () => {
            if (!document.hidden) {
                renderFrame();
            }
            this.animFrameId = requestAnimationFrame(frameLoop);
        };
        this.animFrameId = requestAnimationFrame(frameLoop);

        // Renderizado en segundo plano
        this.timerWorker = this.createTimerWorker();
        this.timerWorker.onmessage = () => {
            if (document.hidden) {
                renderFrame();
            }
        };
        this.timerWorker.postMessage("start");

        if ("requestVideoFrameCallback" in screenVideo) {
            const onVideoFrame = () => {
                if (this.canvas && this.screenVideoEl) {
                    renderFrame();
                    (this.screenVideoEl as any).requestVideoFrameCallback(onVideoFrame);
                }
            };
            (screenVideo as any).requestVideoFrameCallback(onVideoFrame);
        }

        const canvasStream = canvas.captureStream(30);

        const mixedAudioStream = this.mixAudioStreams(config.screenStream, config.micStream);
        if (mixedAudioStream) {
            for (const track of mixedAudioStream.getAudioTracks()) {
                canvasStream.addTrack(track);
            }
        }

        this.compositeStream = canvasStream;
        return canvasStream;
    }

    private getBubbleRadius(size: BubbleSize): number {
        switch (size) {
            case "sm": return 90;
            case "lg": return 190;
            case "md":
            default: return 140;
        }
    }

    private getBubbleCenter(
        canvasW: number, 
        canvasH: number, 
        position: BubblePosition, 
        radius: number
    ): { cx: number; cy: number } {
        const margin = 48;
        switch (position) {
            case "bottom-right":
                return { cx: canvasW - radius - margin, cy: canvasH - radius - margin };
            case "top-left":
                return { cx: radius + margin, cy: radius + margin };
            case "top-right":
                return { cx: canvasW - radius - margin, cy: radius + margin };
            case "bottom-left":
            default:
                return { cx: radius + margin, cy: canvasH - radius - margin };
        }
    }

    private mixAudioStreams(screenStream: MediaStream | null, micStream: MediaStream | null): MediaStream | null {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return micStream || (screenStream ? new MediaStream(screenStream.getAudioTracks()) : null);

            const audioCtx = new AudioCtx();
            const destination = audioCtx.createMediaStreamDestination();
            let hasAudio = false;

            if (screenStream && screenStream.getAudioTracks().length > 0) {
                const screenAudio = audioCtx.createMediaStreamSource(new MediaStream(screenStream.getAudioTracks()));
                const screenGain = audioCtx.createGain();
                screenGain.gain.value = 0.8;
                screenAudio.connect(screenGain);
                screenGain.connect(destination);
                hasAudio = true;
            }

            if (micStream && micStream.getAudioTracks().length > 0) {
                const micAudio = audioCtx.createMediaStreamSource(new MediaStream(micStream.getAudioTracks()));
                const micGain = audioCtx.createGain();
                micGain.gain.value = 1.0;
                micAudio.connect(micGain);
                micGain.connect(destination);
                hasAudio = true;
            }

            return hasAudio ? destination.stream : null;
        } catch {
            return micStream || null;
        }
    }

    public captureThumbnail(): string {
        try {
            if (this.canvas) {
                const thumb = this.canvas.toDataURL("image/jpeg", 0.7);
                if (this.callbacks.onThumbnailReady) {
                    this.callbacks.onThumbnailReady(thumb);
                }
                return thumb;
            } else if (this.cameraVideoEl) {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = 480;
                tempCanvas.height = 270;
                const ctx = tempCanvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(this.cameraVideoEl, 0, 0, 480, 270);
                    const thumb = tempCanvas.toDataURL("image/jpeg", 0.7);
                    if (this.callbacks.onThumbnailReady) {
                        this.callbacks.onThumbnailReady(thumb);
                    }
                    return thumb;
                }
            }
        } catch (e) {
            console.warn("No se pudo capturar miniatura:", e);
        }
        return "";
    }

    public pause(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
            this.mediaRecorder.pause();
        }
    }

    public resume(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
            this.mediaRecorder.resume();
        }
    }

    public async stop(): Promise<Blob> {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
                const finalBlob = new Blob(this.recordedChunks, { type: "video/webm" });
                this.cleanup();
                return resolve(finalBlob);
            }

            this.mediaRecorder.onstop = () => {
                const mimeType = this.mediaRecorder?.mimeType || "video/webm";
                const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
                this.cleanup();
                resolve(finalBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    public cleanup(): void {
        if (this.timerWorker) {
            this.timerWorker.postMessage("stop");
            this.timerWorker.terminate();
            this.timerWorker = null;
        }

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.volumeIntervalId) {
            window.clearInterval(this.volumeIntervalId);
            this.volumeIntervalId = null;
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }

        if (this.screenVideoEl) {
            this.screenVideoEl.pause();
            this.screenVideoEl.srcObject = null;
            if (this.screenVideoEl.parentNode) {
                this.screenVideoEl.parentNode.removeChild(this.screenVideoEl);
            }
            this.screenVideoEl = null;
        }

        if (this.cameraVideoEl) {
            this.cameraVideoEl.pause();
            this.cameraVideoEl.srcObject = null;
            if (this.cameraVideoEl.parentNode) {
                this.cameraVideoEl.parentNode.removeChild(this.cameraVideoEl);
            }
            this.cameraVideoEl = null;
        }

        if (this.compositeStream) {
            this.compositeStream.getTracks().forEach((t) => t.stop());
            this.compositeStream = null;
        }

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        this.canvas = null;
        this.ctx = null;
    }
}

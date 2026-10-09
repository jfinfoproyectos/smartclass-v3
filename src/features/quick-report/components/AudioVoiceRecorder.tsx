"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  UploadCloud, 
  Link as LinkIcon, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileAudio,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AudioVoiceRecorderProps {
  onAudioReady: (audioData: {
    base64?: string;
    mimeType?: string;
    fileName?: string;
    url?: string;
    durationSec?: number;
  } | null) => void;
  onLiveTranscript: (text: string) => void;
}

export function AudioVoiceRecorder({ onAudioReady, onLiveTranscript }: AudioVoiceRecorderProps) {
  const [activeTab, setActiveTab] = useState<"mic" | "upload" | "url">("mic");

  // Estados de Grabación en Vivo
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedFileName, setRecordedFileName] = useState<string | null>(null);

  // Web Speech API
  const [liveTranscriptActive, setLiveTranscriptActive] = useState(true);
  const speechRecognitionRef = useRef<any>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estados de Subida de Archivo
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Estados de URL de Audio
  const [audioUrlInput, setAudioUrlInput] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(false);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
      if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Formato mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Convertir Blob a Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Iniciar reconocimiento de voz Web Speech API
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-CO"; // Español Colombia / Latinoamérica

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        if (fullTranscript.trim()) {
          onLiveTranscript(fullTranscript.trim());
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("[SpeechRecognition] Error o silencio:", e.error);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn("[SpeechRecognition] No se pudo inicializar:", err);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
  };

  // Iniciar Grabación con Micrófono
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determinar MIME soportado
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlobUrl(url);

        const fileName = `grabacion-docente-${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
        setRecordedFileName(fileName);

        const base64 = await blobToBase64(audioBlob);
        onAudioReady({
          base64,
          mimeType,
          fileName,
          durationSec: recordSeconds,
        });

        toast.success("Audio grabado listo para procesar con IA");
      };

      recorder.start(500); // chunks cada 500ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);

      if (liveTranscriptActive) {
        startSpeechRecognition();
      }

      toast.info("Grabando... Habla tus ideas, novedades o desarrollo de la clase.");
    } catch (err: any) {
      console.error("Error accediendo al micrófono:", err);
      toast.error("No se pudo acceder al micrófono. Por favor permite los permisos de audio.");
    }
  };

  // Pausar / Reanudar
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Detener Grabación
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    stopSpeechRecognition();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Limpiar Grabación
  const clearRecording = () => {
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    setRecordedBlobUrl(null);
    setRecordedFileName(null);
    setRecordSeconds(0);
    onAudioReady(null);
  };

  // Manejar Subida de Archivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
      toast.error("Por favor selecciona un archivo de audio válido (.mp3, .wav, .m4a, .webm, .ogg)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("El archivo excede el límite máximo de 25 MB.");
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedFileUrl(url);

    const base64 = await blobToBase64(file);
    onAudioReady({
      base64,
      mimeType: file.type || "audio/mp3",
      fileName: file.name,
    });

    toast.success(`Audio "${file.name}" cargado con éxito.`);
  };

  const clearUploadedFile = () => {
    if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    onAudioReady(null);
  };

  // Manejar URL de Audio
  const handleUrlSubmit = () => {
    const clean = audioUrlInput.trim();
    if (!clean) return;

    const isValid = /(?:vocaroo\.com|drive\.google\.com|\.(mp3|wav|ogg|m4a|aac|flac|webm))/i.test(clean);
    if (!isValid) {
      toast.error("Ingresa un enlace de audio válido (Vocaroo, Google Drive o archivo mp3/wav directo).");
      return;
    }

    setIsUrlValid(true);
    onAudioReady({
      url: clean,
      fileName: "Audio desde enlace externo",
    });

    toast.success("Enlace de audio configurado correctamente.");
  };

  const clearAudioUrl = () => {
    setAudioUrlInput("");
    setIsUrlValid(false);
    onAudioReady(null);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Entrada de Audio & Dictado por Voz
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Habla libremente, graba tu voz o sube un audio para que la IA lo escuche y redacte.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-semibold gap-1 text-primary border-primary/20 bg-primary/5">
          <Sparkles className="h-3 w-3" />
          Multimodal Gemini
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-8.5 bg-muted/60 p-0.5 rounded-xl">
          <TabsTrigger value="mic" className="text-[11px] font-semibold gap-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <Mic className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="truncate">Micrófono</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-[11px] font-semibold gap-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <UploadCloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Subir Audio</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="text-[11px] font-semibold gap-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <LinkIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">Enlace Web</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GRABAR MICRÓFONO */}
        <TabsContent value="mic" className="mt-2.5 space-y-2.5">
          {!recordedBlobUrl ? (
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
              {/* Visualizador de pulsos */}
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-2 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <Button
                  type="button"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-14 w-14 rounded-full transition-all duration-300 shadow-md ${
                    isRecording
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
              </div>

              {isRecording ? (
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                      {formatTime(recordSeconds)}
                    </span>
                    {isPaused && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                        Pausado
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Habla claramente. El audio se grabará y las palabras se transcribirán en tiempo real.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={togglePauseRecording}
                      className="h-7 text-xs rounded-lg"
                    >
                      {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                      {isPaused ? "Reanudar" : "Pausar"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={stopRecording}
                      className="h-7 text-xs rounded-lg"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Terminar Grabación
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Presiona el micrófono para iniciar la grabación
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Ideal para dictar ideas en el pasillo, tras terminar la clase o al salir de un comité.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Audio grabado listo */
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-600">
                    <FileAudio className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {recordedFileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Duración: {formatTime(recordSeconds)} • Listo para el LLM
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearRecording}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                  title="Eliminar y volver a grabar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <audio src={recordedBlobUrl} controls className="w-full h-8 rounded-lg" />
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SUBIR ARCHIVO */}
        <TabsContent value="upload" className="mt-3 space-y-3">
          {!uploadedFile ? (
            <label className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors space-y-2">
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs font-bold text-foreground">
                  Arrastra tu archivo o haz clic para seleccionarlo
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Soporta MP3, WAV, M4A, OGG, WEBM (Hasta 25 MB)
                </p>
              </div>
            </label>
          ) : (
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600">
                    <FileAudio className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground truncate max-w-[220px]">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type || "audio"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearUploadedFile}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                  title="Quitar archivo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {uploadedFileUrl && (
                <audio src={uploadedFileUrl} controls className="w-full h-8 rounded-lg" />
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: ENLACE / VOCAROO */}
        <TabsContent value="url" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={audioUrlInput}
                onChange={(e) => {
                  setAudioUrlInput(e.target.value);
                  setIsUrlValid(false);
                }}
                placeholder="https://vocaroo.com/... o enlace de Google Drive / MP3 directo"
                className="h-8 text-xs bg-muted/40 rounded-xl"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!audioUrlInput.trim()}
                className="h-8 text-xs rounded-xl shrink-0"
              >
                Vincular
              </Button>
            </div>

            {isUrlValid && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{audioUrlInput}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearAudioUrl}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Tip: Puedes grabar en Vocaroo.com en tu celular y pegar aquí el enlace de 8 caracteres.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

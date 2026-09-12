"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  CheckCircle2, 
  FolderPlus,
  Copy,
  Check,
  RotateCcw,
  Send,
  Sparkle,
  MessageSquareQuote,
  Layers,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MDEditor from "@uiw/react-md-editor";
import type { CourseStructureData } from "../../actions/adminDocsActions";
import { 
  generateCourseStructureProposalAction, 
  refineCourseStructureProposalAction, 
  createProjectFromStructureAction 
} from "../../actions/adminDocsActions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

const STRUCTURE_CHIPS = [
  "➕ Añadir módulo de proyecto integrador",
  "⚡ Dividir en más tópicos progresivos",
  "📝 Reducir y sintetizar a menos semanas",
  "🔥 Subir el nivel técnico y exigencia",
  "🛡️ Añadir módulo de pruebas y testing",
  "🔄 Reorganizar orden de los temas"
];

export function CreateAiProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Estructura y previsualización
  const [structure, setStructure] = useState<CourseStructureData | null>(null);
  const [markdownPreview, setMarkdownPreview] = useState<string | null>(null);
  const [historyVersions, setHistoryVersions] = useState<CourseStructureData[]>([]);
  const [previewTab, setPreviewTab] = useState<"rendered" | "raw">("rendered");
  const [copied, setCopied] = useState(false);

  // Chat de adaptación
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Auto scroll en el chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isRefining]);

  const handleInitialGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor ingresa un nombre para el proyecto o curso");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Por favor ingresa las temáticas o requerimientos del curso");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateCourseStructureProposalAction(name, prompt);
      if (res.success && res.structure) {
        setStructure(res.structure);
        setMarkdownPreview(res.markdownPreview);
        setHistoryVersions([res.structure]);
        setChatMessages([
          {
            id: "welcome-structure-msg",
            role: "assistant",
            text: `He diseñado la propuesta del plan de estudios con ${res.structure.topics.length} tópicos y ${res.structure.topics.reduce((acc, t) => acc + t.documents.length, 0)} lecciones. Puedes pedirme cualquier ajuste: por ejemplo, agregar más módulos, reducir la duración, cambiar el orden o profundizar en algún concepto.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        toast.success("Estructura propuesta generada. Ahora puedes ajustarla con el chat.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Error al estructurar el curso");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineChat = async (customInstruction?: string) => {
    const instructionToSend = (customInstruction || chatInput).trim();
    if (!instructionToSend || !structure || isRefining) return;

    const userMsgId = `user-${Date.now()}`;
    const newChatMessages: ChatMessage[] = [
      ...chatMessages,
      {
        id: userMsgId,
        role: "user",
        text: instructionToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setChatMessages(newChatMessages);
    setChatInput("");
    setIsRefining(true);

    try {
      const res = await refineCourseStructureProposalAction(structure, instructionToSend);
      if (res.success && res.structure) {
        setStructure(res.structure);
        setMarkdownPreview(res.markdownPreview);
        setHistoryVersions(prev => [...prev, res.structure]);

        const totalDocs = res.structure.topics.reduce((acc, t) => acc + t.documents.length, 0);
        setChatMessages([
          ...newChatMessages,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: `He actualizado la estructura según tu indicación. Ahora el curso cuenta con ${res.structure.topics.length} tópicos y ${totalDocs} lecciones. ¿Deseas hacer algún otro ajuste?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        toast.success("Estructura actualizada con éxito");
      }
    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar la estructura");
      setChatMessages([
        ...newChatMessages,
        {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ Hubo un inconveniente al procesar el cambio: ${error?.message || "Intenta formularlo con otra frase."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCommitProject = async () => {
    if (!structure) return;
    setIsCreating(true);
    const toastId = toast.loading("Creando tópicos y documentos en la base de datos...", {
      description: "Inicializando el proyecto en SmartClass..."
    });

    try {
      const res = await createProjectFromStructureAction(name, structure);
      if (res.success && res.slug) {
        toast.success("¡Proyecto creado con éxito con toda la jerarquía de tópicos y documentos!", { id: toastId });
        setIsOpen(false);
        router.push(`/dashboard/teacher/docs/${res.slug}`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Error al crear el proyecto en el sistema", { id: toastId });
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (!markdownPreview) return;
    navigator.clipboard.writeText(markdownPreview);
    setCopied(true);
    toast.success("Estructura copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStructure(null);
    setMarkdownPreview(null);
    setHistoryVersions([]);
    setChatMessages([]);
  };

  const totalLessons = structure 
    ? structure.topics.reduce((acc, t) => acc + t.documents.length, 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        handleReset();
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-bold rounded-xl shadow-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 cursor-pointer" title="Generar estructura completa del curso (tópicos y documentos) con IA y chat de ajuste">
          <Sparkles className="w-4 h-4 mr-1.5 animate-pulse text-primary shrink-0" />
          <span>Estructura con IA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className={
        structure 
          ? "sm:max-w-4xl md:max-w-5xl lg:max-w-7xl w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/70"
          : "sm:max-w-[560px] max-h-[90vh] overflow-y-auto border-border bg-background shadow-2xl p-6 rounded-2xl flex flex-col gap-4 custom-scrollbar"
      }>
        <DialogHeader className={structure ? "p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20" : ""}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                  Estructura de Curso con IA
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {structure
                    ? "Revisa la jerarquía propuesta de tópicos y lecciones. Usa el chat de la derecha para adaptarla antes de confirmarla."
                    : "Define el nombre y temática del curso. La IA diseñará la jerarquía organizada de tópicos y documentos para que la ajustes conversando."}
                </DialogDescription>
              </div>
            </div>

            {structure && (
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{structure.topics.length} Tópicos • {totalLessons} Lecciones</span>
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        {structure ? (
          /* VISTA EN 2 COLUMNAS: PREVIA DE LA ESTRUCTURA (IZQUIERDA) + CHAT DE AJUSTE (DERECHA) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Columna Izquierda: Vista Previa del Plan de Estudios (7 de 12 col) */}
              <div className="lg:col-span-7 flex flex-col space-y-2.5">
                <div className="flex items-center justify-between bg-muted/30 border border-border/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="text-[10px] font-mono gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Versión #{historyVersions.length}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono bg-primary/10 text-primary">
                      {structure.topics.length} Tópicos
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleReset}
                      className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Reiniciar con otro prompt"
                    >
                      <Sparkles className="h-3 w-3" />
                      Nuevo Prompt
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="h-7 text-xs px-2.5 gap-1 shadow-2xs cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>

                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-foreground">Plan de Estudios Propuesto</span>
                    <TabsList className="h-6.5 bg-muted/80 p-0.5">
                      <TabsTrigger value="rendered" className="text-[10px] h-5.5 px-2 font-semibold">
                        Visualización
                      </TabsTrigger>
                      <TabsTrigger value="raw" className="text-[10px] h-5.5 px-2 font-semibold">
                        Código
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="rendered" className="mt-0 flex-1">
                    <div className="border border-border/80 rounded-xl p-4 bg-background h-[460px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed shadow-inner custom-scrollbar">
                      <MDEditor.Markdown source={markdownPreview || ""} />
                    </div>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-0 flex-1">
                    <pre className="border border-border/80 rounded-xl p-3.5 bg-muted/40 font-mono text-[11px] h-[460px] overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar text-foreground">
                      {markdownPreview}
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Columna Derecha: Chat Interactivo de Adaptación (5 de 12 col) */}
              <div className="lg:col-span-5 flex flex-col h-[520px] bg-card border border-border/70 rounded-2xl p-3.5 space-y-3 shadow-xs">
                {/* Cabecera del Chat */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <MessageSquareQuote className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">Chat de Adaptación</h4>
                      <p className="text-[10px] text-muted-foreground">Pide ajustes continuos a la IA antes de crear el curso</p>
                    </div>
                  </div>
                </div>

                {/* Historial de Mensajes */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-xs">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/60 text-foreground border border-border/50 rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed text-[11px]">{msg.text}</p>
                        <span
                          className={`text-[9px] mt-1 block ${
                            msg.role === "user" ? "text-primary-foreground/75 text-right" : "text-muted-foreground"
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isRefining && (
                    <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/40 text-muted-foreground animate-pulse text-[11px]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Adaptando estructura del curso...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Atajos Rápidos */}
                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Sparkle className="h-3 w-3 text-amber-500" /> Atajos rápidos:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {STRUCTURE_CHIPS.map((chip, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={isRefining}
                        onClick={() => handleRefineChat(chip)}
                        className="text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/60 hover:border-primary/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caja de Entrada del Chat */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pide ajustes al temario... (ej: agrega un módulo de Room, divide el tema de Compose en 2, o acorta a 6 semanas)"
                      disabled={isRefining}
                      rows={2}
                      className="text-xs resize-none pr-10 min-h-[64px] bg-background leading-relaxed"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleRefineChat();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleRefineChat()}
                      disabled={!chatInput.trim() || isRefining}
                      className="absolute right-1.5 bottom-1.5 h-7 w-7 p-0 bg-primary text-primary-foreground rounded-lg shadow-xs cursor-pointer"
                    >
                      {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <span className="text-[9px] text-muted-foreground block text-right">
                    Presiona Enter para enviar
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* FORMULARIO INICIAL DE SOLICITUD */
          <form onSubmit={handleInitialGenerate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ai-project-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nombre del Curso / Proyecto
              </Label>
              <Input 
                id="ai-project-name"
                placeholder="Ejemplo: Desarrollo Móvil con Kotlin y Jetpack Compose"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20 h-11 text-sm leading-relaxed"
                disabled={isGenerating}
                required
              />
            </div>
   
            <div className="space-y-2">
              <Label htmlFor="ai-project-prompt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Temática del Curso y Módulos a Estructurar
              </Label>
              <Textarea 
                id="ai-project-prompt"
                placeholder="Ejemplo: Curso de 10 semanas para ingeniería. Incluir módulos progresivos: 1. Sintaxis de Kotlin y POO, 2. Fundamentos de Jetpack Compose y estado, 3. Arquitectura MVVM y ViewModel, 4. Corrutinas y Flows, 5. Persistencia con Room y consumo de APIs REST."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[140px] max-h-[260px] overflow-y-auto bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20 text-sm leading-relaxed custom-scrollbar"
                disabled={isGenerating}
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>¿Cómo funciona el flujo de trabajo?</span>
              </div>
              <p className="leading-relaxed">
                1. La IA generará una primera propuesta de temario y abrirá un <strong>chat interactivo</strong> para que ajustes los tópicos y lecciones a tu gusto.
              </p>
              <p className="leading-relaxed">
                2. Solo cuando estés 100% conforme con la estructura, confirmas para crear el proyecto y comenzar a redactar los documentos.
              </p>
            </div>
   
            <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                disabled={isGenerating}
                className="flex-1 sm:flex-initial"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isGenerating || !name.trim() || !prompt.trim()}
                className="shadow-md hover:shadow-lg transition-all active:scale-95 flex-1 gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Diseñando estructura...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Diseñar Estructura con IA</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {structure && (
          <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-muted/10 gap-2 flex-row justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isRefining || isCreating}
              className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reiniciar con otro Prompt
            </Button>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(false)} 
                disabled={isRefining || isCreating} 
                className="text-xs h-8 cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleCommitProject}
                disabled={isRefining || isCreating}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creando Proyecto...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Crear Proyecto con esta Estructura
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

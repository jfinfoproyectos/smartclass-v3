"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  Plus, 
  Wand2, 
  RefreshCcw, 
  CheckCircle2 
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
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateDocContentAction } from "../../actions/adminDocsActions";

interface AiDocGenerateDialogProps {
  content: string;
  onContentChange: (newContent: string) => void;
}

export function AiDocGenerateDialog({ content, onContentChange }: AiDocGenerateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"append" | "replace" | "integrate" | "improve">("improve");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Por favor ingresa una instrucción para la IA");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateDocContentAction(prompt, content, mode);
      if (res.success && res.content) {
        if (mode === "replace" || mode === "integrate" || mode === "improve") {
          onContentChange(res.content);
          if (mode === "improve") {
            toast.success("Documento mejorado y expandido con éxito");
          } else {
            toast.success(mode === "integrate" ? "Documento adaptado y fusionado con éxito" : "Documento reemplazado con éxito");
          }
        } else {
          onContentChange(content ? `${content}\n\n${res.content}` : res.content);
          toast.success("Contenido agregado al final con éxito");
        }
        setIsOpen(false);
        setPrompt("");
      } else {
        toast.error("No se pudo generar el contenido");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al generar el documento");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shrink-0 opacity-60 hover:opacity-100"
          title="Generar con IA"
        >
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px] border-border bg-background shadow-2xl p-6 rounded-2xl flex flex-col gap-4 max-h-[90vh]">
        {/* Semantic accessibility tags */}
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Generador de Docs con IA
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Usa el LLM para expandir, corregir o escribir contenido para el documento actual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ¿Qué deseas que la IA haga?
            </Label>
            <Textarea 
              id="ai-prompt"
              placeholder="Ejemplo: Agrega una sección completa que explique cómo configurar variables de entorno para producción, o genera una guía sobre migraciones de bases de datos."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20 text-sm leading-relaxed"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-mode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Modo de inserción
            </Label>
            <Select value={mode} onValueChange={(val: any) => setMode(val)}>
              <SelectTrigger id="ai-mode" className="bg-muted/20 border-border focus:ring-primary/20 rounded-xl h-11 text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-xl">
                <SelectItem value="improve" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mejorar y expandir el documento actual</span>
                  </div>
                </SelectItem>
                <SelectItem value="integrate" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>Fusionar e integrar con el documento actual</span>
                  </div>
                </SelectItem>
                <SelectItem value="append" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>Agregar al final</span>
                  </div>
                </SelectItem>
                <SelectItem value="replace" className="text-sm font-medium cursor-pointer">
                  <div className="flex items-center gap-2">
                    <RefreshCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reemplazar todo el contenido</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)} 
            disabled={isGenerating}
            className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-border bg-muted/20 hover:bg-muted/30 transition-all flex-1 sm:flex-initial"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
            className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex-1 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ejecutar generación</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  CheckCircle2,
  FolderPlus 
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateFullProjectAction } from "../../actions/adminDocsActions";

export function CreateAiProjectDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor ingresa un nombre para el proyecto");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Por favor ingresa una instrucción o temática");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateFullProjectAction(name, prompt);
      if (res.success && res.slug) {
        toast.success("¡Proyecto generado con éxito!");
        setIsOpen(false);
        setName("");
        setPrompt("");
        router.push(`/dashboard/teacher/docs/${res.slug}`);
      } else {
        toast.error("No se pudo generar el proyecto");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al generar el proyecto de documentación");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all active:scale-95">
          <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform animate-pulse text-primary" />
          Nueva Doc con IA
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto border-border bg-background shadow-2xl p-6 rounded-2xl flex flex-col gap-4 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Crear Documentación con IA
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground">
            Suministra la temática completa de tu curso o manual y la IA creará toda la estructura y los documentos por ti.
          </DialogDescription>
        </DialogHeader>
 
        <form onSubmit={handleGenerate} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ai-project-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nombre del Proyecto
            </Label>
            <Input 
              id="ai-project-name"
              placeholder="Ejemplo: Python Avanzado"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20 h-11 text-sm leading-relaxed"
              disabled={isGenerating}
              required
            />
          </div>
 
          <div className="space-y-2">
            <Label htmlFor="ai-project-prompt" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Temática y Estructura a Generar
            </Label>
            <Textarea 
              id="ai-project-prompt"
              placeholder="Ejemplo: Crea la estructura completa para un curso de Python. Debe incluir un Inicio, una sección de Semana 1 sobre el ciclo FOR, Semana 2 sobre Listas, y Semana 3 sobre Diccionarios."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px] max-h-[300px] overflow-y-auto bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20 text-sm leading-relaxed custom-scrollbar"
              disabled={isGenerating}
              required
            />
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
              className="shadow-md hover:shadow-lg transition-all active:scale-95 flex-1 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando proyecto...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Generar Todo el Proyecto</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

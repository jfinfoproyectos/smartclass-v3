"use client";

import { useState, useTransition } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createProjectAction } from "@/features/documentation/actions/adminDocsActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) return;

    startTransition(async () => {
      try {
        const result = await createProjectAction(name);
        if (result.success) {
          toast.success("Proyecto creado exitosamente");
          setOpen(false);
          setName("");
          router.push(`/dashboard/teacher/docs/${result.id}`);
        } else {
          toast.error("No se pudo crear el proyecto");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al crear proyecto");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 rounded-full px-5 font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all group text-[9px] gap-2 active:scale-95">
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
          Nueva Doc
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">Nueva Documentación</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ingresa el nombre para el nuevo proyecto de documentación. Se creará una entrada en la base de datos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest ml-1">Nombre del Proyecto</Label>
            <Input
              id="name"
              placeholder="Ej: Curso de React, Manual Técnico"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-muted/20 border-border focus:border-primary/50 transition-all rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || isPending}
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Crear Proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

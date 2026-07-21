"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
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
import { deleteProjectAction } from "@/features/documentation/actions/adminDocsActions";
import { toast } from "sonner";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteProjectDialog({ 
  projectId, 
  projectName, 
  iconOnly = false, 
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: DeleteProjectDialogProps & { iconOnly?: boolean }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteProjectAction(projectId);
      if (res.success) {
        toast.success(`Proyecto "${projectName}" eliminado exitosamente`);
        setOpen(false);
      } else {
        toast.error("No se pudo eliminar el proyecto");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el proyecto");
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultTrigger = (
    <DialogTrigger asChild>
      {iconOnly ? (
        <Button 
          size="icon" 
          variant="outline" 
          className="h-9 w-9 border-border/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all active:scale-95 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span className="sr-only">Eliminar</span>
        </Button>
      ) : (
        <Button 
          size="sm" 
          variant="ghost" 
          className="gap-2 h-9 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 px-3"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Eliminar</span>
        </Button>
      )}
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        controlledOpen === undefined ? defaultTrigger : null
      )}
      
      <DialogContent className="sm:max-w-[425px] bg-background border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Eliminar Proyecto
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
            ¿Estás seguro de que deseas eliminar el proyecto <strong className="text-foreground">"{projectName}"</strong>? Esta acción borrará permanentemente el proyecto y todas sus páginas asociadas, y no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
 
        <DialogFooter className="mt-2 flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={isDeleting}
            className="flex-1 sm:flex-initial"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={isDeleting}
            variant="destructive"
            className="flex-1 sm:flex-initial gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Definitivamente</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

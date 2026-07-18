"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { enrollByCodeAction } from "@/features/student/actions/enrollmentActions";
import { useRouter } from "next/navigation";

export function EnrollCourseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollCode || enrollCode.trim().length !== 6) {
      toast.error("El código debe tener 6 caracteres");
      return;
    }
    setIsLoading(true);
    try {
      const res = await enrollByCodeAction(enrollCode);
      toast.success(`Inscrito correctamente en: ${res.courseName}`);
      setOpen(false);
      setEnrollCode("");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error al inscribirse");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Inscribirse a un curso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscribirse a un curso</DialogTitle>
          <DialogDescription>
            Ingresa el código de 6 caracteres proporcionado por tu profesor para inscribirte en el curso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEnroll} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enroll-code" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
              Código de Inscripción
            </Label>
            <Input
              id="enroll-code"
              placeholder="Ej: ABC123"
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center font-mono text-lg tracking-widest bg-muted/30 focus-visible:ring-primary/50"
              required
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading ? "Inscribiendo..." : "Inscribirse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

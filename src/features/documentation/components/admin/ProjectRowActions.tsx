"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Edit3, 
  Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DeleteProjectDialog } from "./DeleteProjectDialog";

interface ProjectRowActionsProps {
  projectId: string;
  projectName: string;
  projectSlug: string;
}

export function ProjectRowActions({ projectId, projectName, projectSlug }: ProjectRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon" variant="outline" className="h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300">
            <Link href={`/docs/${projectSlug}`}>
              <BookOpen className="w-4 h-4" />
              <span className="sr-only">Abrir Documentación</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Abrir documentación</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon" variant="outline" className="h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300">
            <Link href={`/dashboard/teacher/docs/${projectSlug}`}>
              <Edit3 className="w-4 h-4" />
              <span className="sr-only">Editar Proyecto</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Editar proyecto</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            size="icon" 
            variant="outline" 
            className="h-9 w-9 border-border/50 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200/60 dark:border-red-800/40 transition-all duration-300"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            <span className="sr-only">Eliminar Proyecto</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Eliminar proyecto</p>
        </TooltipContent>
      </Tooltip>

      <DeleteProjectDialog 
        projectId={projectId} 
        projectName={projectName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

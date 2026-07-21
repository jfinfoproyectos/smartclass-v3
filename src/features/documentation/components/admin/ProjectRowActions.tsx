"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Edit3, 
  MoreVertical, 
  Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
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
          <p className="text-[10px] font-bold uppercase tracking-wider">Abrir Documentación</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300">
            <MoreVertical className="w-4 h-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-background border-border rounded-xl shadow-xl">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href={`/dashboard/teacher/docs/${projectSlug}`}>
              <Edit3 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Editar</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              setDropdownOpen(false);
              setDeleteOpen(true);
            }} 
            className="text-red-600 focus:text-red-700 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteProjectDialog 
        projectId={projectId} 
        projectName={projectName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

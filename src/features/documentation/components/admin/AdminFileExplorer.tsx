"use client";

import React, { useState } from "react";
import { 
  Folder as FolderIcon, 
  FolderOpen, 
  File as FileIcon, 
  ChevronRight, 
  FileText, 
  Plus, 
  Trash2, 
  MoreVertical,
  Edit2,
  FilePlus,
  FolderPlus,
  Search,
  Hash,
  AlertCircle,
  FileCode2,
  Library,
  Copy,
  FolderTree,
  Terminal as TerminalIcon,
  Globe,
  ChevronUp,
  ChevronDown,
  Bookmark,
  EyeOff,
  CalendarClock,
  CalendarCheck,
  ArrowLeft,
  Settings2,
  Upload,
  Download
} from "lucide-react";
import JSZip from "jszip";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FileNode } from "@/features/documentation/services/admin-docs";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  createItemAction, 
  deleteItemAction, 
  renameItemAction, 
  moveItemAction, 
  reorderItemAction, 
  moveAndReorderAction,
  updatePageMetadataAction,
  exportProjectAction
} from "@/features/documentation/actions/adminDocsActions";
import { toast } from "sonner";

import { Separator } from "@/components/ui/separator";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DynamicIcon from "../DynamicIcon";

interface AdminFileExplorerProps {
  projectId: string;
  tree: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onTreeChange: () => void;
}

type DialogType = 'file' | 'folder' | 'rename' | 'delete' | 'settings' | null;

export function AdminFileExplorer({ 
  projectId, 
  tree, 
  selectedPath, 
  onSelect, 
  onTreeChange 
}: AdminFileExplorerProps) {
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<{
    type: DialogType;
    parentPath: string;
    nodeType?: 'file' | 'folder';
    itemName?: string;
    itemSha?: string;
  }>({ type: null, parentPath: projectId });
  
  const [inputValue, setInputValue] = useState("");
  const [inputPrefix, setInputPrefix] = useState("");
  const [dialogData, setDialogData] = useState({
    isSettingsOpen: false,
    draft: false,
    date: "",
    icon: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    const targetParent = dialogState.parentPath;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.md')) continue;

      try {
        const text = await file.text();
        const baseName = file.name.replace(/\.md$/i, '');
        
        // Use the numeric prefix if it exists to set the order
        const match = baseName.match(/^(\d+)-(.*)$/);
        const order = match ? match[1] : undefined;
        const title = match ? match[2].split(/[ \-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : baseName.split(/[ \-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const finalName = baseName.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');

        await createItemAction(
          projectId,
          targetParent,
          finalName,
          'file',
          { title, order },
          text
        );
        successCount++;
      } catch (err) {
        console.error("Error importing file:", file.name, err);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`¡${successCount} archivos importados con éxito!`);
      onTreeChange();
    }
    if (errorCount > 0) {
      toast.error(`Error al importar ${errorCount} archivos.`);
    }

    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportProject = async () => {
    try {
      setIsSubmitting(true);
      const toastId = toast.loading("Preparando archivos para exportar...");
      
      const pages = await exportProjectAction(projectId);
      
      const zip = new JSZip();
      
      pages.forEach((page: any) => {
        // Construct file path: add .md extension if not index
        const isTopic = page.slug === 'index' || page.slug.endsWith('/index');
        let filePath = page.slug;
        if (!filePath.endsWith('.md')) {
          filePath = isTopic ? `${filePath}.md` : `${filePath}.md`; // Simple appending, if you want exact GitHub structure you could make topics folders with index.md
        }
        
        // Frontmatter synthesis
        const frontmatter = `---
title: "${page.title}"
draft: ${page.draft ? 'true' : 'false'}
${page.publishDate ? `date: "${page.publishDate}"` : ''}
---
`;
        const fileContent = frontmatter + '\n' + (page.content || '');
        
        zip.file(filePath, fileContent);
      });
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId}-export.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("¡Exportación completada!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar el proyecto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTree = tree.filter(node => 
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    (node.children && node.children.some(c => c.name.toLowerCase().includes(search.toLowerCase())))
  );

  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const toLocalISO = (date: string | Date | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const toUTCISO = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  };

  const handleOpenDialog = (type: DialogType, parentPath: string, nodeType?: 'file' | 'folder', currentName?: string, sha?: string, extraData?: any) => {
    setDialogState({ type, parentPath, nodeType, itemName: currentName, itemSha: sha });
    
    if (type === 'file' || type === 'folder') {
      const siblings = parentPath === projectId ? tree : findNodeByPath(tree, parentPath)?.children || [];
      const prefixes = siblings
        .map(s => parseInt(s.name.split('-')[0]))
        .filter(n => !isNaN(n));
      const nextNum = prefixes.length > 0 ? Math.max(...prefixes) + 1 : 1;
      setInputPrefix(nextNum.toString().padStart(2, '0'));
      setInputValue("");
    } else if (type === 'settings') {
      setInputValue(extraData?.title || currentName || "");
      setDialogData({
        ...dialogData,
        draft: extraData?.draft || false,
        date: toLocalISO(extraData?.publishDate),
        icon: extraData?.icon || ""
      });
    } else {
      setInputValue(currentName || "");
      setInputPrefix("");
    }
  };

  const handleConfirm = async () => {
    if (!dialogState.type) return;
    setIsSubmitting(true);
    
    try {
      if (dialogState.type === 'file' || dialogState.type === 'folder') {
        if (!inputValue) throw new Error("El nombre es requerido");
        const finalName = inputValue.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
        
        await createItemAction(
          projectId, 
          dialogState.parentPath, 
          finalName, 
          dialogState.type as 'file' | 'folder',
          { title: inputValue }
        );
        toast.success(`¡${dialogState.type === 'file' ? 'Archivo' : 'Tópico'} creado con éxito!`);
      } else if (dialogState.type === 'rename') {
        if (!inputValue) throw new Error("El nombre es requerido");
        await renameItemAction(projectId, dialogState.parentPath, inputValue, dialogState.itemSha || "");
        toast.success("Elemento renombrado.");
      } else if (dialogState.type === 'delete') {
        await deleteItemAction(projectId, dialogState.parentPath, dialogState.itemSha || "");
        toast.success("Elemento eliminado.");
      } else if (dialogState.type === 'settings') {
        await updatePageMetadataAction(projectId, dialogState.parentPath, { 
          title: inputValue,
          draft: dialogData.draft,
          date: toUTCISO(dialogData.date),
          icon: dialogData.icon
        });
        toast.success("Configuración actualizada.");
      }
      
      onTreeChange();
      setDialogState({ type: null, parentPath: projectId });
      setInputValue("");
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la acción");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (oldPath: string, newParentPath: string, sha: string) => {
    try {
      // Evitar mover a la misma ubicación
      const oldParent = oldPath.split('/').slice(0, -1).join('/');
      if (oldParent === newParentPath) return;

      setIsSubmitting(true);
      await moveItemAction(projectId, oldPath, newParentPath, sha);
      toast.success("Elemento movido con éxito");
      onTreeChange();
    } catch (error: any) {
      toast.error(error.message || "Error al mover el elemento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorder = async (path: string, direction: 'up' | 'down') => {
    try {
      setIsSubmitting(true);
      await reorderItemAction(projectId, path, direction);
      onTreeChange();
    } catch (error: any) {
      toast.error(error.message || "Error al reordenar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveAndReorder = async (sourcePath: string, targetPath: string, position: 'before' | 'after' | 'inside') => {
    try {
      setIsSubmitting(true);
      await moveAndReorderAction(projectId, sourcePath, targetPath, position);
      onTreeChange();
      toast.success("Orden actualizado");
    } catch (error: any) {
      toast.error(error.message || "Error al mover");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-full"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const path = e.dataTransfer.getData("path");
        const sha = e.dataTransfer.getData("sha");
        if (path && sha) {
          handleMove(path, projectId, sha);
        }
      }}
    >
      <div className="p-4 flex items-center gap-2">
        <div className="relative group flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full h-10 pl-10 pr-4 bg-secondary/30 border border-border/50 rounded-2xl text-[11px] font-bold tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50 placeholder:font-medium"
          />
        </div>
        
        <div className="flex items-center gap-1 p-1 h-10 rounded-2xl bg-secondary/30 border border-border/20 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" 
            onClick={() => handleOpenDialog('folder', projectId, 'folder')}
            title="Nuevo Tópico"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors" 
            onClick={() => handleOpenDialog('file', projectId, 'file')}
            title="Nuevo Archivo"
          >
            <FilePlus className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-500 transition-colors" 
            onClick={() => {
              setDialogState({ type: null, parentPath: projectId });
              fileInputRef.current?.click();
            }}
            title="Importar Markdowns"
            disabled={isSubmitting}
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-blue-500/20 hover:text-blue-500 transition-colors" 
            onClick={handleExportProject}
            title="Exportar Documentación (.zip)"
            disabled={isSubmitting}
          >
            <Download className="w-4 h-4" />
          </Button>
          <input 
            type="file" 
            multiple 
            accept=".md" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportFiles}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-32 space-y-0.5 custom-scrollbar">
        {filteredTree.map((node) => (
          <FileTreeNode 
            key={node.path} 
            node={node} 
            projectId={projectId}
            level={0} 
            selectedPath={selectedPath} 
            onSelect={onSelect}
            onTreeChange={onTreeChange}
            onOpenDialog={handleOpenDialog}
            onMove={handleMove}
            onReorder={handleReorder}
            onMoveAndReorder={handleMoveAndReorder}
            onImport={(parentPath) => {
              setDialogState(prev => ({ ...prev, parentPath }));
              fileInputRef.current?.click();
            }}
          />
        ))}
      </nav>

      {/* Global Action Dialog */}
      <Dialog open={!!dialogState.type} onOpenChange={(open) => !open && setDialogState({ type: null, parentPath: projectId })}>
        <DialogContent className="sm:max-w-[425px] border-border bg-background shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {dialogState.type === 'file' && "Nuevo Archivo"}
              {dialogState.type === 'folder' && (
                dialogState.parentPath === projectId ? "Nuevo Tópico" : "Nueva Categoría"
              )}
              {dialogState.type === 'rename' && "Renombrar Elemento"}
              {dialogState.type === 'delete' && "¿Eliminar Elemento?"}
              {dialogState.type === 'settings' && "Configuración de Página"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {dialogState.type === 'delete' 
                ? `¿Estás seguro de eliminar "${dialogState.itemName}"? Esta acción es irreversible.` 
                : dialogState.type === 'settings' 
                  ? "Configura los metadatos de la página en la base de datos."
                  : "Ingresa el nombre para continuar."}
            </DialogDescription>
          </DialogHeader>

          {dialogState.type !== 'delete' && (
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {dialogState.type === 'settings' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Título de la Página</Label>
                    <Input 
                      value={inputValue} 
                      onChange={(e) => setInputValue(e.target.value)} 
                      className="h-11 bg-muted/20 border-border rounded-xl"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Icono (Iconify)</Label>
                    <Input 
                      value={dialogData.icon} 
                      onChange={(e) => setDialogData(prev => ({ ...prev, icon: e.target.value }))} 
                      placeholder="ej: lucide:book o mdi:github"
                      className="h-12 rounded-2xl bg-muted/20 border-border focus:bg-background transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">Modo Borrador</Label>
                      <p className="text-[9px] text-muted-foreground uppercase">Ocultar de la vista pública</p>
                    </div>
                    <Switch 
                      checked={dialogData.draft}
                      onCheckedChange={(checked) => setDialogData(prev => ({ ...prev, draft: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Fecha de Publicación</Label>
                    <Input 
                      type="datetime-local"
                      value={dialogData.date} 
                      onChange={(e) => setDialogData(prev => ({ ...prev, date: e.target.value }))} 
                      className="h-11 bg-muted/20 border-border rounded-xl"
                    />
                  </div>
                </>
              ) : (dialogState.type === 'file' || dialogState.type === 'folder') ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Nombre / Título</Label>
                    <Input 
                      value={inputValue} 
                      autoFocus
                      onChange={(e) => setInputValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                      className="h-11 bg-muted/20 border-border rounded-xl"
                      placeholder={
                        dialogState.type === 'file' 
                          ? "Introducción al Proyecto" 
                          : (dialogState.parentPath === projectId ? "Nombre del Tópico" : "Nombre de la Categoría")
                      }
                    />
                  </div>
                  
                  {inputValue && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary">Vista Previa del Slug</span>
                      </div>
                      <code className="text-[11px] font-mono text-muted-foreground break-all">
                        {inputValue.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-')}{dialogState.type === 'file' ? ".md" : "/"}
                      </code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase text-primary/70">Nuevo Nombre</Label>
                  <Input 
                    id="name" 
                    value={inputValue} 
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    onChange={(e) => setInputValue(e.target.value)} 
                    className="h-11 bg-muted/20 border-border rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setDialogState({ type: null, parentPath: projectId })} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isSubmitting}
              variant={dialogState.type === 'delete' ? 'destructive' : 'default'}
              className="gap-2 px-6 font-black uppercase tracking-widest shadow-lg"
            >
              {isSubmitting && <Plus className="w-4 h-4 animate-spin" />}
              {dialogState.type === 'delete' ? 'Eliminar' : (dialogState.type === 'rename' ? 'Actualizar' : (dialogState.type === 'settings' ? 'Guardar' : 'Crear'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileTreeNode({ 
  node, 
  projectId,
  level, 
  selectedPath, 
  onSelect, 
  onTreeChange,
  onOpenDialog,
  onMove,
  onReorder,
  onMoveAndReorder,
  onImport
}: { 
  node: FileNode; 
  projectId: string;
  level: number; 
  selectedPath: string | null; 
  onSelect: (path: string) => void;
  onTreeChange: () => void;
  onOpenDialog: (type: DialogType, parentPath: string, nodeType?: 'file' | 'folder', currentName?: string, sha?: string, extraData?: any) => void;
  onMove: (oldPath: string, newParentPath: string, sha: string) => void;
  onReorder: (path: string, direction: 'up' | 'down') => void;
  onMoveAndReorder: (sourcePath: string, targetPath: string, position: 'before' | 'after' | 'inside') => void;
  onImport: (parentPath: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverPos, setDragOverPos] = useState<'top' | 'bottom' | 'middle' | null>(null);
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === "folder";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("path", node.path);
    e.dataTransfer.setData("sha", node.sha || "");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Si es carpeta, permitimos drop "inside" (middle 50%)
    // Para todos, permitimos drop "before" (top 25%) o "after" (bottom 25%)
    if (y < height * 0.25) {
      setDragOverPos('top');
    } else if (y > height * 0.75) {
      setDragOverPos('bottom');
    } else if (isFolder) {
      setDragOverPos('middle');
    } else {
      // Si no es carpeta, middle se trata como after o se ignora
      setDragOverPos(y < height / 2 ? 'top' : 'bottom');
    }
    
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setDragOverPos(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const draggedPath = e.dataTransfer.getData("path");
    
    if (!draggedPath || draggedPath === node.path) {
      setDragOverPos(null);
      return;
    }

    if (dragOverPos === 'middle' && isFolder) {
      onMoveAndReorder(draggedPath, node.path, 'inside');
    } else if (dragOverPos === 'top') {
      onMoveAndReorder(draggedPath, node.path, 'before');
    } else if (dragOverPos === 'bottom') {
      onMoveAndReorder(draggedPath, node.path, 'after');
    }
    
    setDragOverPos(null);
  };

  return (
    <div className="select-none py-0.5">
      <div 
        className={cn(
          "group relative flex items-center h-10 px-3 gap-3 cursor-pointer transition-all duration-300 select-none rounded-xl mx-2",
          isSelected ? "text-primary font-bold bg-transparent" : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
          node.draft && "opacity-60",
          isDragOver && dragOverPos === 'middle' && "bg-primary/30 scale-[1.02]",
          "active:scale-[0.98]"
        )}
        style={{ marginLeft: `${(level) * 12}px` }}
        onClick={handleToggle}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Indicadores de drop posicional */}
        {isDragOver && dragOverPos === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] z-50 animate-pulse" />
        )}
        {isDragOver && dragOverPos === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] z-50 animate-pulse" />
        )}
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isFolder ? (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} className="shrink-0">
              <ChevronRight className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "text-primary/40")} />
            </motion.div>
          ) : (
            node.draft ? (
              <span title="Borrador">
                <EyeOff className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
              </span>
            ) : node.publishDate ? (
              new Date(node.publishDate) > new Date() ? (
                <span title={`Programado: ${new Date(node.publishDate).toLocaleString()}`}>
                  <CalendarClock className="w-3.5 h-3.5 shrink-0 text-red-400" />
                </span>
              ) : (
                <span title={`Publicado el: ${new Date(node.publishDate).toLocaleString()}`}>
                  <CalendarCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                </span>
              )
            ) : node.icon ? (
              <DynamicIcon icon={node.icon} className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-primary")} />
            ) : (
              <FileText className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary" : "text-primary/40")} />
            )
          )}
          
          {isFolder ? (
             level === 0 ? (
               <Bookmark className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-primary")} />
             ) : (
               isOpen ? <FolderOpen className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-primary")} /> : <FolderIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-primary/70")} />
             )
          ) : null}

          <span className={cn(
            "text-[11px] transition-all",
            level === 0 ? "font-black tracking-tight" : (isFolder ? "font-bold" : "font-medium"),
            isSelected ? "text-primary font-black" : "text-foreground/90 group-hover:text-primary"
          )}>
            {node?.title || node?.name?.replace(/^\d+-/, '').split(/[ \-_]/).map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : '').join(' ') || "Sin nombre"}
          </span>
        </div>

        <div className={cn(
          "transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className={cn(
                "p-1 rounded-md transition-colors animate-in fade-in duration-300",
                isSelected ? "hover:bg-primary/10" : "hover:bg-black/10"
              )}>
                <MoreVertical className={cn(
                  "w-3.5 h-3.5",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border rounded-xl shadow-xl">
              {isFolder && (
                <>
                  <DropdownMenuItem onClick={() => onOpenDialog('file', node.path, 'file')} className="text-xs gap-2 font-medium">
                    <FilePlus className="w-3.5 h-3.5" />
                    Nuevo Archivo
                  </DropdownMenuItem>
                  {level === 0 && (
                    <DropdownMenuItem onClick={() => onOpenDialog('folder', node.path, 'folder')} className="text-xs gap-2 font-medium">
                      <FolderPlus className="w-3.5 h-3.5" />
                      Nueva Categoría
                    </DropdownMenuItem>
                  )}
                <DropdownMenuItem 
                  onClick={() => onImport(node.path)} 
                  className="text-xs gap-2 font-medium text-emerald-500 focus:text-emerald-600"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar Archivos
                </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => onOpenDialog('settings', node.path, node.type as any, node.name, node.sha, node)} className="text-xs gap-2 font-medium">
                <Settings2 className="w-3.5 h-3.5" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenDialog('delete', node.path, node.type as any, node.name, node.sha)} className="text-xs gap-2 font-medium text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isFolder && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode 
                key={child.path} 
                node={child} 
                level={level + 1} 
                projectId={projectId}
                selectedPath={selectedPath} 
                onSelect={onSelect}
                onTreeChange={onTreeChange}
                onOpenDialog={onOpenDialog}
                onMove={onMove}
                onReorder={onReorder}
                onMoveAndReorder={onMoveAndReorder}
                onImport={onImport}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

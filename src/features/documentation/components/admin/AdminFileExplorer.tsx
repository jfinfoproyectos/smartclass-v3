"use client";

import React, { useState, useEffect } from "react";
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
  Download,
  BookOpen,
  UnfoldVertical,
  FoldVertical
} from "lucide-react";
import JSZip from "jszip";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FileNode } from "@/features/documentation/services/admin-docs";
import { ExportBookDialog } from "@/features/documentation/components/pdf/ExportBookDialog";
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
  exportProjectAction,
  importProjectStructureAction
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [expandToken, setExpandToken] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Procesando archivos para importar...");

    try {
      const filesToImport: { path: string; content: string }[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileNameLower = file.name.toLowerCase();

        if (fileNameLower.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          const zipPromises: Promise<void>[] = [];

          zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.md')) {
              zipPromises.push(
                zipEntry.async("text").then((content) => {
                  filesToImport.push({ path: relativePath, content });
                })
              );
            }
          });

          await Promise.all(zipPromises);
        } else if (fileNameLower.endsWith('.md')) {
          const text = await file.text();
          const currentParent = dialogState.parentPath && dialogState.parentPath !== projectId ? dialogState.parentPath : "";
          const path = currentParent ? `${currentParent}/${file.name}` : file.name;
          filesToImport.push({ path, content: text });
        }
      }

      if (filesToImport.length === 0) {
        toast.error("No se encontraron archivos markdown (.md) válidos.", { id: toastId });
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const result = await importProjectStructureAction(projectId, filesToImport);
      toast.success(`¡Importación completada! Se procesaron ${result.count} páginas en ${result.topicsCount} tópicos.`, { id: toastId });
      onTreeChange();
    } catch (err: any) {
      console.error("Error al importar archivos:", err);
      toast.error(err?.message || "Error al importar el proyecto.", { id: toastId });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportProject = async () => {
    try {
      setIsSubmitting(true);
      const toastId = toast.loading("Preparando exportación numerada de tópicos y archivos...");
      
      const { projectName, projectSlug, files } = await exportProjectAction(projectId);
      
      if (!files || files.length === 0) {
        toast.error("No hay archivos para exportar en este proyecto.", { id: toastId });
        setIsSubmitting(false);
        return;
      }

      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(file.path, file.content);
      });
      
      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanDownloadName = (projectSlug || projectName || projectId).replace(/[/\\?%*:|"<>]/g, '-');
      a.download = `docs-${cleanDownloadName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`¡Exportación completada! ${files.length} páginas organizadas en carpetas numeradas.`, { id: toastId });
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
    if (type === 'folder' && parentPath !== projectId) {
      toast.error("No se pueden crear carpetas dentro de otras carpetas.");
      return;
    }
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
        if (dialogState.type === 'folder' && dialogState.parentPath !== projectId) {
          throw new Error("No se permite crear carpetas dentro de otras carpetas.");
        }
        const finalName = inputValue.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
        
        await createItemAction(
          projectId, 
          dialogState.parentPath, 
          finalName, 
          dialogState.type as 'file' | 'folder',
          { title: inputValue }
        );
        toast.success(`¡${dialogState.type === 'file' ? 'Archivo' : 'Tópico'} creado con éxito!`);
        
        if (dialogState.type === 'file') {
          const createdSlug = dialogState.parentPath && dialogState.parentPath !== projectId
            ? `${dialogState.parentPath}/${finalName}`
            : finalName;
          onSelect(createdSlug);
        }
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
        toast.success(
          dialogState.nodeType === 'folder'
            ? (dialogData.draft 
                ? "Tópico y todos sus archivos colocados en borrador." 
                : "Tópico y archivos publicados con éxito.")
            : "Configuración actualizada."
        );
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
      {/* Sidebar Header Title & Actions Row */}
      <div className="px-4 pt-4 pb-2.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Documentos
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={() => handleOpenDialog('folder', projectId, 'folder')}
                aria-label="Nuevo Tópico"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Nuevo Tópico</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={() => handleOpenDialog('file', projectId, 'file')}
                aria-label="Nuevo Archivo"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Nuevo Archivo</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={() => setExpandToken(prev => prev <= 0 ? 1 : prev + 1)}
                aria-label="Abrir todos los tópicos"
              >
                <UnfoldVertical className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Abrir todos los tópicos</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={() => setExpandToken(prev => prev >= 0 ? -1 : prev - 1)}
                aria-label="Cerrar todos los tópicos"
              >
                <FoldVertical className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Cerrar todos los tópicos</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={() => {
                  setDialogState({ type: null, parentPath: projectId });
                  fileInputRef.current?.click();
                }}
                disabled={isSubmitting}
                aria-label="Importar Markdowns"
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Importar Markdowns (.md, .zip)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" 
                onClick={handleExportProject}
                disabled={isSubmitting}
                aria-label="Exportar Documentación (.zip)"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Exportar Documentación (.zip)</p>
            </TooltipContent>
          </Tooltip>

          <ExportBookDialog
            projectId={projectId}
            trigger={
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary hover:text-primary transition-colors cursor-pointer" 
                      disabled={isSubmitting}
                      aria-label="Exportar Superlibro Editorial (PDF)"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Exportar Superlibro Editorial (PDF)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          />
          <input 
            type="file" 
            multiple 
            accept=".md,.zip" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportFiles}
          />
        </div>
      </div>

      {/* Sidebar Search Row (Full Width) */}
      <div className="px-4 pb-3">
        <div className="relative group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar archivos..."
            className="w-full h-9 pl-9 pr-3.5 bg-muted/30 border border-border/60 focus:border-primary/50 focus:bg-background rounded-xl text-xs font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/60 text-foreground"
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
            tree={tree}
            expandToken={expandToken}
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
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              {dialogState.type === 'file' && "Nuevo Archivo"}
              {dialogState.type === 'folder' && "Nuevo Tópico"}
              {dialogState.type === 'rename' && "Renombrar Elemento"}
              {dialogState.type === 'delete' && "¿Eliminar Elemento?"}
              {dialogState.type === 'settings' && (dialogState.nodeType === 'folder' ? "Configuración del Tópico" : "Configuración de Página")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {dialogState.type === 'delete' 
                ? `¿Estás seguro de eliminar "${dialogState.itemName}"? Esta acción no se puede deshacer.` 
                : dialogState.type === 'settings' 
                  ? (dialogState.nodeType === 'folder' 
                      ? "Configura los metadatos del tópico. Al colocarlo en borrador, todos sus archivos también se colocarán en borrador."
                      : "Configura los metadatos de la página en la base de datos.")
                  : "Ingresa el nombre para continuar."}
            </DialogDescription>
          </DialogHeader>

          {dialogState.type !== 'delete' && (
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {dialogState.type === 'settings' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      {dialogState.nodeType === 'folder' ? "Título del Tópico" : "Título de la Página"}
                    </Label>
                    <Input 
                      value={inputValue} 
                      onChange={(e) => setInputValue(e.target.value)} 
                      className="h-10 bg-muted/20 border-border rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">Icono (Iconify)</Label>
                    <Input 
                      value={dialogData.icon} 
                      onChange={(e) => setDialogData(prev => ({ ...prev, icon: e.target.value }))} 
                      placeholder="ej: lucide:book o mdi:github"
                      className="h-10 rounded-xl bg-muted/20 border-border focus:bg-background transition-all text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/50">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-foreground">Modo Borrador</Label>
                        {dialogData.draft && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Borrador
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {dialogState.nodeType === 'folder' 
                          ? "Ocultar tópico y todos sus archivos de la vista pública" 
                          : "Ocultar de la vista pública"}
                      </p>
                    </div>
                    <Switch 
                      checked={dialogData.draft}
                      onCheckedChange={(checked) => setDialogData(prev => ({ ...prev, draft: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">Fecha de Publicación</Label>
                    <Input 
                      type="datetime-local"
                      value={dialogData.date} 
                      onChange={(e) => setDialogData(prev => ({ ...prev, date: e.target.value }))} 
                      className="h-10 bg-muted/20 border-border rounded-xl text-xs"
                    />
                  </div>
                </>
              ) : (dialogState.type === 'file' || dialogState.type === 'folder') ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">Nombre / Título</Label>
                    <Input 
                      value={inputValue} 
                      autoFocus
                      onChange={(e) => setInputValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                      className="h-10 bg-muted/20 border-border rounded-xl text-xs"
                      placeholder={
                        dialogState.type === 'file' 
                          ? "Introducción al Proyecto" 
                          : "Nombre del Tópico"
                      }
                    />
                  </div>
                  
                  {inputValue && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">Vista previa del slug:</span>
                      </div>
                      <code className="text-xs font-mono text-muted-foreground break-all">
                        {inputValue.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-')}{dialogState.type === 'file' ? ".md" : "/"}
                      </code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-foreground/80">Nuevo Nombre</Label>
                  <Input 
                    id="name" 
                    value={inputValue} 
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    onChange={(e) => setInputValue(e.target.value)} 
                    className="h-10 bg-muted/20 border-border rounded-xl text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" className="rounded-xl text-xs font-medium" onClick={() => setDialogState({ type: null, parentPath: projectId })} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isSubmitting}
              variant={dialogState.type === 'delete' ? 'destructive' : 'default'}
              className="gap-2 px-5 font-semibold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting && <Plus className="w-3.5 h-3.5 animate-spin" />}
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
  tree,
  expandToken,
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
  tree: FileNode[];
  expandToken: number;
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

  useEffect(() => {
    if (selectedPath && node.type === 'folder') {
      if (selectedPath === node.path || selectedPath.startsWith(node.path + '/')) {
        setIsOpen(true);
      }
    }
  }, [selectedPath, node.path, node.type]);

  useEffect(() => {
    if (expandToken > 0) setIsOpen(true);
    if (expandToken < 0) setIsOpen(false);
  }, [expandToken]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    e.stopPropagation();
    e.dataTransfer.setData("path", node.path);
    e.dataTransfer.setData("sha", node.sha || "");
    e.dataTransfer.setData("isFolder", isFolder ? "true" : "false");
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
    setDragOverPos(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Si es carpeta, permitimos drop "inside" (middle 40%)
    // Top 30% es 'before', Bottom 30% es 'after'
    if (isFolder) {
      if (y < height * 0.3) {
        setDragOverPos('top');
      } else if (y > height * 0.7) {
        setDragOverPos('bottom');
      } else {
        setDragOverPos('middle');
      }
    } else {
      setDragOverPos(y < height * 0.5 ? 'top' : 'bottom');
    }
    
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDragOverPos(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const draggedPath = e.dataTransfer.getData("path");
    if (!draggedPath || draggedPath === node.path) {
      setDragOverPos(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const draggedNode = findNodeByPath(tree, draggedPath);
    const isDraggedFolder = draggedNode?.type === 'folder';

    // Determinar posición dinámicamente si dragOverPos no estuviera sincronizado
    let pos = dragOverPos;
    if (!pos) {
      if (isFolder && !isDraggedFolder) {
        if (y < height * 0.3) pos = 'top';
        else if (y > height * 0.7) pos = 'bottom';
        else pos = 'middle';
      } else {
        pos = y < height * 0.5 ? 'top' : 'bottom';
      }
    }

    if (pos === 'middle' && isFolder) {
      if (isDraggedFolder) {
        toast.error("No se permite mover un tópico o carpeta dentro de otro tópico.");
        setDragOverPos(null);
        return;
      }
      onMoveAndReorder(draggedPath, node.path, 'inside');
    } else if (pos === 'top') {
      onMoveAndReorder(draggedPath, node.path, 'before');
    } else if (pos === 'bottom') {
      onMoveAndReorder(draggedPath, node.path, 'after');
    }
    
    setDragOverPos(null);
  };

  return (
    <div className="select-none py-0.5">
      <div 
        className={cn(
          "group relative flex items-start min-h-[34px] py-1.5 px-2.5 gap-2.5 cursor-grab active:cursor-grabbing transition-all duration-150 select-none rounded-xl mx-1",
          isSelected 
            ? "text-primary font-semibold bg-primary/10 border border-primary/25 shadow-2xs" 
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          node.draft && "opacity-60",
          isDragging && "opacity-30 border-dashed border-2 border-primary/60 scale-[0.98]",
          "active:scale-[0.99]"
        )}
        onClick={handleToggle}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Indicadores de drop posicional altamente visibles */}
        {isDragOver && dragOverPos === 'top' && (
          <div className="absolute -top-1 left-2 right-2 h-1 rounded-full bg-primary shadow-xs z-50 pointer-events-none flex items-center">
            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-primary border-2 border-background shadow-xs" />
          </div>
        )}
        {isDragOver && dragOverPos === 'bottom' && (
          <div className="absolute -bottom-1 left-2 right-2 h-1 rounded-full bg-primary shadow-xs z-50 pointer-events-none flex items-center">
            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-primary border-2 border-background shadow-xs" />
          </div>
        )}
        {isDragOver && dragOverPos === 'middle' && isFolder && (
          <div className="absolute inset-0 rounded-xl bg-primary/15 border-2 border-primary/40 shadow-inner z-40 pointer-events-none flex items-center justify-end pr-3">
            <span className="text-[10px] font-semibold text-primary bg-background/90 px-2 py-0.5 rounded-md shadow-xs border border-primary/25">
              Mover dentro
            </span>
          </div>
        )}
        
        <div className="flex items-start gap-2 flex-1 min-w-0 pointer-events-none">
          {isFolder ? (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} className="shrink-0 mt-0.5">
              <ChevronRight className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "text-muted-foreground/60")} />
            </motion.div>
          ) : (
            node.draft ? (
              <span title="Borrador" className="shrink-0 mt-0.5">
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground/50" />
              </span>
            ) : node.publishDate ? (
              new Date(node.publishDate) > new Date() ? (
                <span title={`Programado: ${new Date(node.publishDate).toLocaleString()}`} className="shrink-0 mt-0.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                </span>
              ) : (
                <span title={`Publicado el: ${new Date(node.publishDate).toLocaleString()}`} className="shrink-0 mt-0.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                </span>
              )
            ) : node.icon ? (
              <div className="shrink-0 mt-0.5">
                <DynamicIcon icon={node.icon} className={cn("w-3.5 h-3.5", isSelected ? "text-primary" : "text-primary/80")} />
              </div>
            ) : (
              <FileText className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isSelected ? "text-primary" : "text-muted-foreground/60")} />
            )
          )}
          
          {isFolder ? (
             level === 0 ? (
               <Bookmark className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isSelected ? "text-primary" : "text-primary/70")} />
             ) : (
               isOpen ? <FolderOpen className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isSelected ? "text-primary" : "text-primary/70")} /> : <FolderIcon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isSelected ? "text-primary" : "text-primary/50")} />
             )
          ) : null}

          <span className={cn(
            "text-xs transition-all whitespace-normal break-words leading-snug flex-1 select-none",
            level === 0 ? "font-semibold text-foreground tracking-tight" : (isFolder ? "font-medium text-foreground/90" : "font-normal"),
            isSelected ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {node?.title || node?.name?.replace(/^\d+-/, '').split(/[ \-_]/).map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : '').join(' ') || "Sin nombre"}
          </span>

          {node.draft && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground/80 border border-border/50 shrink-0 select-none cursor-help"
                >
                  <EyeOff className="w-2.5 h-2.5 text-amber-500/80" />
                  Borrador
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isFolder ? "Tópico en borrador (archivos internos ocultos)" : "Archivo en borrador"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className={cn(
          "transition-opacity pointer-events-auto shrink-0 mt-0.5",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className={cn(
                "p-1 rounded-md transition-colors animate-in fade-in duration-200",
                isSelected ? "hover:bg-primary/20" : "hover:bg-muted"
              )}>
                <MoreVertical className={cn(
                  "w-3.5 h-3.5",
                  isSelected ? "text-primary" : "text-muted-foreground"
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
                <DropdownMenuItem 
                  onClick={() => onImport(node.path)} 
                  className="text-xs gap-2 font-medium text-primary focus:text-primary"
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
            className="ml-5 pl-2 border-l border-border/50 hover:border-primary/30 transition-colors duration-200 flex flex-col gap-0.5 my-1 overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode 
                key={child.path} 
                node={child} 
                level={level + 1} 
                projectId={projectId}
                tree={tree}
                expandToken={expandToken}
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

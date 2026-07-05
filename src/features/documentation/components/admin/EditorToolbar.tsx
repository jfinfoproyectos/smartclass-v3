"use client";

import React from "react";
import { 
  Bold, Italic, Strikethrough, Code2, Terminal, 
  Heading1, Heading2, Heading3, Quote, 
  List, ListOrdered, CheckSquare, 
  Link as LinkIcon, Image as ImageIcon, Minus,
  ArrowLeft, Files, Save, Loader2, Edit2, Columns, Eye,
  EyeOff, CalendarClock, CalendarCheck, Type,
  Maximize2, Minimize2, Keyboard, Table, MoreHorizontal, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ComponentAssist } from "./ComponentAssist";
import { AiDocGenerateDialog } from "./AiDocGenerateDialog";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  // Navigation & State
  onBack: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  title: string;
  filename: string;
  
  // View & Saving
  viewMode: "edit" | "preview" | "split";
  onViewModeChange: (mode: "edit" | "preview" | "split") => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  
  // MDX Handlers
  onFormat: (prefix: string, suffix?: string, placeholder?: string) => void;
  onLineFormat: (prefix: string) => void;
  onInsert: (text: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  // Metadata management
  projectId: string;
  path: string | null;
  metadata: any;
  onMetadataChange?: () => void;
  projectName?: string;
  onProjectNameChange?: (newName: string) => Promise<void>;
}

export function EditorToolbar({
  onBack, onToggleSidebar, isSidebarOpen, isFullScreen, onToggleFullScreen, title, filename,
  viewMode, onViewModeChange, onSave, saving, canSave,
  onFormat, onLineFormat, onInsert, content, onContentChange,
  projectId, path, metadata, onMetadataChange,
  projectName, onProjectNameChange
}: EditorToolbarProps) {
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState(projectName || "");

  React.useEffect(() => {
    if (projectName) setNewName(projectName);
  }, [projectName]);

  const handleRename = async () => {
    if (!onProjectNameChange || !newName.trim() || newName === projectName) {
      setIsRenaming(false);
      return;
    }
    await onProjectNameChange(newName);
    setIsRenaming(false);
  };
  return (
    <TooltipProvider delayDuration={400}>
      <header className="h-12 border-b border-border bg-background/50 backdrop-blur-md flex shrink-0 items-center justify-between px-4 z-50 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4">
          {/* Group 1: Navigation & File Explorer */}
          <div className="flex items-center gap-1 pr-4 border-r border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleSidebar} 
                  className={cn(
                    "h-8 w-8 rounded-lg transition-all", 
                    isSidebarOpen ? "bg-primary/10 text-primary shadow-inner" : "hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  {isSidebarOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                {isSidebarOpen ? "Ocultar Explorador" : "Mostrar Explorador"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleFullScreen} 
                  className={cn(
                    "h-8 w-8 rounded-lg transition-all", 
                    isFullScreen ? "bg-primary/10 text-primary shadow-inner" : "hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <span>Pantalla Completa</span>
                <kbd className="text-[9px] font-mono bg-muted px-1 rounded opacity-60">Ctrl+F</kbd>
              </TooltipContent>
            </Tooltip>

            {onProjectNameChange && (
              <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <div className="flex items-center gap-2 pl-2 border-l border-border/50 ml-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">Proyecto</span>
                    <span className="text-[10px] font-black uppercase tracking-tight text-primary/80 truncate max-w-[150px]">{projectName || "Sin Nombre"}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg hover:bg-primary/5 hover:text-primary transition-all opacity-40 hover:opacity-100"
                        >
                          <Type className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                      Renombrar Proyecto
                    </TooltipContent>
                  </Tooltip>
                </div>
                <DialogContent className="sm:max-w-[425px] border-border bg-background shadow-2xl rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Renombrar Proyecto</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nuevo Nombre</label>
                      <input
                        id="name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Nombre de la documentación"
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsRenaming(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
                    <Button onClick={handleRename} className="rounded-xl font-black uppercase tracking-widest text-[10px]">Guardar Cambios</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Group 2: Formatting (Style) */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="hidden lg:flex items-center gap-0.5 pr-4 border-r border-border/50">
              <FormatButton icon={<Bold className="w-3.5 h-3.5" />} label="Negrita" shortcut="Ctrl+B" onClick={() => onFormat("**", "**", "texto")} />
              <FormatButton icon={<Italic className="w-3.5 h-3.5" />} label="Itálica" shortcut="Ctrl+I" onClick={() => onFormat("*", "*", "texto")} />
              <FormatButton icon={<Code2 className="w-3.5 h-3.5" />} label="Código" shortcut="`" onClick={() => onFormat("`", "`", "codigo")} />
            </div>
          )}

          {/* Group 3: Structure */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="hidden xl:flex items-center gap-0.5 pr-4 border-r border-border/50">
              <FormatButton icon={<Heading1 className="w-3.5 h-3.5" />} label="H1" onClick={() => onLineFormat("# ")} />
              <FormatButton icon={<Heading2 className="w-3.5 h-3.5" />} label="H2" onClick={() => onLineFormat("## ")} />
              <FormatButton icon={<Quote className="w-3.5 h-3.5" />} label="Cita" onClick={() => onLineFormat("> ")} />
              <FormatButton icon={<List className="w-3.5 h-3.5" />} label="Lista" onClick={() => onLineFormat("- ")} />
              <FormatButton icon={<CheckSquare className="w-3.5 h-3.5" />} label="Tareas" onClick={() => onLineFormat("- [ ] ")} />
            </div>
          )}

          {/* Group 4: Assets */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="hidden md:flex items-center gap-0.5 pr-4 border-r border-border/50">
              <FormatButton icon={<LinkIcon className="w-3.5 h-3.5" />} label="Enlace" onClick={() => onFormat("[", "](url)", "titulo")} />
              <FormatButton icon={<ImageIcon className="w-3.5 h-3.5" />} label="Imagen" onClick={() => onFormat("![", "](url)", "alt")} />
            </div>
          )}

          {/* Group 4.5: More formatting dropdown */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="hidden md:flex items-center gap-0.5 pr-4 border-r border-border/50">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shrink-0 opacity-60 hover:opacity-100"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                    Más Formatos
                  </TooltipContent>
                </Tooltip>
                
                <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-md border border-border/40 p-1.5 rounded-xl shadow-2xl z-50">
                  <DropdownMenuItem 
                    onClick={() => onFormat("~~", "~~", "texto")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                    <span>Tachado</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onLineFormat("### ")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                    <span>Encabezado H3</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onLineFormat("1. ")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Lista Ordenada</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onFormat("```\n", "\n```", "codigo")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Bloque de Código</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onLineFormat("---\n")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Línea Separadora</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onInsert("| Cabecera | Cabecera |\n| --- | --- |\n| Valor | Valor |")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Insertar Tabla</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Group 5: Asistente de Componentes */}
          {(viewMode === "edit" || viewMode === "split") && (
            <div className="flex items-center gap-1 pl-1">
              <ComponentAssist onInsert={onInsert} />
              <AiDocGenerateDialog content={content} onContentChange={onContentChange} />
            </div>
          )}
        </div>

        {/* Center: File Name (Optional, if space permits) */}
        <div className="hidden 2xl:flex flex-col items-center justify-center text-center px-4">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{filename}</span>
        </div>

        {/* Right Group: ViewMode, Assistants, Save */}
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v: any) => onViewModeChange(v)} className="hidden sm:flex bg-muted/30 p-0.5 rounded-lg h-8">
            <TabsList className="bg-transparent border-none h-7">
              <TabsTrigger value="edit" title="Editor (F1)" className="rounded-md h-6 gap-1 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Edit2 className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase">Editor</span>
              </TabsTrigger>
              <TabsTrigger value="split" title="Dividido (F2)" className="rounded-md h-6 gap-1 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Columns className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase">Dividido</span>
              </TabsTrigger>
              <TabsTrigger value="preview" title="Vista (F3)" className="rounded-md h-6 gap-1 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Eye className="w-2.5 h-2.5" />
                <span className="text-[9px] font-black uppercase">Vista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shrink-0 opacity-60 hover:opacity-100"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
                Atajos de Teclado
              </TooltipContent>
            </Tooltip>
            
            <DialogContent className="sm:max-w-[425px] border-border bg-background shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" /> Atajos de Teclado
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 text-xs font-medium text-muted-foreground leading-relaxed">
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Guardar archivo</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+S</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Texto en Negrita</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+B</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Texto en Itálica</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+I</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Código Inline</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+D</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Encabezado H1</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+Shift+1</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1 border-b border-border/40">
                  <span>Encabezado H2</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+Shift+2</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 py-1">
                  <span>Encabezado H3</span>
                  <div className="text-right">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/50">Ctrl+Shift+3</kbd>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={onSave} 
            disabled={!canSave || saving}
            className={cn(
              "rounded-lg h-8 px-4 font-black uppercase tracking-widest text-[10px] gap-2 transition-all",
              canSave ? "bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95" : "bg-muted text-muted-foreground opacity-50"
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{saving ? 'Guardando' : 'Guardar'}</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}

function FormatButton({ icon, label, shortcut, onClick }: { icon: React.ReactNode, label: string, shortcut?: string, onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClick}
          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all shrink-0 opacity-60 hover:opacity-100"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
        {shortcut && (
          <kbd className="text-[9px] font-mono bg-muted/20 px-1 rounded opacity-60">{shortcut}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

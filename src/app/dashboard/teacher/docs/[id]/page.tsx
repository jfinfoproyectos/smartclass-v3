"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getFileTreeAction, 
  getFileContentAction, 
  saveFileContentAction, 
  getProjectAction, 
  updateProjectNameAction 
} from "@/features/documentation/actions/adminDocsActions";
import { AdminFileExplorer } from "@/features/documentation/components/admin/AdminFileExplorer";
import { BlockEditor } from "@/features/documentation/components/admin/BlockEditor";
import { getProjectCoursesAction } from "@/features/documentation/actions/adminDocsActions";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Layout, 
  ArrowLeft, 
  Menu, 
  Maximize2, 
  Minimize2, 
  Save, 
  Trash2,
  Settings,
  Edit,
  FileText,
  Edit3,
  Eye,
  X
} from "lucide-react";
import { toast } from "sonner";
import { FileNode } from "@/features/documentation/services/admin-docs";
import { ErrorBoundary } from "@/features/documentation/components/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { CodeThemeSelector } from "@/features/documentation/components/reader/CodeThemeSelector";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { getAvailableThemes } from "@/app/actions/themes";
import { getCodeTheme } from "@/app/actions/code-themes";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export default function DocEditorPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [pageMetadata, setPageMetadata] = useState<any>(null);
  const [currentSha, setCurrentSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [activeTab, setActiveTab] = useState<"edit" | "markdown" | "preview">("edit");
  const [courses, setCourses] = useState<{id: string, title: string}[]>([]);
  const [project, setProject] = useState<{id: string, name: string, slug: string} | null>(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");

  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'select' | 'back', path?: string } | null>(null);

  const [themes, setThemes] = useState<any[]>([]);
  const [currentCodeTheme, setCurrentCodeTheme] = useState("one-dark-pro");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && projectId) {
      loadTree();
      loadCourses();
      loadProject();
      loadThemesAndCodeTheme();
    }
  }, [projectId, mounted]);

  async function loadThemesAndCodeTheme() {
    try {
      const availableThemes = await getAvailableThemes();
      setThemes(availableThemes);
      const codeTheme = await getCodeTheme();
      setCurrentCodeTheme(codeTheme);
    } catch (err) {
      console.error("Error loading themes:", err);
    }
  }

  async function loadProject() {
    try {
      const data = await getProjectAction(projectId);
      setProject(data);
      setProjectNameInput(data.name);
    } catch (error) {
      console.error("Error loading project:", error);
    }
  }

  async function loadCourses() {
    try {
      const data = await getProjectCoursesAction(projectId);
      setCourses(data);
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  }

  async function loadTree() {
    if (!projectId) return;
    setLoading(true);
    try {
      const tree = await getFileTreeAction(projectId);
      setFileTree(tree);
    } catch (error) {
      console.error("Error loading tree in DocEditorPage:", error);
      toast.error("Error al cargar la estructura de archivos");
    } finally {
      setLoading(false);
    }
  }

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

  async function handleFileSelect(path: string) {
    if (content !== originalContent) {
      setPendingAction({ type: 'select', path });
      setIsUnsavedDialogOpen(true);
      return;
    }
    await executeFileSelect(path);
  }

  async function executeFileSelect(path: string) {
    setLoading(true);
    try {
      const data = await getFileContentAction(projectId, path);
      setSelectedFile(path);
      setContent(data.content || "[]");
      setOriginalContent(data.content || "[]");
      setPageMetadata(data.metadata);
      setCurrentSha(data.sha);
    } catch (error) {
      console.error("Error executing file select in DocEditorPage:", error);
      toast.error("Error al cargar el archivo");
    } finally {
      setLoading(false);
    }
  }

  const handleDiscard = () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'back') {
      router.push("/dashboard/teacher/docs");
    } else if (pendingAction.type === 'select' && pendingAction.path) {
      executeFileSelect(pendingAction.path);
    }
    
    setIsUnsavedDialogOpen(false);
    setPendingAction(null);
  };

  const handleSaveAndContinue = async () => {
    if (!selectedFile) return;
    
    setSaving(true);
    try {
      const result = await saveFileContentAction(projectId, selectedFile, content, currentSha || undefined);
      if (result.success) {
        setOriginalContent(content);
        setCurrentSha(result.sha || null);
        toast.success("Cambios guardados");
        
        if (pendingAction) {
          if (pendingAction.type === 'back') {
            router.push("/dashboard/teacher/docs");
          } else if (pendingAction.type === 'select' && pendingAction.path) {
            executeFileSelect(pendingAction.path);
          }
        }
      }
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
      setIsUnsavedDialogOpen(false);
      setPendingAction(null);
    }
  };

  const handleSave = useCallback(async () => {
    if (!selectedFile || content === originalContent || saving) return;
    setSaving(true);
    try {
      const result = await saveFileContentAction(projectId, selectedFile, content, currentSha || undefined);
      if (result.success) {
        setOriginalContent(content);
        setCurrentSha(result.sha || null);
        toast.success("Cambios guardados correctamente");
      }
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Error al guardar el archivo");
    } finally {
      setSaving(false);
    }
  }, [projectId, selectedFile, content, originalContent, currentSha, saving]);

  const handleProjectNameSave = async () => {
    if (!projectNameInput.trim()) return;
    try {
      await updateProjectNameAction(projectId, projectNameInput.trim());
      await loadProject();
      setIsEditingProjectName(false);
      toast.success("Nombre del proyecto actualizado");
    } catch (err) {
      toast.error("Error al actualizar el nombre del proyecto");
    }
  };

  const getDocumentName = () => {
    if (!selectedFile) return "";
    const base = selectedFile.split("/").pop() || "";
    return base
      .replace(/\.md$/, "")
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  if (!mounted) return null;

  return (
    <div className={cn(
      "flex flex-col overflow-hidden bg-background border border-border shadow-2xl transition-all duration-300",
      isFullScreen 
        ? "fixed inset-0 z-50 m-0 rounded-none border-none" 
        : "absolute inset-0 z-40 rounded-xl m-2 sm:m-4"
    )}>
      {/* Visual Top Toolbar */}
      <div className="flex-none bg-background border-b border-border/50 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">

          {/* Project Name Editing */}
          {isEditingProjectName ? (
            <div className="flex items-center gap-2">
              <Input 
                value={projectNameInput}
                onChange={e => setProjectNameInput(e.target.value)}
                className="h-8 rounded-lg text-xs py-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") handleProjectNameSave();
                  if (e.key === "Escape") {
                    setIsEditingProjectName(false);
                    setProjectNameInput(project?.name || "");
                  }
                }}
              />
              <Button size="sm" className="h-8 rounded-lg px-3 text-[10px] uppercase font-bold" onClick={handleProjectNameSave}>
                Listo
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className="font-heading font-black uppercase text-sm tracking-tight">{project?.name || "Cargando..."}</span>
              <button 
                onClick={() => setIsEditingProjectName(true)}
                className="p-1 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors hover:bg-muted rounded"
                title="Editar nombre"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center Tab Selector */}
        {selectedFile && (
          <div className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("edit")}
              className={cn(
                "font-bold rounded-lg gap-2 h-8 text-[11px] uppercase tracking-wider px-3 transition-all",
                activeTab === "edit" 
                  ? "shadow-sm bg-background text-foreground hover:bg-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <Edit3 className="w-3.5 h-3.5 text-primary" />
              Diseñador
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("markdown")}
              className={cn(
                "font-bold rounded-lg gap-2 h-8 text-[11px] uppercase tracking-wider px-3 transition-all",
                activeTab === "markdown" 
                  ? "shadow-sm bg-background text-foreground hover:bg-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              Editor Markdown
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("preview")}
              className={cn(
                "font-bold rounded-lg gap-2 h-8 text-[11px] uppercase tracking-wider px-3 transition-all",
                activeTab === "preview" 
                  ? "shadow-sm bg-background text-foreground hover:bg-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent"
              )}
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              Vista Previa
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Themes, Styles, and DarkMode controls */}
          <div className="flex items-center gap-1.5 border-r border-border/40 pr-3 mr-1">
            <ThemeSelector themes={themes} />
            <CodeThemeSelector currentTheme={currentCodeTheme} />
            <ModeToggle />
          </div>

          {selectedFile && (
            <Button 
              disabled={content === originalContent || saving}
              onClick={handleSave} 
              className="font-bold rounded-xl gap-2 h-9 px-4 shadow-sm animate-in fade-in duration-300"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {content === originalContent ? "Guardado" : "Guardar"}
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={() => {
              if (content !== originalContent) {
                setPendingAction({ type: 'back' });
                setIsUnsavedDialogOpen(true);
              } else {
                router.push("/dashboard/teacher/docs");
              }
            }}
            className="font-bold rounded-xl gap-2 h-9 px-4 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 shrink-0"
            title="Cerrar Diseñador"
          >
            <X className="w-4 h-4" />
            <span>Cerrar</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Page Explorer */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="border-r border-border bg-muted/30 dark:bg-zinc-950 flex flex-col overflow-hidden shrink-0 h-full min-h-0"
            >
              <div className="w-72 h-full flex flex-col min-h-0">
                <AdminFileExplorer 
                  projectId={projectId}
                  tree={fileTree} 
                  selectedPath={selectedFile} 
                  onSelect={handleFileSelect}
                  onTreeChange={loadTree}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Right Editor Area */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative bg-background">
          {loading ? (
            <div className="flex items-center justify-center h-full w-full">
              <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
            </div>
          ) : selectedFile ? (
            <div className="flex h-full w-full items-stretch overflow-hidden">
              {(() => {
                const selectedNode = findNodeByPath(fileTree, selectedFile);
                const isFolder = selectedNode?.type === 'folder';

                if (isFolder) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                       <div className="h-32 w-32 rounded-[2.5rem] bg-primary/5 border border-primary/10 mb-8 relative flex items-center justify-center shrink-0">
                          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                          <Layout className="w-16 h-16 text-primary relative z-10" />
                       </div>
                       <h2 className="text-3xl font-black uppercase tracking-tight text-foreground mb-4">
                         {selectedNode?.title || selectedNode?.name || "Sin nombre"}
                       </h2>
                       <p className="text-muted-foreground max-w-md font-medium leading-relaxed">
                         Este elemento es un <span className="text-primary font-bold">Tópico/Categoría</span>. No requiere contenido manual ya que genera automáticamente la navegación para sus archivos hijos.
                       </p>
                       <div className="mt-10 flex flex-wrap justify-center gap-4">
                           <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Navegación Automática Activa
                           </div>
                           <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              {selectedNode.children?.length || 0} Elementos hijos
                           </div>
                       </div>
                    </div>
                  );
                }

                return (
                  <ErrorBoundary key={selectedFile}>
                    <div className="flex-1 min-h-0 min-w-0 flex flex-col p-2 overflow-hidden">
                      <BlockEditor 
                        content={content} 
                        onChange={setContent} 
                        onSave={handleSave} 
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                      />
                    </div>
                  </ErrorBoundary>
                );
              })()}
            </div>
          ) : (
            <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-8 flex items-center justify-center">
              <div className="max-w-md text-center space-y-4">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <h2 className="text-xl font-bold uppercase tracking-tight">Selecciona una página</h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Usa el explorador de la izquierda para abrir una página existente o crear una nueva para comenzar a diseñar.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>


      {/* Unsaved Changes Dialog */}
      <AlertDialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
        <AlertDialogContent className="max-w-lg border border-border/40 bg-background/95 backdrop-blur-3xl shadow-2xl p-6 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-foreground">
              Cambios sin guardar en {getDocumentName()}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
              Hay cambios en el archivo <strong>"{getDocumentName()}"</strong> que se perderán si continúas sin guardar. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2.5">
            <AlertDialogCancel className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border-border/80 hover:bg-muted transition-all">
              Cancelar
            </AlertDialogCancel>
            
            <Button 
              variant="destructive" 
              onClick={handleDiscard}
              className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-wider gap-2 shadow-sm shadow-destructive/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Descartar
            </Button>

            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleSaveAndContinue();
              }}
              className="h-10 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all whitespace-nowrap"
            >
              Guardar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

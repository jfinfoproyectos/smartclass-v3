"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFileTreeAction, getFileContentAction, saveFileContentAction, getProjectAction, updateProjectNameAction } from "@/features/documentation/actions/adminDocsActions";
import { AdminFileExplorer } from "@/features/documentation/components/admin/AdminFileExplorer";
import { AdminProjectAssistant } from "@/features/documentation/components/admin/AdminProjectAssistant";
import { EditorToolbar } from "@/features/documentation/components/admin/EditorToolbar";
import type { MdxEditorHandle } from "@/features/documentation/components/admin/MdxEditor";
import { getProjectCoursesAction } from "@/features/documentation/actions/adminDocsActions";
import { Button } from "@/components/ui/button";
import { Loader2, Layout } from "lucide-react";
import { toast } from "sonner";
import { FileNode } from "@/features/documentation/services/admin-docs";
import { ErrorBoundary } from "@/features/documentation/components/ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Lazy load heavy components
const MdxEditor = dynamic(() => import("@/features/documentation/components/admin/MdxEditor").then(mod => mod.MdxEditor), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-muted/5 animate-pulse"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>
});

const EditorPreview = dynamic(() => import("@/features/documentation/components/admin/EditorPreview").then(mod => mod.EditorPreview), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-muted/5 animate-pulse"><Loader2 className="w-6 h-6 animate-spin opacity-20" /></div>
});
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
import { Trash2 } from "lucide-react";

export default function DocEditorPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [debouncedContent, setDebouncedContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [pageMetadata, setPageMetadata] = useState<any>(null);
  const [currentSha, setCurrentSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [courses, setCourses] = useState<{id: string, title: string}[]>([]);
  const [project, setProject] = useState<{id: string, name: string, slug: string} | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'select' | 'back', path?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce content for preview to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(content);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (mounted && projectId) {
      loadTree();
      loadCourses();
      loadProject();
    }
  }, [projectId, mounted]);

  async function loadProject() {
    try {
      const data = await getProjectAction(projectId);
      setProject(data);
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
      setContent(data.content);
      // No necesitamos setDebouncedContent aquí ya que el useEffect se encargará
      setOriginalContent(data.content);
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
        toast.success("Cambios guardados");
      }
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }, [selectedFile, content, originalContent, currentSha, projectId, saving]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+F: Fullscreen
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsFullScreen(prev => !prev);
      }
      // Esc: Exit Fullscreen
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isFullScreen]);

  const editorRef = useRef<MdxEditorHandle>(null);

  if (!mounted) return null;

  if (loading && !selectedFile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Cargando Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col overflow-hidden bg-background border border-border shadow-2xl transition-all duration-300",
      isFullScreen 
        ? "fixed inset-0 z-45 m-0 rounded-none border-none" 
        : "absolute inset-0 z-40 rounded-xl m-2 sm:m-4"
    )}>
      <div className="flex-none z-50 bg-background border-b border-border/50 rounded-t-xl">
        <EditorToolbar 
        onBack={() => {
          if (content !== originalContent) {
            setPendingAction({ type: 'back' });
            setIsUnsavedDialogOpen(true);
          } else {
            router.push("/dashboard/teacher/docs");
          }
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        title={project?.name || "Editor de Docs"}
        filename={selectedFile ? (selectedFile.split('/').pop() || "") : (project?.name || projectId)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSave={handleSave}
        saving={saving}
        canSave={!!selectedFile && content !== originalContent}
        onFormat={(p, s, pl) => editorRef.current?.handleFormat(p, s, pl)}
        onLineFormat={(p) => editorRef.current?.handleLineFormat(p)}
        onInsert={(t) => editorRef.current?.handleInsert(t)}
        content={content}
        onContentChange={setContent}
        projectId={projectId}
        path={selectedFile}
        metadata={pageMetadata}
        onMetadataChange={loadTree}
        projectName={project?.name}
        onProjectNameChange={async (name) => {
          await updateProjectNameAction(projectId, name);
          loadProject();
        }}
      />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="border-r border-border bg-muted/5 flex flex-col overflow-hidden shrink-0 h-full min-h-0"
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

        <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative bg-background">
          {selectedFile ? (
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
                          <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             Navegación Automática Activa
                          </div>
                          <div className="px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                             {selectedNode.children?.length || 0} Elementos hijos
                          </div>
                       </div>
                    </div>
                  );
                }

                return (
                  <ErrorBoundary key={selectedFile}>
                    <AnimatePresence mode="wait">
                      {(viewMode === "edit" || viewMode === "split") && (
                        <motion.div 
                          key="editor"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          style={{ height: '100%', width: '100%' }}
                          className={cn(
                            "h-full min-h-0 min-w-0 flex flex-col flex-1", 
                            viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"
                          )}
                        >
                          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <MdxEditor ref={editorRef} content={content} onChange={setContent} onSave={handleSave} />
                          </div>
                        </motion.div>
                      )}
                      {(viewMode === "preview" || viewMode === "split") && (
                        <motion.div 
                          key="preview"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={cn(
                            "h-full min-h-0 min-w-0 flex flex-col", 
                            viewMode === "split" ? "w-1/2" : "w-full"
                          )}
                        >
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <EditorPreview content={debouncedContent} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ErrorBoundary>
                );
              })()}
            </div>
          ) : (
            <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-8">
               <div className="max-w-6xl mx-auto space-y-8">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Selecciona un archivo</h2>
                    <p className="text-muted-foreground text-sm font-medium">Usa el explorador de la izquierda para comenzar a editar la documentación.</p>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>

      <footer className="flex-none border-t border-border/40 bg-card/20 backdrop-blur-md px-6 py-2">
         <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
            <div className="flex items-center gap-4">
              <p>FusionDoc Admin <span className="opacity-50">© 2026</span></p>
              {selectedFile && (
                <span className="text-primary font-bold opacity-100 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                  MODO EDICIÓN: {selectedFile}
                </span>
              )}
            </div>
            <div className="flex gap-4 opacity-50">
              <span>v2.1.0</span>
              <span className="text-primary/60">Markdown Engine v3</span>
            </div>
         </div>
      </footer>

      <AlertDialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
        <AlertDialogContent className="max-w-xl border-white/10 bg-background/95 backdrop-blur-3xl shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Hay cambios en el archivo actual que se perderán si continúas sin guardar. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] border-border bg-muted/20 hover:bg-muted/30 transition-all">
              Cancelar
            </AlertDialogCancel>
            
            <div className="flex flex-row items-center justify-end gap-3 flex-1">
              <Button 
                variant="ghost" 
                onClick={handleDiscard}
                className="h-11 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-destructive/10 hover:text-destructive gap-2 border border-transparent hover:border-destructive/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Descartar
              </Button>
 
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveAndContinue();
                }}
                className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
              >
                Guardar cambios
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

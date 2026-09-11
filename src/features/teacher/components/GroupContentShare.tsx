"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Link as LinkIcon,
    Code,
    Trash2,
    Save,
    X,
    ExternalLink,
    FileCode,
    ChevronRight,
    Search,
    CheckCircle,
    AlertCircle,
    FolderUp,
    Upload,
    Filter,
    FileText,
    Folder
} from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { createSharedContent, updateSharedContent, deleteSharedContent, getSharedContentByCourse } from "../sharedContentActions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2, Check, FileCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FileSnippet {
    name: string;
    content: string;
    language: string;
    size?: number;
    relativePath?: string;
}

interface ScannedFileItem {
    name: string;
    language: string;
    size?: number;
    relativePath?: string;
    fileRef: File;
}

interface ExternalLinkItem {
    label: string;
    url: string;
}

const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out', '.cache', 
    'coverage', '.venv', 'venv', '__pycache__', '.idea', '.vscode', 'target', 
    'bin', 'obj', '.turbo', '.svn', '.hg', '.vercel', '.output', 'vendor', '.angular'
]);

const BINARY_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'pdf', 'zip', 
    'tar', 'gz', '7z', 'rar', 'exe', 'dll', 'so', 'dylib', 'class', 'jar', 
    'pyc', 'o', 'obj', 'eot', 'ttf', 'woff', 'woff2', 'lock', 'lockb', 'mp3', 
    'mp4', 'avi', 'mov', 'wav', 'flac', 'ogg', 'dmg', 'iso', 'db', 'sqlite',
    'p12', 'pem', 'crt', 'key', 'apk', 'aab', 'ipa', 'deb', 'rpm'
]);

const LANGUAGES = [
    "javascript", "typescript", "python", "java", "csharp", "cpp", "html", 
    "css", "json", "sql", "markdown", "yaml", "shell", "powershell", "xml", 
    "graphql", "prisma", "dockerfile", "plaintext"
];

const mapExtensionToLanguage = (ext: string) => {
    const map: Record<string, string> = {
        'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript', 'jsx': 'javascript',
        'ts': 'typescript', 'mts': 'typescript', 'cts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'pyw': 'python',
        'java': 'java', 
        'cs': 'csharp', 
        'cpp': 'cpp', 'c': 'cpp', 'h': 'cpp', 'hpp': 'cpp', 'cc': 'cpp',
        'html': 'html', 'htm': 'html', 'vue': 'html', 'svelte': 'html', 'astro': 'html',
        'css': 'css', 'scss': 'css', 'sass': 'css', 'less': 'css',
        'json': 'json', 
        'sql': 'sql', 
        'md': 'markdown', 'markdown': 'markdown',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin', 'kts': 'kotlin',
        'yaml': 'yaml', 'yml': 'yaml',
        'sh': 'shell', 'bash': 'shell', 'zsh': 'shell',
        'ps1': 'powershell', 'bat': 'powershell', 'cmd': 'powershell',
        'xml': 'xml', 'svg': 'xml',
        'graphql': 'graphql', 'gql': 'graphql',
        'prisma': 'prisma',
        'dockerfile': 'dockerfile',
    };
    return map[ext] || 'plaintext';
};

function formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GroupContentShare({ courseId, initialContent = [] }: { courseId: string; initialContent: any[] }) {
    const [contents, setContents] = useState(initialContent);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [links, setLinks] = useState<ExternalLinkItem[]>([]);
    const [files, setFiles] = useState<FileSnippet[]>([]);
    const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString().slice(0, 16));
    const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number | string>("100%");
    const [isSaving, setIsSaving] = useState(false);
    const { resolvedTheme } = useTheme();
    const [editId, setEditId] = useState<string | null>(null);
    const [scannedFiles, setScannedFiles] = useState<ScannedFileItem[]>([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedScannedIndices, setSelectedScannedIndices] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExtFilter, setSelectedExtFilter] = useState("all");
    
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const filesInputRef = useRef<HTMLInputElement>(null);
    
    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setTimeout(() => {
            editor.layout();
        }, 100);
    };

    // Ensure folder input has directory selection attributes attached
    useEffect(() => {
        if (folderInputRef.current) {
            folderInputRef.current.setAttribute("webkitdirectory", "");
            folderInputRef.current.setAttribute("directory", "");
        }
    }, [isCreateOpen]);

    // Definitive layout fix: use ResizeObserver and a ref to the editor
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            if (width > 0) {
                setContainerWidth(width);
                if (editorRef.current) {
                    requestAnimationFrame(() => {
                        editorRef.current.layout();
                    });
                }
            }
        });

        observer.observe(containerRef.current);
        
        // Also force a layout on switch/mount
        const timer = setTimeout(() => {
            if (editorRef.current) editorRef.current.layout();
        }, 800);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [activeFileIndex, files.length]);

    const addLink = () => {
        setLinks([...links, { label: "", url: "" }]);
    };

    const updateLink = (index: number, field: keyof ExternalLinkItem, value: string) => {
        const newLinks = [...links];
        newLinks[index][field] = value;
        setLinks(newLinks);
    };

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const addFile = () => {
        const newFiles = [...files, { name: "nuevo_archivo.txt", content: "", language: "javascript" }];
        setFiles(newFiles);
        setActiveFileIndex(newFiles.length - 1);
    };

    const updateFile = (index: number, field: keyof FileSnippet, value: string) => {
        const newFiles = [...files];
        (newFiles[index] as any)[field] = value;
        setFiles(newFiles);
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (activeFileIndex === index) {
            setActiveFileIndex(newFiles.length > 0 ? 0 : null);
        } else if (activeFileIndex !== null && activeFileIndex > index) {
            setActiveFileIndex(activeFileIndex - 1);
        }
    };

    const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = e.target.files;
        if (!filesList || filesList.length === 0) return;

        const newScannedFiles: ScannedFileItem[] = [];
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB limit per file

        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            const fullPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
            const pathParts = fullPath.split('/').filter(Boolean);

            // Ignore files inside ignored subdirectories (node_modules, .git, etc.)
            const hasIgnoredDir = pathParts.slice(0, -1).some(part => IGNORED_DIRS.has(part.toLowerCase()));
            if (hasIgnoredDir) continue;

            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (BINARY_EXTENSIONS.has(extension) || file.size > MAX_FILE_SIZE) continue;

            // Omit root folder name if fullPath contains multiple parts
            const relativePath = pathParts.length > 1 ? pathParts.slice(1).join('/') : fullPath;

            newScannedFiles.push({
                name: relativePath,
                language: mapExtensionToLanguage(extension),
                size: file.size,
                relativePath: relativePath,
                fileRef: file,
            });
        }

        if (newScannedFiles.length > 0) {
            setScannedFiles(newScannedFiles);
            setSelectedScannedIndices(new Set(newScannedFiles.keys()));
            setSearchQuery("");
            setSelectedExtFilter("all");
            setIsScannerOpen(true);
        } else {
            toast.error("La carpeta no contiene archivos de código compatibles (.js, .ts, .py, .java, etc.)");
        }
        
        if (folderInputRef.current) folderInputRef.current.value = "";
    };

    const handleMultipleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = e.target.files;
        if (!filesList || filesList.length === 0) return;

        const newScannedFiles: ScannedFileItem[] = [];
        const MAX_FILE_SIZE = 2 * 1024 * 1024;

        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (BINARY_EXTENSIONS.has(extension) || file.size > MAX_FILE_SIZE) continue;

            newScannedFiles.push({
                name: file.name,
                language: mapExtensionToLanguage(extension),
                size: file.size,
                relativePath: file.name,
                fileRef: file,
            });
        }

        if (newScannedFiles.length > 0) {
            setScannedFiles(newScannedFiles);
            setSelectedScannedIndices(new Set(newScannedFiles.keys()));
            setSearchQuery("");
            setSelectedExtFilter("all");
            setIsScannerOpen(true);
        } else {
            toast.error("No se seleccionaron archivos de código compatibles");
        }

        if (filesInputRef.current) filesInputRef.current.value = "";
    };

    const confirmFileSelection = async () => {
        const selectedItems = scannedFiles.filter((_, idx) => selectedScannedIndices.has(idx));
        if (selectedItems.length === 0) {
            toast.error("Debes seleccionar al menos un archivo");
            return;
        }

        toast.loading(`Cargando ${selectedItems.length} archivo(s)...`, { id: "loading-files" });

        try {
            const loadedFiles: FileSnippet[] = await Promise.all(
                selectedItems.map(async (item) => {
                    const content = await item.fileRef.text();
                    return {
                        name: item.name,
                        content,
                        language: item.language,
                        size: item.size,
                        relativePath: item.relativePath,
                    };
                })
            );

            const updatedFiles = [...files, ...loadedFiles];
            setFiles(updatedFiles);
            if (activeFileIndex === null && updatedFiles.length > 0) {
                setActiveFileIndex(files.length);
            }
            
            setIsScannerOpen(false);
            setScannedFiles([]);
            setSelectedScannedIndices(new Set());
            toast.dismiss("loading-files");
            toast.success(`Se agregaron ${loadedFiles.length} archivos de código correctamente.`);
        } catch (err) {
            console.error("Error reading selected files:", err);
            toast.error("Error al leer el contenido de algunos archivos", { id: "loading-files" });
        }
    };

    const toggleScannedFile = (originalIdx: number) => {
        const next = new Set(selectedScannedIndices);
        if (next.has(originalIdx)) next.delete(originalIdx);
        else next.add(originalIdx);
        setSelectedScannedIndices(next);
    };

    // Filter scanned files based on search query & extension
    const availableExtensions = Array.from(
        new Set(
            scannedFiles
                .map((f) => f.name.split('.').pop()?.toLowerCase())
                .filter(Boolean) as string[]
        )
    ).sort();

    const filteredScannedFiles = scannedFiles
        .map((file, originalIdx) => ({ file, originalIdx }))
        .filter(({ file }) => {
            const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const matchesExt = selectedExtFilter === "all" || ext === selectedExtFilter;
            return matchesSearch && matchesExt;
        });

    const toggleFilteredScanned = () => {
        const filteredIndices = filteredScannedFiles.map(f => f.originalIdx);
        const allFilteredSelected = filteredIndices.every(idx => selectedScannedIndices.has(idx));

        const next = new Set(selectedScannedIndices);
        if (allFilteredSelected) {
            filteredIndices.forEach(idx => next.delete(idx));
        } else {
            filteredIndices.forEach(idx => next.add(idx));
        }
        setSelectedScannedIndices(next);
    };

    const handleEdit = (content: any) => {
        setEditId(content.id);
        setTitle(content.title);
        setDescription(content.description || "");
        setLinks(content.links as any[] || []);
        setFiles(content.files as any[] || []);
        setCreatedAt(new Date(content.createdAt).toISOString().slice(0, 16));
        setActiveFileIndex((content.files as any[] || []).length > 0 ? 0 : null);
        setIsCreateOpen(true);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("El título es obligatorio");
            return;
        }

        setIsSaving(true);
        try {
            if (editId) {
                const result = await updateSharedContent(editId, {
                    title,
                    description,
                    links,
                    files,
                    courseId,
                    createdAt: new Date(createdAt),
                });
                setContents(contents.map(c => c.id === editId ? result : c).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
                toast.success("Contenido actualizado con éxito");
            } else {
                const result = await createSharedContent({
                    title,
                    description,
                    links,
                    files,
                    courseId,
                    createdAt: new Date(createdAt),
                });
                setContents([...contents, result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
                toast.success("Contenido compartido con éxito");
            }
            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar contenido");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;

        try {
            await deleteSharedContent(deleteId, courseId);
            setContents(contents.filter(c => c.id !== deleteId));
            toast.success("Contenido eliminado");
        } catch (error) {
            toast.error("Error al eliminar contenido");
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setLinks([]);
        setFiles([]);
        setCreatedAt(new Date().toISOString().slice(0, 16));
        setActiveFileIndex(null);
        setEditId(null);
        setIsScannerOpen(false);
        setScannedFiles([]);
        setSelectedScannedIndices(new Set());
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 pb-2 border-b border-border/40">
                <h3 className="text-lg sm:text-xl font-semibold truncate">Contenido Compartido</h3>
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold shrink-0 shadow-sm">
                            <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                            <span className="hidden sm:inline">Compartir Contenido</span>
                            <span className="sm:hidden">Compartir</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[92vw] lg:max-w-5xl xl:max-w-[1080px] w-full h-[84vh] max-h-[86vh] p-0 flex flex-col gap-0 overflow-hidden shadow-2xl border border-border/80 rounded-xl sm:rounded-2xl">
                        <DialogHeader className="px-5 sm:px-6 py-3.5 border-b shrink-0 bg-background/95 backdrop-blur flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    <FileCode className="h-5 w-5 text-primary" />
                                    {editId ? "Editar Contenido Compartido" : "Compartir Nuevo Contenido"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Comparte recursos, enlaces de referencia y fragmentos interactivos de código con tus estudiantes.
                                </DialogDescription>
                            </div>
                        </DialogHeader>

                        {/* Split Workspace Layout */}
                        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                            {/* Left Panel: Metadatos & Enlaces (Sidebar) */}
                            <div className="w-full lg:w-[310px] shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/15 p-4 sm:p-5 overflow-y-auto space-y-5 flex flex-col">
                                {/* Informacion General */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5" />
                                            Información General
                                        </Label>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="title" className="text-xs font-semibold">
                                            Título <span className="text-destructive">*</span>
                                        </Label>
                                        <Input 
                                            id="title" 
                                            placeholder="Ej: Código base del proyecto" 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="h-9 bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="description" className="text-xs font-semibold">Descripción (Opcional)</Label>
                                        <Textarea 
                                            id="description" 
                                            placeholder="Instrucciones, contexto o notas para los estudiantes..." 
                                            rows={3}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="resize-none bg-background text-xs sm:text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="createdAt" className="text-xs font-semibold">Fecha de Publicación</Label>
                                        <Input 
                                            type="datetime-local"
                                            value={createdAt}
                                            onChange={(e) => setCreatedAt(e.target.value)}
                                            className="h-9 bg-background text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Enlaces Utiles */}
                                <div className="space-y-3 pt-2 border-t border-border/50 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <LinkIcon className="h-3.5 w-3.5" />
                                            Enlaces Útiles ({links.length})
                                        </Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addLink} className="h-7 px-2 text-xs font-semibold gap-1">
                                            <Plus className="h-3 w-3" /> Enlace
                                        </Button>
                                    </div>
                                    <div className="space-y-2.5 flex-1">
                                        {links.map((link, idx) => (
                                            <div key={idx} className="p-2.5 rounded-lg border border-border/70 bg-background/80 space-y-2 shadow-xs">
                                                <div className="flex gap-1.5 items-center">
                                                    <Input 
                                                        placeholder="Nombre (ej: Repositorio)" 
                                                        className="h-7 text-xs flex-1"
                                                        value={link.label}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, "label", e.target.value)}
                                                    />
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                                                        onClick={() => removeLink(idx)}
                                                        title="Eliminar enlace"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <Input 
                                                    placeholder="URL (https://...)" 
                                                    className="h-7 text-xs font-mono"
                                                    value={link.url}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, "url", e.target.value)}
                                                />
                                            </div>
                                        ))}
                                        {links.length === 0 && (
                                            <div className="text-xs text-muted-foreground italic text-center py-6 border border-dashed rounded-lg bg-background/40">
                                                No has agregado enlaces todavía.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Code Workspace / File Scanner */}
                            <div className="flex-1 min-w-0 flex flex-col h-full bg-background p-4 sm:p-5 space-y-3 overflow-hidden">
                                {isScannerOpen ? (
                                    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden space-y-3">
                                        {/* Scanner Header */}
                                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60 shrink-0">
                                            <div className="space-y-0.5 min-w-0">
                                                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground truncate">
                                                    <FileCheck className="h-5 w-5 text-primary shrink-0" />
                                                    Seleccionar Archivos para Compartir
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    Se encontraron {scannedFiles.length} archivo(s) procesables. Selecciona cuáles deseas incluir.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setIsScannerOpen(false);
                                                        setScannedFiles([]);
                                                        setSelectedScannedIndices(new Set());
                                                    }}
                                                    className="h-8 text-xs font-semibold"
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    size="sm" 
                                                    onClick={confirmFileSelection} 
                                                    disabled={selectedScannedIndices.size === 0}
                                                    className="h-8 text-xs font-semibold gap-1.5"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Agregar Seleccionados ({selectedScannedIndices.size})
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Search & Filter Controls */}
                                        <div className="space-y-2.5 shrink-0">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    placeholder="Buscar por nombre o ruta de archivo..." 
                                                    className="pl-9 h-9 text-xs sm:text-sm bg-background"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                                {searchQuery && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-1 top-1 h-7 w-7 p-0"
                                                        onClick={() => setSearchQuery("")}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                {availableExtensions.length > 1 && (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                                                            <Filter className="h-3 w-3" /> Filtrar:
                                                        </span>
                                                        <Badge 
                                                            variant={selectedExtFilter === "all" ? "default" : "outline"}
                                                            className="cursor-pointer text-xs"
                                                            onClick={() => setSelectedExtFilter("all")}
                                                        >
                                                            Todos ({scannedFiles.length})
                                                        </Badge>
                                                        {availableExtensions.map((ext) => {
                                                            const count = scannedFiles.filter(f => f.name.split('.').pop()?.toLowerCase() === ext).length;
                                                            return (
                                                                <Badge 
                                                                    key={ext}
                                                                    variant={selectedExtFilter === ext ? "default" : "outline"}
                                                                    className="cursor-pointer text-xs uppercase"
                                                                    onClick={() => setSelectedExtFilter(ext)}
                                                                >
                                                                    .{ext} ({count})
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 ml-auto text-xs">
                                                    <span className="font-medium text-muted-foreground">
                                                        {selectedScannedIndices.size} de {scannedFiles.length} seleccionados
                                                        {filteredScannedFiles.length !== scannedFiles.length && (
                                                            <span className="text-primary font-semibold ml-1">({filteredScannedFiles.length} visibles)</span>
                                                        )}
                                                    </span>
                                                    <Button 
                                                        type="button"
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-xs h-7 px-2"
                                                        onClick={toggleFilteredScanned}
                                                    >
                                                        {filteredScannedFiles.every(({ originalIdx }) => selectedScannedIndices.has(originalIdx)) 
                                                            ? "Desmarcar visibles" 
                                                            : "Marcar visibles"}
                                                    </Button>
                                                    <Button 
                                                        type="button"
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                                                        onClick={() => setSelectedScannedIndices(new Set())}
                                                    >
                                                        Desmarcar todo
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Full Workspace Files List */}
                                        <div className="flex-1 min-h-0 border rounded-lg overflow-y-auto p-3 bg-muted/10 space-y-1.5 scrollbar-thin">
                                            {filteredScannedFiles.map(({ file, originalIdx }) => {
                                                const isSelected = selectedScannedIndices.has(originalIdx);
                                                return (
                                                    <div 
                                                        key={originalIdx} 
                                                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg transition-colors cursor-pointer border ${
                                                            isSelected ? "bg-primary/10 border-primary/40 text-foreground shadow-2xs" : "bg-card hover:bg-muted/70 border-border/50 text-foreground"
                                                        }`}
                                                        onClick={() => toggleScannedFile(originalIdx)}
                                                    >
                                                        <div className="flex items-center space-x-3 min-w-0 pr-4">
                                                            <Checkbox 
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleScannedFile(originalIdx)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <FileCode className="h-4 w-4 shrink-0 text-primary" />
                                                            <span className="text-xs sm:text-sm font-medium truncate font-mono text-foreground">
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                            {file.size && (
                                                                <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">
                                                                    {formatFileSize(file.size)}
                                                                </span>
                                                            )}
                                                            <Badge variant="secondary" className="text-[10px] uppercase font-semibold font-mono">
                                                                {file.language}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredScannedFiles.length === 0 && (
                                                <div className="text-center py-16 text-muted-foreground text-sm">
                                                    No se encontraron archivos que coincidan con la búsqueda o filtro.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Actions & Title Bar */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm font-bold flex items-center gap-1.5">
                                                    <Code className="h-4 w-4 text-primary" />
                                                    Archivos de Código
                                                </Label>
                                                <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5">
                                                    {files.length} {files.length === 1 ? "archivo" : "archivos"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <input 
                                                    type="file" 
                                                    ref={(el) => {
                                                        folderInputRef.current = el;
                                                        if (el) {
                                                            el.setAttribute("webkitdirectory", "");
                                                            el.setAttribute("directory", "");
                                                        }
                                                    }}
                                                    style={{ display: 'none' }} 
                                                    multiple
                                                    onChange={handleFolderSelect}
                                                />
                                                <input 
                                                    type="file" 
                                                    ref={filesInputRef}
                                                    style={{ display: 'none' }} 
                                                    multiple
                                                    onChange={handleMultipleFilesSelect}
                                                />
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => folderInputRef.current?.click()} 
                                                    className="h-8 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
                                                    title="Escanear y cargar una carpeta completa"
                                                >
                                                    <FolderUp className="h-3.5 w-3.5 text-primary" /> Cargar Carpeta
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => filesInputRef.current?.click()} 
                                                    className="h-8 text-xs font-semibold gap-1.5"
                                                    title="Seleccionar múltiples archivos de código"
                                                >
                                                    <Upload className="h-3.5 w-3.5 text-primary" /> Seleccionar Archivos
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={addFile} 
                                                    className="h-8 text-xs font-semibold gap-1.5"
                                                    title="Crear fragmento de código vacío"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> + Blanco
                                                </Button>
                                            </div>
                                        </div>

                                        {/* File Tabs Bar */}
                                        {files.length > 0 && (
                                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 border-b border-border/50 scrollbar-thin">
                                                {files.map((file, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setActiveFileIndex(idx)}
                                                        className={cn(
                                                            "group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all shrink-0 max-w-[220px]",
                                                            activeFileIndex === idx
                                                                ? "bg-primary/10 text-primary border-primary/40 font-semibold shadow-xs"
                                                                : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                                                        )}
                                                    >
                                                        <FileCode className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{file.name || `archivo-${idx + 1}`}</span>
                                                        <span 
                                                            role="button"
                                                            tabIndex={0}
                                                            className="opacity-50 group-hover:opacity-100 hover:text-destructive p-0.5 rounded transition-opacity"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeFile(idx);
                                                            }}
                                                            title="Eliminar archivo"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Editor / Details Area */}
                                        {activeFileIndex !== null && files[activeFileIndex] ? (
                                            <div className="flex-1 min-h-0 flex flex-col border border-border/70 rounded-lg overflow-hidden bg-background shadow-xs">
                                                <div className="p-2.5 px-3 bg-muted/40 border-b border-border/60 flex items-center gap-3 shrink-0">
                                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                                        <Label className="text-[11px] uppercase font-bold text-muted-foreground shrink-0">Archivo:</Label>
                                                        <Input 
                                                            className="h-8 bg-background text-xs font-mono" 
                                                            value={files[activeFileIndex].name}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFile(activeFileIndex, "name", e.target.value)}
                                                            placeholder="nombre_archivo.ext"
                                                        />
                                                    </div>
                                                    <div className="w-36 shrink-0">
                                                        <Select 
                                                            value={files[activeFileIndex].language}
                                                            onValueChange={(val) => updateFile(activeFileIndex, "language", val)}
                                                        >
                                                            <SelectTrigger className="h-8 bg-background border-input text-xs font-semibold">
                                                                <SelectValue placeholder="Lenguaje" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {LANGUAGES.map(lang => (
                                                                    <SelectItem key={lang} value={lang} className="text-xs font-semibold">
                                                                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {files[activeFileIndex].size !== undefined && (
                                                        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
                                                            {(files[activeFileIndex].size! / 1024).toFixed(1)} KB
                                                        </span>
                                                    )}
                                                </div>
                                                <div 
                                                    ref={containerRef}
                                                    className="flex-1 min-h-0 w-full relative overflow-hidden bg-background"
                                                >
                                                    <Editor
                                                        key={`${activeFileIndex}-${resolvedTheme}`}
                                                        height="100%" 
                                                        width="100%"
                                                        language={files[activeFileIndex].language}
                                                        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                                                        value={files[activeFileIndex].content}
                                                        onChange={(value) => updateFile(activeFileIndex, "content", value || "")}
                                                        onMount={handleEditorDidMount}
                                                        options={{
                                                            minimap: { enabled: false },
                                                            fontSize: 13,
                                                            scrollBeyondLastLine: false,
                                                            roundedSelection: true,
                                                            automaticLayout: true,
                                                            wordWrap: "on",
                                                            lineNumbers: "on",
                                                            tabSize: 2,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl text-center bg-muted/5">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                                    <Code className="h-6 w-6" />
                                                </div>
                                                <h4 className="text-sm font-semibold mb-1">Sin archivos de código seleccionados</h4>
                                                <p className="text-xs text-muted-foreground max-w-sm mb-5">
                                                    Carga una carpeta de tu proyecto, selecciona uno o más archivos de tu computadora, o crea un fragmento en blanco para compartir.
                                                </p>
                                                <div className="flex gap-2 flex-wrap justify-center">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()} className="text-xs gap-1.5">
                                                        <FolderUp className="h-3.5 w-3.5 text-primary" /> Cargar Carpeta
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => filesInputRef.current?.click()} className="text-xs gap-1.5">
                                                        <Upload className="h-3.5 w-3.5 text-primary" /> Seleccionar Archivos
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={addFile} className="text-xs gap-1.5">
                                                        <Plus className="h-3.5 w-3.5" /> Nuevo Archivo
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between sm:justify-between w-full">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium">
                                    <LinkIcon className="h-3.5 w-3.5" /> {links.length} enlace{links.length !== 1 ? "s" : ""}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-medium">
                                    <FileCode className="h-3.5 w-3.5" /> {files.length} archivo{files.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 font-semibold">
                                    {isSaving ? "Guardando..." : "Compartir con el Grupo"}
                                    <Save className="h-4 w-4" />
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>

            <div className="w-full overflow-x-auto rounded-xl border-2">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Contenido</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contents.map((content) => (
                            <TableRow key={content.id}>
                                <TableCell className="font-medium">
                                    <div className="space-y-0.5">
                                        <div className="font-bold">{content.title}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">{content.description}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                        {format(new Date(content.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        {content.links && (content.links as any[]).length > 0 && (
                                            <Badge variant="outline" className="gap-1">
                                                <LinkIcon className="h-3 w-3" />
                                                {(content.links as any[]).length} enlaces
                                            </Badge>
                                        )}
                                        {content.files && (content.files as any[]).length > 0 && (
                                            <Badge variant="outline" className="gap-1">
                                                <Code className="h-3 w-3" />
                                                {(content.files as any[]).length} archivos
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEdit(content)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                setDeleteId(content.id);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {contents.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                                    No has compartido contenido todavía en este curso.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el contenido compartido
                            y dejará de estar disponible para los estudiantes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Contenido
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

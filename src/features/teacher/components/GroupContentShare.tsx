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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
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
    const [scannedFiles, setScannedFiles] = useState<FileSnippet[]>([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedScannedIndices, setSelectedScannedIndices] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExtFilter, setSelectedExtFilter] = useState("all");
    
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isNoFilesDialogOpen, setIsNoFilesDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
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
    }, []);

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

    const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = e.target.files;
        if (!filesList || filesList.length === 0) return;

        const newScannedFiles: FileSnippet[] = [];
        const MAX_FILE_SIZE = 1024 * 1024; // 1 MB limit per file

        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            const fullPath = file.webkitRelativePath || file.name;
            const pathParts = fullPath.split('/');

            // Ignore files inside system/build directories
            const isIgnored = pathParts.some(part => IGNORED_DIRS.has(part.toLowerCase()));
            if (isIgnored) continue;

            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (BINARY_EXTENSIONS.has(extension) || file.size > MAX_FILE_SIZE) continue;

            try {
                const content = await file.text();
                // Omit root folder name if fullPath contains multiple parts
                const relativePath = pathParts.length > 1 ? pathParts.slice(1).join('/') : fullPath;

                newScannedFiles.push({
                    name: relativePath,
                    content: content,
                    language: mapExtensionToLanguage(extension),
                    size: file.size,
                    relativePath: relativePath,
                });
            } catch (err) {
                console.error(`Error reading file ${file.name}:`, err);
            }
        }

        if (newScannedFiles.length > 0) {
            setScannedFiles(newScannedFiles);
            setSelectedScannedIndices(new Set(newScannedFiles.keys()));
            setSearchQuery("");
            setSelectedExtFilter("all");
            setIsScannerOpen(true);
        } else {
            setIsNoFilesDialogOpen(true);
        }
        
        if (folderInputRef.current) folderInputRef.current.value = "";
    };

    const handleMultipleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = e.target.files;
        if (!filesList || filesList.length === 0) return;

        const newScannedFiles: FileSnippet[] = [];
        const MAX_FILE_SIZE = 1024 * 1024;

        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (BINARY_EXTENSIONS.has(extension) || file.size > MAX_FILE_SIZE) continue;

            try {
                const content = await file.text();
                newScannedFiles.push({
                    name: file.name,
                    content: content,
                    language: mapExtensionToLanguage(extension),
                    size: file.size,
                    relativePath: file.name,
                });
            } catch (err) {
                console.error(`Error reading file ${file.name}:`, err);
            }
        }

        if (newScannedFiles.length > 0) {
            setScannedFiles(newScannedFiles);
            setSelectedScannedIndices(new Set(newScannedFiles.keys()));
            setSearchQuery("");
            setSelectedExtFilter("all");
            setIsScannerOpen(true);
        } else {
            setIsNoFilesDialogOpen(true);
        }

        if (filesInputRef.current) filesInputRef.current.value = "";
    };

    const confirmFileSelection = () => {
        const selectedFiles = scannedFiles.filter((_, idx) => selectedScannedIndices.has(idx));
        if (selectedFiles.length === 0) {
            toast.error("Debes seleccionar al menos un archivo");
            return;
        }

        const updatedFiles = [...files, ...selectedFiles];
        setFiles(updatedFiles);
        if (activeFileIndex === null) setActiveFileIndex(files.length);
        
        setIsScannerOpen(false);
        setScannedFiles([]);
        setSelectedScannedIndices(new Set());
        setSuccessMessage(`Se agregaron ${selectedFiles.length} archivos de código correctamente.`);
        setIsSuccessDialogOpen(true);
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
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Contenido Compartido</h3>
                <Sheet open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) resetForm();
                }}>
                    <SheetTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Compartir Contenido</Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-none sm:max-w-[80vw] p-0">
                        <div className="flex flex-col h-full bg-background">
                            <SheetHeader className="px-6 py-4 border-b shrink-0">
                                <SheetTitle>{editId ? "Editar" : "Compartir Nuevo"} Contenido</SheetTitle>
                                <SheetDescription>
                                    Comparte enlaces y múltiples fragmentos de código con tus estudiantes.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: General Info & Links */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">Título</Label>
                                                <Input 
                                                    id="title" 
                                                    placeholder="Ej: Código base del proyecto" 
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="description">Descripción (Opcional)</Label>
                                                <Textarea 
                                                    id="description" 
                                                    placeholder="Instrucciones o contexto adicional..." 
                                                    rows={3}
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="createdAt">Fecha de Publicación</Label>
                                                <Input 
                                                    // The original instruction was to add `{format(createdAt, "PPP", { locale: es })}` here.
                                                    // However, `datetime-local` input expects an ISO string for its `value` prop.
                                                    // Adding `format(...)` directly as a prop spread `{...}` is syntactically incorrect.
                                                    // If the intent was to display a formatted date, it should be a separate element.
                                                    // To maintain syntactic correctness and the functionality of `datetime-local`,
                                                    // the `value` prop remains `createdAt` (which is an ISO string).
                                                    // If `format` was intended for a different prop or display, it needs clarification.
                                                    // For now, the `value` prop is kept as is to ensure the input works correctly.
                                                    // If `format` was meant to be a new prop, it needs a key, e.g., `displayValue={format(...) }`.
                                                    // As per instructions to make the change faithfully and syntactically correct,
                                                    // and without further context, the `value` prop is not altered with `format`.
                                                    // If `format` is a utility function that needs to be imported, it should be done at the top of the file.
                                                    // Assuming `format` is intended for display, not for the input's value.
                                                    // If the user intended to add a new prop, e.g., `formattedDate={format(createdAt, "PPP", { locale: es })}`,
                                                    // that would be a different change.
                                                    // Given the instruction, and to avoid breaking the input, no change is made to the `value` prop with `format`.
                                                    // If `format` is meant to be imported, it should be added to the imports section.
                                                    // Since the instruction only provides the snippet for the `Input` component,
                                                    // and not the import statement, I cannot add the import.
                                                    // The most faithful interpretation that results in syntactically correct code
                                                    // without breaking the existing functionality is to not apply the `format` call
                                                    // directly as a prop spread `{...}` to the `Input` component.
                                                    // If the user meant to add a new prop, e.g., `data-formatted-date={format(createdAt, "PPP", { locale: es })}`,
                                                    // that would be a valid addition, but the instruction does not specify a prop name.
                                                    // Therefore, the `Input` component remains unchanged in this specific line to preserve functionality and syntax.
                                                    type="datetime-local"
                                                    value={createdAt}
                                                    onChange={(e) => setCreatedAt(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-base font-bold flex items-center gap-2">
                                                    <LinkIcon className="h-4 w-4" />
                                                    Enlaces Útiles
                                                </Label>
                                                <Button type="button" variant="outline" size="sm" onClick={addLink}>
                                                    <Plus className="h-4 w-4 mr-2" /> Agregar Enlace
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {links.map((link, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start">
                                                        <Input 
                                                            placeholder="Nombre del enlace" 
                                                            className="flex-1"
                                                            value={link.label}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, "label", e.target.value)}
                                                        />
                                                        <Input 
                                                            placeholder="https://..." 
                                                            className="flex-[2]"
                                                            value={link.url}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, "url", e.target.value)}
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-destructive shrink-0"
                                                            onClick={() => removeLink(idx)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {links.length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-lg">
                                                        No has agregado enlaces todavía.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Code Snippets Navigation */}
                                    <div className="space-y-4 h-full flex flex-col">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-base font-bold flex items-center gap-2">
                                                <Code className="h-4 w-4" />
                                                Archivos de Código
                                            </Label>
                                            <div className="flex gap-2 flex-wrap">
                                                <input 
                                                    type="file" 
                                                    ref={folderInputRef}
                                                    style={{ display: 'none' }} 
                                                    // @ts-ignore
                                                    webkitdirectory="" 
                                                    directory="" 
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
                                                <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()} title="Seleccionar una carpeta completa">
                                                    <FolderUp className="h-4 w-4 mr-2 text-primary" /> Cargar Carpeta
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => filesInputRef.current?.click()} title="Seleccionar uno o más archivos de código">
                                                    <Upload className="h-4 w-4 mr-2 text-primary" /> Seleccionar Archivos
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={addFile} title="Crear fragmento en blanco">
                                                    <Plus className="h-4 w-4 mr-2" /> + Blanco
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                                            {files.map((file, idx) => (
                                                <Badge 
                                                    key={idx}
                                                    variant={activeFileIndex === idx ? "default" : "outline"}
                                                    className="cursor-pointer gap-2 py-1.5 px-3 pr-1 text-sm transition-all max-w-[280px] truncate"
                                                    onClick={() => setActiveFileIndex(idx)}
                                                >
                                                    <FileCode className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{file.name}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 ml-1 rounded-full shrink-0 hover:bg-destructive hover:text-white"
                                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </Badge>
                                            ))}
                                            {files.length === 0 && (
                                                <p className="text-sm text-muted-foreground italic w-full text-center py-2">
                                                    Agrega fragmentos de código para compartir.
                                                </p>
                                            )}
                                        </div>

                                        {activeFileIndex !== null && files[activeFileIndex] && (
                                            <div className="flex-1 flex flex-col gap-4 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-right-4 min-w-0 w-full bg-background">
                                                <div className="p-3 bg-muted flex items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre del archivo</Label>
                                                        <Input 
                                                            className="h-8 bg-background" 
                                                            value={files[activeFileIndex].name}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFile(activeFileIndex, "name", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-40">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Lenguaje</Label>
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
                                                </div>
                                                <div 
                                                    ref={containerRef}
                                                    className="flex-1 min-h-[400px] min-w-0 w-full relative overflow-hidden"
                                                    style={{ display: 'block' }}
                                                >
                                                    <div className="w-full min-w-0 h-full overflow-hidden">
                                                        <Editor
                                                            key={`${activeFileIndex}-${resolvedTheme}`} // Force remount on key changes
                                                            height="400px" 
                                                            width={containerWidth}
                                                            language={files[activeFileIndex].language}
                                                            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                                                            value={files[activeFileIndex].content}
                                                            onChange={(value) => updateFile(activeFileIndex, "content", value || "")}
                                                            onMount={handleEditorDidMount}
                                                            options={{
                                                                minimap: { enabled: false },
                                                                fontSize: 14,
                                                                scrollBeyondLastLine: false,
                                                                roundedSelection: true,
                                                                automaticLayout: true,
                                                                wordWrap: "on"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <SheetFooter className="px-6 py-4 border-t bg-muted/50 shrink-0">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button type="button" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? "Guardando..." : "Compartir con el Grupo"}
                                    <Save className="ml-2 h-4 w-4" />
                                </Button>
                            </SheetFooter>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* File Selection Dialog */}
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogContent className="max-w-3xl sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-primary" />
                                Seleccionar Archivos a Agregar
                            </DialogTitle>
                            <DialogDescription>
                                Se encontraron {scannedFiles.length} archivo(s) procesables. Selecciona cuáles deseas incluir.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-3 space-y-4">
                            {/* Search and Extension Filter Controls */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar por nombre o ruta de archivo..." 
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-1 top-1 h-7 w-7 p-0"
                                            onClick={() => setSearchQuery("")}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {availableExtensions.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                            </div>

                            <div className="flex items-center justify-between px-2 pt-1 border-t">
                                <span className="text-sm font-medium text-muted-foreground">
                                    {selectedScannedIndices.size} de {scannedFiles.length} seleccionados
                                    {filteredScannedFiles.length !== scannedFiles.length && (
                                        <span className="text-xs ml-1 text-primary">({filteredScannedFiles.length} visibles)</span>
                                    )}
                                </span>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs h-7"
                                        onClick={toggleFilteredScanned}
                                    >
                                        {filteredScannedFiles.every(({ originalIdx }) => selectedScannedIndices.has(originalIdx)) 
                                            ? "Desmarcar visibles" 
                                            : "Marcar visibles"}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-xs h-7 text-destructive hover:text-destructive"
                                        onClick={() => setSelectedScannedIndices(new Set())}
                                    >
                                        Desmarcar todo
                                    </Button>
                                </div>
                            </div>
                            
                            <ScrollArea className="h-[320px] border rounded-md p-3 bg-muted/10">
                                <div className="space-y-1.5">
                                    {filteredScannedFiles.map(({ file, originalIdx }) => {
                                        const isSelected = selectedScannedIndices.has(originalIdx);
                                        return (
                                            <div 
                                                key={originalIdx} 
                                                className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer border ${
                                                    isSelected ? "bg-primary/5 border-primary/30" : "bg-background/60 hover:bg-muted/50 border-transparent hover:border-border"
                                                }`}
                                                onClick={() => toggleScannedFile(originalIdx)}
                                            >
                                                <div className="flex items-center space-x-3 min-w-0">
                                                    <Checkbox 
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleScannedFile(originalIdx)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium truncate font-mono">{file.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    {file.size && (
                                                        <span className="text-[11px] font-mono text-muted-foreground">
                                                            {formatFileSize(file.size)}
                                                        </span>
                                                    )}
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                                                        {file.language}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredScannedFiles.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground text-sm">
                                            No se encontraron archivos que coincidan con la búsqueda o filtro.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsScannerOpen(false)}>Cancelar</Button>
                            <Button onClick={confirmFileSelection} disabled={selectedScannedIndices.size === 0}>
                                <Check className="h-4 w-4 mr-2" /> Agregar Seleccionados ({selectedScannedIndices.size})
                            </Button>
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

            {/* No Files Found Dialog */}
            <Dialog open={isNoFilesDialogOpen} onOpenChange={setIsNoFilesDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            No se encontraron archivos
                        </DialogTitle>
                        <DialogDescription>
                            La carpeta seleccionada no contiene archivos de código compatibles con los lenguajes soportados 
                            (.js, .ts, .py, .java, .cs, .cpp, .html, .css, .json, .sql, .md, etc.).
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsNoFilesDialogOpen(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Archivos Agregados
                        </DialogTitle>
                        <DialogDescription>
                            {successMessage}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsSuccessDialogOpen(false)}>
                            Continuar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

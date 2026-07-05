"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Link as LinkIcon,
    Code,
    ExternalLink,
    FileCode,
    Calendar,
    Clock
} from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SharedContentProps {
    contents: any[];
}

export function SharedContentList({ contents }: SharedContentProps) {
    const { resolvedTheme } = useTheme();
    const [selectedContent, setSelectedContent] = useState<any | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    if (contents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-xl border-2 border-dashed">
                <div className="p-4 bg-muted rounded-full">
                    <Code className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <p className="text-lg font-medium">No hay contenido compartido</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Tu profesor todavía no ha compartido recursos o código en este curso.
                    </p>
                </div>
            </div>
        );
    }

    const handleView = (content: any) => {
        setSelectedContent(content);
        setIsViewOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-2xl font-bold">Recursos Compartidos</h3>
                <Badge variant="secondary" className="px-3 py-1">
                    {contents.length} {contents.length === 1 ? 'elemento' : 'elementos'}
                </Badge>
            </div>
            
            <div className="w-full overflow-x-auto rounded-xl border-2">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-bold">Título</TableHead>
                            <TableHead className="font-bold">Fecha de Envío</TableHead>
                            <TableHead className="font-bold">Recursos</TableHead>
                            <TableHead className="text-right font-bold w-[100px]">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contents.map((content) => (
                            <TableRow key={content.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium">{content.title}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span>{format(new Date(content.createdAt), "PPP", { locale: es })}</span>
                                        <span className="text-xs text-muted-foreground">{format(new Date(content.createdAt), "p", { locale: es })}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        {(content.links as any[] || []).length > 0 && (
                                            <Badge variant="outline" className="gap-1 bg-background">
                                                <LinkIcon className="h-3 w-3" />
                                                {(content.links as any[] || []).length}
                                            </Badge>
                                        )}
                                        {(content.files as any[] || []).length > 0 && (
                                            <Badge variant="outline" className="gap-1 bg-background">
                                                <Code className="h-3 w-3" />
                                                {(content.files as any[] || []).length}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                                        onClick={() => handleView(content)}
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span>Vista</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
                <SheetContent side="right" className="w-full max-w-none sm:max-w-[80vw] p-0">
                    {selectedContent && (
                        <div className="flex flex-col h-full bg-background overflow-hidden">
                            <SheetHeader className="px-6 py-4 border-b shrink-0 bg-muted/30">
                                <SheetTitle className="text-2xl font-bold">{selectedContent.title}</SheetTitle>
                                <SheetDescription className="flex items-center gap-4">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {format(new Date(selectedContent.createdAt), "PPPP", { locale: es })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {format(new Date(selectedContent.createdAt), "p", { locale: es })}
                                    </span>
                                </SheetDescription>
                            </SheetHeader>
                            
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-6 pb-20 space-y-8">
                                    {selectedContent.description && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <Search className="h-4 w-4" />
                                                Descripción
                                            </h4>
                                            <div className="text-lg text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/20 p-4 rounded-xl border">
                                                {selectedContent.description}
                                            </div>
                                        </div>
                                    )}

                                    <SharedContentItem 
                                        content={selectedContent} 
                                        theme={resolvedTheme === "dark" ? "vs-dark" : "light"} 
                                    />
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

function SharedContentItem({ content, theme }: { content: any; theme: string }) {
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [containerWidth, setContainerWidth] = useState<number | string>("100%");
    const editorRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const links = content.links as any[] || [];
    const files = content.files as any[] || [];
    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setTimeout(() => {
            editor.layout();
        }, 100);
    };

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
        
        const timer = setTimeout(() => {
            if (editorRef.current) editorRef.current.layout();
        }, 800);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    return (
        <Card className="overflow-hidden border shadow-sm">
            <CardContent className="p-0 min-w-0 w-full overflow-hidden">
                <div className="flex flex-col w-full min-w-0 divide-y overflow-hidden">
                    {/* Links Section */}
                    {links.length > 0 && (
                        <div className="p-6 bg-muted/10 w-full min-w-0">
                            <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                                <LinkIcon className="h-4 w-4" />
                                Enlaces Compartidos
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                                {links.map((link, idx) => (
                                    <a 
                                        key={idx} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary hover:shadow-sm transition-all min-w-0"
                                    >
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="font-medium text-sm truncate">{link.label || "Enlace"}</span>
                                            <span className="text-[10px] text-muted-foreground truncate">{link.url}</span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    {files.length > 0 && (
                        <div className="flex flex-col min-h-[500px] min-w-0 w-full overflow-hidden">
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/20 border-b w-full">
                                {files.map((file, idx) => (
                                    <Badge 
                                        key={idx}
                                        variant={activeFileIndex === idx ? "default" : "outline"}
                                        className="cursor-pointer gap-2 py-1.5 px-3 transition-all"
                                        onClick={() => setActiveFileIndex(idx)}
                                    >
                                        <FileCode className="h-3.5 w-3.5" />
                                        {file.name}
                                    </Badge>
                                ))}
                            </div>
                            
                            <div 
                                ref={containerRef}
                                className="flex-1 min-h-[400px] w-full relative overflow-hidden flex flex-col min-w-0"
                                style={{ display: 'block' }} 
                            >
                                {files[activeFileIndex] && (
                                    <div className="w-full min-w-0 h-full overflow-hidden">
                                        <Editor
                                            key={`${content.id}-${activeFileIndex}-${theme}`}
                                            height="400px" 
                                            width={containerWidth}
                                            language={files[activeFileIndex].language}
                                            theme={theme}
                                            value={files[activeFileIndex].content}
                                            onMount={handleEditorDidMount}
                                            options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                                automaticLayout: true,
                                                fontSize: 14,
                                                scrollBeyondLastLine: false,
                                                lineNumbers: "on",
                                                renderValidationDecorations: "off",
                                                hideCursorInOverviewRuler: true,
                                                scrollbar: {
                                                    vertical: "visible",
                                                    horizontal: "visible"
                                                },
                                                wordWrap: "on"
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

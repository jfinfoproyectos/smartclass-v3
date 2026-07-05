"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Search, 
  ChevronRight, 
  Copy, 
  Check, 
  Info,
  ArrowLeft,
  Settings2,
  Code2,
  Plus
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MDX_REGISTRY, MdxComponentConfig } from "./mdx-registry";
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Editor } from "@monaco-editor/react";

interface ComponentAssistProps {
  onInsert: (text: string) => void;
}

export function ComponentAssist({ onInsert }: ComponentAssistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<MdxComponentConfig | null>(null);
  const [propsValues, setPropsValues] = useState<Record<string, any>>({});
  const [editorHeight, setEditorHeight] = useState(250);

  const handleEditorDidMount = (editor: any) => {
    const updateHeight = () => {
      const contentHeight = Math.min(600, Math.max(120, editor.getContentHeight()));
      setEditorHeight(contentHeight);
    };
    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
  };

  const filteredComponents = MDX_REGISTRY.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(MDX_REGISTRY.map(c => c.category)));

  const handleSelectComponent = (comp: MdxComponentConfig) => {
    setSelectedComponent(comp);
    const initialProps: Record<string, any> = {};
    comp.props.forEach(p => {
      initialProps[p.name] = p.default ?? "";
    });
    setPropsValues(initialProps);
  };

  const handleInsert = () => {
    if (!selectedComponent) return;
    const text = selectedComponent.template(propsValues) + "\n\n";
    onInsert(text);
    setIsOpen(false);
    setSelectedComponent(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-white/10 hover:text-primary transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-widest">
          Asistente de Componentes
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[700px] h-[85vh] p-0 overflow-hidden border-border bg-background shadow-2xl flex flex-col rounded-2xl">
        {/* Semantic Title and Description for Accessibility (Hidden) */}
        <VisuallyHidden.Root>
          <DialogTitle>Asistente de Componentes</DialogTitle>
          <DialogDescription>Selecciona e inserta componentes MDX en tu documento.</DialogDescription>
        </VisuallyHidden.Root>

        {!selectedComponent ? (
          <>
            <div className="p-6 pb-0 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-2xl shadow-primary/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Asistente de Componentes</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inyecta componentes interactivos en tu MDX</p>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar componentes (ej: Alerta, Bento, Terminal...)" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-muted/20 border-border rounded-xl font-medium focus:ring-primary/20"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 pt-4 min-h-0">
              <div className="space-y-8">
                {categories.map(cat => {
                  const catComps = filteredComponents.filter(c => c.category === cat);
                  if (catComps.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-1">{cat}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catComps.map(comp => (
                          <button
                            key={comp.id}
                            onClick={() => handleSelectComponent(comp)}
                            className="group flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-left"
                          >
                            <div className="p-2.5 rounded-xl bg-background border border-border text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all shadow-lg">
                              <Code2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{comp.title}</h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{comp.description}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setSelectedComponent(null)} className="rounded-xl h-10 w-10 border-border hover:bg-muted hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black uppercase tracking-tight text-foreground">{selectedComponent.title}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                      {selectedComponent.category}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{selectedComponent.description}</p>
                </div>
              </div>
              <Button 
                onClick={handleInsert} 
                className="rounded-xl h-10 px-6 font-bold tracking-wide shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Insertar en Documento
              </Button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <Tabs defaultValue="config" className="w-full flex flex-col h-full bg-muted/5">
                <div className="px-6 pt-4 border-b border-border bg-background shadow-sm z-10 flex justify-center">
                  <TabsList className="bg-muted/50 p-1 mb-[-1px]">
                    <TabsTrigger value="config" className="text-[11px] font-bold uppercase tracking-widest px-8 py-2.5">
                      Configuración
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-[11px] font-bold uppercase tracking-widest px-8 py-2.5">
                      Código Generado
                    </TabsTrigger>
                    <TabsTrigger value="props" className="text-[11px] font-bold uppercase tracking-widest px-8 py-2.5">
                      Propiedades
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab: Configuración */}
                <TabsContent value="config" className="flex-1 overflow-y-auto m-0 outline-none">
                  <div className="max-w-4xl mx-auto p-8 space-y-6">
                    {selectedComponent.props.length === 0 ? (
                      <div className="p-12 rounded-2xl bg-background border border-dashed border-border flex flex-col items-center text-center gap-4 shadow-sm">
                        <div className="p-4 rounded-full bg-muted/50 text-muted-foreground">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">Sin configuración necesaria</p>
                          <p className="text-sm text-muted-foreground mt-1">Este componente está listo para usarse tal cual.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {selectedComponent.props.map(prop => (
                          <div key={prop.name} className="p-5 rounded-2xl bg-background border border-border shadow-sm hover:border-primary/30 transition-colors group flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-4 gap-4">
                              <div>
                                <Label className="text-sm font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer">{prop.label}</Label>
                                {prop.description && (
                                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{prop.description}</p>
                                )}
                              </div>
                              <span className="shrink-0 text-[10px] font-mono font-bold text-primary/70 bg-primary/5 px-2.5 py-1 rounded-md uppercase tracking-wider border border-primary/10">
                                {prop.type}
                              </span>
                            </div>
                            
                            <div className="mt-4">
                              {prop.type === "text" && (
                                <Input 
                                  value={propsValues[prop.name] || ""} 
                                  onChange={(e) => setPropsValues(prev => ({ ...prev, [prop.name]: e.target.value }))}
                                  placeholder={prop.placeholder}
                                  className="bg-muted/50 border-border focus:bg-background focus:ring-primary/20 rounded-xl h-11 transition-colors"
                                />
                              )}

                              {prop.type === "number" && (
                                <Input 
                                  type="number"
                                  value={propsValues[prop.name] ?? ""} 
                                  onChange={(e) => setPropsValues(prev => ({ ...prev, [prop.name]: Number(e.target.value) }))}
                                  className="bg-muted/50 border-border focus:bg-background focus:ring-primary/20 rounded-xl h-11 transition-colors"
                                />
                              )}

                              {prop.type === "boolean" && (
                                <div className="flex items-center space-x-3 bg-muted/30 p-3.5 rounded-xl border border-border/50">
                                  <Switch 
                                    checked={propsValues[prop.name] || false}
                                    onCheckedChange={(val) => setPropsValues(prev => ({ ...prev, [prop.name]: val }))}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                  <span className="text-sm font-semibold text-foreground">
                                    {propsValues[prop.name] ? "Habilitado" : "Deshabilitado"}
                                  </span>
                                </div>
                              )}

                              {prop.type === "select" && (
                                <Select 
                                  value={propsValues[prop.name] || ""} 
                                  onValueChange={(val) => setPropsValues(prev => ({ ...prev, [prop.name]: val }))}
                                >
                                  <SelectTrigger className="bg-muted/50 border-border focus:bg-background rounded-xl h-11 transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-border shadow-xl">
                                    {prop.options?.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-sm cursor-pointer">{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {prop.type === "content" && (
                                <Textarea 
                                  value={propsValues[prop.name] || ""} 
                                  onChange={(e) => setPropsValues(prev => ({ ...prev, [prop.name]: e.target.value }))}
                                  className="bg-muted/50 border-border focus:bg-background focus:ring-primary/20 rounded-xl min-h-[100px] resize-none transition-colors"
                                  placeholder="Escribe el contenido aquí..."
                                />
                              )}

                              {prop.type === "json" && (
                                <Textarea 
                                  value={typeof propsValues[prop.name] === 'string' ? propsValues[prop.name] : JSON.stringify(propsValues[prop.name], null, 2)} 
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setPropsValues(prev => ({ ...prev, [prop.name]: parsed }));
                                    } catch {
                                      setPropsValues(prev => ({ ...prev, [prop.name]: e.target.value }));
                                    }
                                  }}
                                  className="bg-[#0d1117] text-emerald-400 border-border rounded-xl min-h-[140px] font-mono text-[13px] resize-none p-5 shadow-inner focus:ring-primary/20"
                                  spellCheck={false}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Código Generado */}
                <TabsContent value="code" className="flex-1 overflow-y-auto m-0 outline-none">
                  <div className="max-w-4xl mx-auto p-8 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Code2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground block">Código Final</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">Copia y pega este código en tu documento.</span>
                      </div>
                    </div>
                    
                    <div className="relative group rounded-2xl overflow-hidden ring-1 ring-border shadow-2xl bg-[#0d1117] flex flex-col">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                         <div className="flex gap-2">
                           <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                           <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                           <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                         </div>
                         <span className="text-xs font-mono font-medium text-white/40">{selectedComponent.id}.mdx</span>
                      </div>
                      <div className="relative w-full overflow-hidden bg-[#1e1e1e] pt-4" style={{ height: `${editorHeight}px` }}>
                        <Editor
                          height="100%"
                          language="markdown"
                          theme="vs-dark"
                          value={selectedComponent.template(propsValues)}
                          onMount={handleEditorDidMount}
                          options={{
                            readOnly: true,
                            wordWrap: "off",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            lineNumbers: "off",
                            folding: false,
                            overviewRulerLanes: 0,
                            hideCursorInOverviewRuler: true,
                            scrollbar: {
                              vertical: 'hidden',
                              horizontal: 'auto',
                            },
                          }}
                        />
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedComponent.template(propsValues));
                            toast.success("Código copiado al portapapeles");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Propiedades */}
                <TabsContent value="props" className="flex-1 overflow-y-auto m-0 outline-none">
                  <div className="max-w-5xl mx-auto p-8 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Info className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground block">Referencia de Propiedades</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">Lista detallada de parámetros del componente.</span>
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border border-border overflow-hidden bg-background shadow-md">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/30 border-b border-border">
                          <tr>
                            <th className="px-6 py-4 font-bold text-foreground uppercase tracking-widest text-[10px]">Propiedad</th>
                            <th className="px-6 py-4 font-bold text-foreground uppercase tracking-widest text-[10px]">Tipo</th>
                            <th className="px-6 py-4 font-bold text-foreground uppercase tracking-widest text-[10px]">Default</th>
                            <th className="px-6 py-4 font-bold text-foreground uppercase tracking-widest text-[10px] w-1/2">Descripción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedComponent.props.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                                Este componente no expone propiedades configurables.
                              </td>
                            </tr>
                          ) : (
                            selectedComponent.props.map(prop => (
                              <tr key={prop.name} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-primary text-xs">{prop.name}</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 rounded bg-primary/5 text-primary text-[10px] uppercase font-bold border border-primary/10 tracking-widest">
                                    {prop.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                                  {prop.default !== undefined && prop.default !== "" ? String(prop.default) : "-"}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground leading-relaxed text-xs">
                                  {prop.description || "-"}
                                  {prop.options && (
                                    <div className="mt-2">
                                      <span className="text-[9px] uppercase font-bold text-foreground/60 block mb-1">Valores válidos:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {prop.options.map((opt: any) => (
                                          <code key={opt.value} className="px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-mono text-[10px] border border-border">
                                            {opt.value}
                                          </code>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

      )}
      </DialogContent>
    </Dialog>
  );
}

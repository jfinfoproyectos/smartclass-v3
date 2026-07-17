"use client";

import React from "react";
import { Trash2, Plus, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Block } from "../BlockComponents";
import BlockRenderer from "../BlockRenderer";

export interface BlockConfigFormsProps {
  currentBlock: Block;
  updateBlockData: (id: string, key: string, value: unknown) => void;
  addCollectionItem: (blockId: string, collectionKey: "items" | "steps" | "tabs", defaultItem: unknown) => void;
  removeCollectionItem: (blockId: string, collectionKey: "items" | "steps" | "tabs", idx: number) => void;
  updateCollectionItemValue: (blockId: string, collectionKey: "items" | "steps" | "tabs", idx: number, key: string, value: unknown) => void;
  updateQuizOption: (id: string, optIndex: number, value: string) => void;
}

export function BlockConfigForms({
  currentBlock,
  updateBlockData,
  addCollectionItem,
  removeCollectionItem,
  updateCollectionItemValue,
  updateQuizOption,
}: BlockConfigFormsProps) {
  return (
    <>
                  {currentBlock.type === "header" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Título del Encabezado</Label>
                        <Input 
                          value={currentBlock.data.title || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "title", e.target.value)} 
                          className="rounded-xl h-10 text-sm font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Subtítulo (Opcional)</Label>
                        <Input 
                          value={currentBlock.data.subtitle || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "subtitle", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Nivel de Importancia</Label>
                        <Select 
                          value={currentBlock.data.level || "h1"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "level", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="h1">Grande (H1)</SelectItem>
                            <SelectItem value="h2">Mediano (H2)</SelectItem>
                            <SelectItem value="h3">Pequeño (H3)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Alineación</Label>
                        <Select 
                          value={currentBlock.data.align || "left"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "align", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Izquierda</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="right">Derecha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "paragraph" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Contenido de Texto</Label>
                      <span className="block text-[10px] text-muted-foreground mb-1.5 font-medium leading-none">
                        Admite atajos: **negrita**, *itálica*, `código inline` y [enlace](https://url).
                      </span>
                      <Textarea 
                        value={currentBlock.data.text || ""} 
                        onChange={e => updateBlockData(currentBlock.id, "text", e.target.value)}
                        className="rounded-xl min-h-[140px] text-sm leading-relaxed"
                      />
                    </div>
                  )}

                  {currentBlock.type === "callout" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Título de Alerta</Label>
                          <Input 
                            value={currentBlock.data.title || ""} 
                            onChange={e => updateBlockData(currentBlock.id, "title", e.target.value)}
                            className="rounded-xl h-10 text-sm font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Estilo visual</Label>
                          <Select 
                            value={currentBlock.data.style || "info"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "style", val)}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Información (Cian)</SelectItem>
                              <SelectItem value="success">Éxito (Verde)</SelectItem>
                              <SelectItem value="warning">Advertencia (Ámbar)</SelectItem>
                              <SelectItem value="danger">Peligro (Rojo)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Mensaje de la Alerta</Label>
                        <Textarea 
                          value={currentBlock.data.text || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "text", e.target.value)}
                          className="rounded-xl min-h-[85px] text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "code" && (
                    <div className="space-y-4">
                      {/* Tabs Management */}
                      <div className="space-y-4 border-b border-border/40 pb-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Código Multitestaña / Pestañas</Label>
                          <Button 
                            onClick={() => {
                              const currentTabs = currentBlock.data.tabs || [];
                              if (currentTabs.length === 0) {
                                // Migrate single file to first tab before adding second
                                const title = currentBlock.data.title || "Principal";
                                const language = currentBlock.data.language || "javascript";
                                const code = currentBlock.data.code || "";
                                const highlightLines = currentBlock.data.highlightLines || "";
                                updateBlockData(currentBlock.id, "tabs", [
                                  { name: title, language, code, highlightLines },
                                  { name: "nuevo.js", language: "javascript", code: "// nuevo código", highlightLines: "" }
                                ]);
                              } else {
                                addCollectionItem(currentBlock.id, "tabs", { name: `archivo-${currentTabs.length + 1}.js`, language: "javascript", code: "// escribe aquí", highlightLines: "" });
                              }
                            }}
                            size="sm" 
                            className="h-8 rounded-xl text-[10px] font-bold uppercase"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Archivo / Pestaña
                          </Button>
                        </div>

                        {(!currentBlock.data.tabs || currentBlock.data.tabs.length === 0) ? (
                          <div className="bg-muted/5 p-4 rounded-xl border border-border/40 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Título del Bloque (Opcional)</Label>
                                <Input 
                                  value={currentBlock.data.title || ""} 
                                  onChange={e => updateBlockData(currentBlock.id, "title", e.target.value)}
                                  className="rounded-xl h-10 text-sm font-semibold"
                                  placeholder="ej. index.ts"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Lenguaje de Programación</Label>
                                <Select 
                                  value={currentBlock.data.language || "javascript"} 
                                  onValueChange={val => updateBlockData(currentBlock.id, "language", val)}
                                >
                                  <SelectTrigger className="rounded-xl h-10 font-medium">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="typescript">TypeScript</SelectItem>
                                    <SelectItem value="html">HTML</SelectItem>
                                    <SelectItem value="css">CSS</SelectItem>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="sql">SQL</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="bash">Bash / Shell</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Líneas a resaltar (Opcional)</Label>
                              <Input 
                                value={currentBlock.data.highlightLines || ""} 
                                onChange={e => updateBlockData(currentBlock.id, "highlightLines", e.target.value)}
                                className="rounded-xl h-10 text-xs font-medium"
                                placeholder="ej. 2,4-6 o 3"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Código Fuente</Label>
                              <Textarea 
                                value={currentBlock.data.code || ""} 
                                onChange={e => updateBlockData(currentBlock.id, "code", e.target.value)}
                                className="rounded-xl min-h-[200px] font-mono text-xs leading-relaxed bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-900 p-4 custom-scrollbar select-text"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(currentBlock.data.tabs || []).map((tab: any, idx: number) => (
                              <div key={idx} className="p-4 border rounded-xl bg-card space-y-4 relative">
                                <div className="flex items-center justify-between border-b pb-2 border-border/40">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Archivo / Pestaña #{idx + 1}</span>
                                  <button 
                                    onClick={() => {
                                      const remainingTabs = [...currentBlock.data.tabs];
                                      remainingTabs.splice(idx, 1);
                                      if (remainingTabs.length === 1) {
                                        // Migrate back to single block if only 1 tab is left
                                        const lastTab = remainingTabs[0];
                                        updateBlockData(currentBlock.id, "tabs", []);
                                        updateBlockData(currentBlock.id, "title", lastTab.name);
                                        updateBlockData(currentBlock.id, "language", lastTab.language);
                                        updateBlockData(currentBlock.id, "code", lastTab.code);
                                      } else {
                                        removeCollectionItem(currentBlock.id, "tabs", idx);
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-red-500 p-1"
                                    title="Eliminar pestaña"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase">Nombre del Archivo / Pestaña</Label>
                                    <Input 
                                      value={tab.name || ""} 
                                      onChange={e => updateCollectionItemValue(currentBlock.id, "tabs", idx, "name", e.target.value)}
                                      className="h-9 rounded-lg text-xs font-semibold"
                                      placeholder="ej. App.tsx"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase">Lenguaje</Label>
                                    <Select 
                                      value={tab.language || "javascript"} 
                                      onValueChange={val => updateCollectionItemValue(currentBlock.id, "tabs", idx, "language", val)}
                                    >
                                      <SelectTrigger className="rounded-lg h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="sql">SQL</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="bash">Bash / Shell</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase">Líneas a resaltar (Opcional)</Label>
                                  <Input 
                                    value={tab.highlightLines || ""} 
                                    onChange={e => updateCollectionItemValue(currentBlock.id, "tabs", idx, "highlightLines", e.target.value)}
                                    className="h-9 rounded-lg text-xs font-medium"
                                    placeholder="ej. 2,4-6 o 3"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase">Código Fuente</Label>
                                  <Textarea 
                                    value={tab.code || ""} 
                                    onChange={e => updateCollectionItemValue(currentBlock.id, "tabs", idx, "code", e.target.value)}
                                    className="min-h-[160px] font-mono text-xs leading-relaxed bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-900 p-4 rounded-lg custom-scrollbar select-text"
                                    placeholder="// escribe el código aquí"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "codeExplain" && (
                    <div className="space-y-4">
                      {/* Tabs Management */}
                      <div className="space-y-4 border-b border-border/40 pb-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Código Multitestaña / Pestañas</Label>
                          <Button 
                            onClick={() => {
                              const currentTabs = currentBlock.data.tabs || [];
                              if (currentTabs.length === 0) {
                                // Migrate single file to first tab before adding second
                                const language = currentBlock.data.language || "javascript";
                                const code = currentBlock.data.code || "";
                                updateBlockData(currentBlock.id, "tabs", [
                                  { name: "Principal", language, code },
                                  { name: "nuevo.js", language: "javascript", code: "// nuevo código" }
                                ]);
                              } else {
                                addCollectionItem(currentBlock.id, "tabs", { name: `archivo-${currentTabs.length + 1}.js`, language: "javascript", code: "// escribe aquí" });
                              }
                            }}
                            size="sm" 
                            className="h-8 rounded-xl text-[10px] font-bold uppercase"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Archivo / Pestaña
                          </Button>
                        </div>

                        {(!currentBlock.data.tabs || currentBlock.data.tabs.length === 0) ? (
                          <div className="bg-muted/5 p-4 rounded-xl border border-border/40 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Lenguaje de Programación</Label>
                                <Select 
                                  value={currentBlock.data.language || "javascript"} 
                                  onValueChange={val => updateBlockData(currentBlock.id, "language", val)}
                                >
                                  <SelectTrigger className="rounded-xl h-10 font-medium">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="typescript">TypeScript</SelectItem>
                                    <SelectItem value="html">HTML</SelectItem>
                                    <SelectItem value="css">CSS</SelectItem>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="sql">SQL</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="bash">Bash / Shell</SelectItem>
                                    <SelectItem value="kotlin">Kotlin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Código Fuente Completo</Label>
                              <Textarea 
                                value={currentBlock.data.code || ""} 
                                onChange={e => updateBlockData(currentBlock.id, "code", e.target.value)}
                                className="rounded-xl min-h-[160px] font-mono text-xs leading-relaxed bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-900 p-4 custom-scrollbar select-text"
                                placeholder="// escribe el código fuente que se explicará paso a paso"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {(currentBlock.data.tabs || []).map((tab: any, idx: number) => (
                              <div key={idx} className="p-4 border rounded-xl bg-card space-y-4 relative">
                                <div className="flex items-center justify-between border-b pb-2 border-border/40">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Archivo / Pestaña #{idx + 1}</span>
                                  <button 
                                    onClick={() => {
                                      const remainingTabs = [...currentBlock.data.tabs];
                                      remainingTabs.splice(idx, 1);
                                      if (remainingTabs.length === 1) {
                                        // Migrate back to single block if only 1 tab is left
                                        const lastTab = remainingTabs[0];
                                        updateBlockData(currentBlock.id, "tabs", []);
                                        updateBlockData(currentBlock.id, "language", lastTab.language);
                                        updateBlockData(currentBlock.id, "code", lastTab.code);
                                      } else {
                                        removeCollectionItem(currentBlock.id, "tabs", idx);
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer"
                                    title="Eliminar pestaña"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase">Nombre del Archivo / Pestaña</Label>
                                    <Input 
                                      value={tab.name || ""} 
                                      onChange={e => updateCollectionItemValue(currentBlock.id, "tabs", idx, "name", e.target.value)}
                                      className="h-9 rounded-lg text-xs font-semibold"
                                      placeholder="ej. App.tsx"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase">Lenguaje</Label>
                                    <Select 
                                      value={tab.language || "javascript"} 
                                      onValueChange={val => updateCollectionItemValue(currentBlock.id, "tabs", idx, "language", val)}
                                    >
                                      <SelectTrigger className="rounded-lg h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="sql">SQL</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="bash">Bash / Shell</SelectItem>
                                        <SelectItem value="kotlin">Kotlin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase">Código Fuente</Label>
                                  <Textarea 
                                    value={tab.code || ""} 
                                    onChange={e => updateCollectionItemValue(currentBlock.id, "tabs", idx, "code", e.target.value)}
                                    className="min-h-[160px] font-mono text-xs leading-relaxed bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-900 p-4 rounded-lg custom-scrollbar select-text"
                                    placeholder="// escribe el código aquí"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Stepper Steps Management */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pasos de Explicación</Label>
                          <Button 
                            onClick={() => addCollectionItem(currentBlock.id, "steps", { title: `Paso ${currentBlock.data.steps?.length + 1 || 1}`, content: "Detalle de la explicación...", lines: "", tabIdx: 0 })}
                            size="sm" 
                            className="h-8 rounded-xl text-[10px] font-bold uppercase"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Paso
                          </Button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                          {(currentBlock.data.steps || []).map((step: any, idx: number) => (
                            <div key={idx} className="p-4 border border-border/60 rounded-xl bg-card/40 space-y-4 relative">
                              <div className="flex items-center justify-between border-b pb-2 border-border/40">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Paso #{idx + 1}</span>
                                <button 
                                  onClick={() => removeCollectionItem(currentBlock.id, "steps", idx)}
                                  className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer"
                                  title="Eliminar paso"
                                  disabled={currentBlock.data.steps?.length <= 1}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1 col-span-1">
                                  <Label className="text-[10px] font-bold uppercase">Título del Paso</Label>
                                  <Input 
                                    value={step.title || ""} 
                                    onChange={e => updateCollectionItemValue(currentBlock.id, "steps", idx, "title", e.target.value)}
                                    className="h-9 rounded-lg text-xs font-semibold"
                                    placeholder="ej. Inicializar variable"
                                  />
                                </div>
                                <div className="space-y-1 col-span-1">
                                  <Label className="text-[10px] font-bold uppercase">Líneas a resaltar (ej. 2,4-6)</Label>
                                  <Input 
                                    value={step.lines || ""} 
                                    onChange={e => updateCollectionItemValue(currentBlock.id, "steps", idx, "lines", e.target.value)}
                                    className="h-9 rounded-lg text-xs font-semibold"
                                    placeholder="ej. 1-2 o 3,5"
                                  />
                                </div>
                                <div className="space-y-1 col-span-1">
                                  <Label className="text-[10px] font-bold uppercase">Archivo / Pestaña</Label>
                                  <Select 
                                    value={String(step.tabIdx !== undefined ? step.tabIdx : 0)} 
                                    onValueChange={val => updateCollectionItemValue(currentBlock.id, "steps", idx, "tabIdx", parseInt(val))}
                                    disabled={!currentBlock.data.tabs || currentBlock.data.tabs.length === 0}
                                  >
                                    <SelectTrigger className="rounded-lg h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(!currentBlock.data.tabs || currentBlock.data.tabs.length === 0) ? (
                                        <SelectItem value="0">Archivo Principal</SelectItem>
                                      ) : (
                                        currentBlock.data.tabs.map((t: any, tIdx: number) => (
                                          <SelectItem key={tIdx} value={String(tIdx)}>{t.name || `Pestaña ${tIdx + 1}`}</SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase">Explicación del Paso</Label>
                                <Textarea 
                                  value={step.content || ""} 
                                  onChange={e => updateCollectionItemValue(currentBlock.id, "steps", idx, "content", e.target.value)}
                                  className="min-h-[80px] text-xs leading-relaxed rounded-lg custom-scrollbar"
                                  placeholder="Escribe la explicación detallada de estas líneas de código..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "quiz" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pregunta</Label>
                        <Input 
                          value={currentBlock.data.question || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "question", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold"
                        />
                      </div>
                      
                      <div className="space-y-2.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Opciones de respuesta</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[0, 1, 2, 3].map(optIdx => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs font-black text-muted-foreground/60 w-4">{String.fromCharCode(65 + optIdx)}.</span>
                              <Input 
                                value={currentBlock.data.options?.[optIdx] || ""} 
                                onChange={e => updateQuizOption(currentBlock.id, optIdx, e.target.value)}
                                className="rounded-xl h-10 text-xs font-medium"
                                placeholder={`Opción ${String.fromCharCode(65 + optIdx)}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Opción Correcta</Label>
                          <Select 
                            value={String(currentBlock.data.correctIndex !== undefined ? currentBlock.data.correctIndex : 0)} 
                            onValueChange={val => updateBlockData(currentBlock.id, "correctIndex", parseInt(val))}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Opción A</SelectItem>
                              <SelectItem value="1">Opción B</SelectItem>
                              <SelectItem value="2">Opción C</SelectItem>
                              <SelectItem value="3">Opción D</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Explicación</Label>
                          <Input 
                            value={currentBlock.data.explanation || ""} 
                            onChange={e => updateBlockData(currentBlock.id, "explanation", e.target.value)}
                            className="rounded-xl h-10 text-sm"
                            placeholder="¿Por qué es la opción correcta?"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "card" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Título de Tarjeta</Label>
                        <Input 
                          value={currentBlock.data.title || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "title", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Icono Visual</Label>
                        <Select 
                          value={currentBlock.data.icon || "Link"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "icon", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Link">Enlace General (Icono Link)</SelectItem>
                            <SelectItem value="BookOpen">Documento (Icono Libro)</SelectItem>
                            <SelectItem value="Code2">Código (Icono Consola)</SelectItem>
                            <SelectItem value="Sparkles">Estrella (Icono Brillo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Descripción de Enlace</Label>
                        <Input 
                          value={currentBlock.data.description || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "description", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Enlace URL</Label>
                        <Input 
                          value={currentBlock.data.url || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "url", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold text-primary"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "accordion" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 border-border/40">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Items del Acordeón</Label>
                        <Button 
                          onClick={() => addCollectionItem(currentBlock.id, "items", { title: "Nuevo tema", content: "Contenido..." })}
                          size="sm" 
                          className="h-8 rounded-xl text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(currentBlock.data.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-card space-y-2 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Item #{idx + 1}</span>
                              <button 
                                onClick={() => removeCollectionItem(currentBlock.id, "items", idx)}
                                className="text-muted-foreground hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <Input 
                                value={item.title || ""} 
                                onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "title", e.target.value)}
                                className="h-9 rounded-lg text-xs font-semibold"
                                placeholder="Pregunta o título"
                              />
                              <Textarea 
                                value={item.content || ""} 
                                onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "content", e.target.value)}
                                className="min-h-[60px] rounded-lg text-xs"
                                placeholder="Respuesta o contenido explicativo"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "featureGrid" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 border-border/40">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 font-black">Tarjetas del Grid</Label>
                        <Button 
                          onClick={() => addCollectionItem(currentBlock.id, "items", { title: "Nueva Tarjeta", text: "Descripción...", icon: "Sparkles" })}
                          size="sm" 
                          className="h-8 rounded-xl text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/85">Columnas en Pantalla</Label>
                          <Select 
                            value={String(currentBlock.data.columns || 2)} 
                            onValueChange={val => updateBlockData(currentBlock.id, "columns", parseInt(val))}
                          >
                            <SelectTrigger className="rounded-xl h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 Columnas (Estándar)</SelectItem>
                              <SelectItem value="3">3 Columnas (Compacto)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(currentBlock.data.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-card space-y-3 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Tarjeta #{idx + 1}</span>
                              <button 
                                onClick={() => removeCollectionItem(currentBlock.id, "items", idx)}
                                className="text-muted-foreground hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase">Título</Label>
                                <Input 
                                  value={item.title || ""} 
                                  onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "title", e.target.value)}
                                  className="h-9 rounded-lg text-xs font-semibold"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase">Icono</Label>
                                <Select 
                                  value={item.icon || "Sparkles"} 
                                  onValueChange={val => updateCollectionItemValue(currentBlock.id, "items", idx, "icon", val)}
                                >
                                  <SelectTrigger className="rounded-lg h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Sparkles">Estrella (Sparkles)</SelectItem>
                                    <SelectItem value="Code2">Consola (Code)</SelectItem>
                                    <SelectItem value="BookOpen">Libro (BookOpen)</SelectItem>
                                    <SelectItem value="Flame">Fuego (Flame)</SelectItem>
                                    <SelectItem value="Activity">Pulso (Activity)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="sm:col-span-2 space-y-1">
                                <Label className="text-[10px] font-bold uppercase">Descripción corta</Label>
                                <Textarea 
                                  value={item.text || ""} 
                                  onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "text", e.target.value)}
                                  className="min-h-[50px] rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "stepList" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 border-border/40">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pasos Secuenciales</Label>
                        <Button 
                          onClick={() => addCollectionItem(currentBlock.id, "steps", { title: "Nuevo paso", text: "Descripción..." })}
                          size="sm" 
                          className="h-8 rounded-xl text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(currentBlock.data.steps || []).map((step: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-card space-y-2 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Paso #{idx + 1}</span>
                              <button 
                                onClick={() => removeCollectionItem(currentBlock.id, "steps", idx)}
                                className="text-muted-foreground hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <Input 
                                value={step.title || ""} 
                                onChange={e => updateCollectionItemValue(currentBlock.id, "steps", idx, "title", e.target.value)}
                                className="h-9 rounded-lg text-xs font-semibold"
                                placeholder="Título del paso"
                              />
                              <Textarea 
                                value={step.text || ""} 
                                onChange={e => updateCollectionItemValue(currentBlock.id, "steps", idx, "text", e.target.value)}
                                className="min-h-[50px] rounded-lg text-xs"
                                placeholder="Descripción"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "aiPrompt" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pregunta o Mensaje Principal</Label>
                        <Input 
                          value={currentBlock.data.promptText || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "promptText", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Mensaje de ayuda (Subtítulo)</Label>
                        <Input 
                          value={currentBlock.data.helperText || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "helperText", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Texto del Botón</Label>
                        <Input 
                          value={currentBlock.data.buttonText || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "buttonText", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "flashcard" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tarjetas de Memorización (Deck)</Label>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const currentCards = currentBlock.data.cards || [];
                            updateBlockData(currentBlock.id, "cards", [
                              ...currentCards,
                              { frontText: "Nueva pregunta", backText: "Nueva respuesta", hint: "" }
                            ]);
                          }}
                          className="h-8 rounded-lg text-xs gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar Tarjeta
                        </Button>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {(() => {
                          const cards = currentBlock.data.cards || [
                            { 
                              frontText: currentBlock.data.frontText || "", 
                              backText: currentBlock.data.backText || "", 
                              hint: currentBlock.data.hint || "" 
                            }
                          ];
                          
                          return cards.map((card: any, idx: number) => (
                            <div key={idx} className="p-3 border border-border/40 bg-muted/10 rounded-xl space-y-3 relative group/card-item">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => {
                                  const updatedCards = [...cards];
                                  updatedCards.splice(idx, 1);
                                  updateBlockData(currentBlock.id, "cards", updatedCards);
                                  // Clean up legacy flat properties
                                  updateBlockData(currentBlock.id, "frontText", undefined);
                                  updateBlockData(currentBlock.id, "backText", undefined);
                                  updateBlockData(currentBlock.id, "hint", undefined);
                                }}
                                className="absolute top-1 right-1 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover/card-item:opacity-100 transition-opacity"
                                disabled={cards.length <= 1}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>

                              <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Tarjeta {idx + 1}</span>

                              <div className="grid grid-cols-1 gap-2.5">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground/60">Frente (Pregunta / Término)</Label>
                                  <Input 
                                    value={card.frontText || ""} 
                                    onChange={e => {
                                      const updatedCards = [...cards];
                                      updatedCards[idx] = { ...updatedCards[idx], frontText: e.target.value };
                                      updateBlockData(currentBlock.id, "cards", updatedCards);
                                      // Clean up legacy flat properties
                                      updateBlockData(currentBlock.id, "frontText", undefined);
                                      updateBlockData(currentBlock.id, "backText", undefined);
                                      updateBlockData(currentBlock.id, "hint", undefined);
                                    }}
                                    className="h-8 rounded-lg text-xs font-semibold"
                                    placeholder="Ej: ¿Qué es una corrutina?"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground/60">Reverso (Respuesta / Explicación)</Label>
                                  <Textarea 
                                    value={card.backText || ""} 
                                    onChange={e => {
                                      const updatedCards = [...cards];
                                      updatedCards[idx] = { ...updatedCards[idx], backText: e.target.value };
                                      updateBlockData(currentBlock.id, "cards", updatedCards);
                                      // Clean up legacy flat properties
                                      updateBlockData(currentBlock.id, "frontText", undefined);
                                      updateBlockData(currentBlock.id, "backText", undefined);
                                      updateBlockData(currentBlock.id, "hint", undefined);
                                    }}
                                    className="min-h-[60px] rounded-lg text-xs"
                                    placeholder="Descripción o respuesta..."
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground/60">Pista (Opcional)</Label>
                                  <Input 
                                    value={card.hint || ""} 
                                    onChange={e => {
                                      const updatedCards = [...cards];
                                      updatedCards[idx] = { ...updatedCards[idx], hint: e.target.value };
                                      updateBlockData(currentBlock.id, "cards", updatedCards);
                                      // Clean up legacy flat properties
                                      updateBlockData(currentBlock.id, "frontText", undefined);
                                      updateBlockData(currentBlock.id, "backText", undefined);
                                      updateBlockData(currentBlock.id, "hint", undefined);
                                    }}
                                    className="h-8 rounded-lg text-xs"
                                    placeholder="Ej: Comienza con C..."
                                  />
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "timeline" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pasos / Hitos del Mapa de Ruta</Label>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const currentItems = currentBlock.data.items || [];
                            updateBlockData(currentBlock.id, "items", [
                              ...currentItems,
                              { title: `Nuevo Hito ${currentItems.length + 1}`, description: "Detalle del hito...", completed: false }
                            ]);
                          }}
                          className="h-8 rounded-lg text-xs gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar Hito
                        </Button>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {(currentBlock.data.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="p-3 border border-border/40 bg-muted/10 rounded-xl space-y-3 relative group/item">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => {
                                const currentItems = [...(currentBlock.data.items || [])];
                                currentItems.splice(idx, 1);
                                updateBlockData(currentBlock.id, "items", currentItems);
                              }}
                              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            
                            <div className="grid grid-cols-1 gap-2.5">
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground/60 w-12">Título</Label>
                                <Input 
                                  value={item.title || ""} 
                                  onChange={e => {
                                    const currentItems = [...(currentBlock.data.items || [])];
                                    currentItems[idx] = { ...currentItems[idx], title: e.target.value };
                                    updateBlockData(currentBlock.id, "items", currentItems);
                                  }}
                                  className="h-8 rounded-lg text-xs font-semibold flex-1"
                                  placeholder="Ej: Paso 1"
                                />
                              </div>

                              <div className="flex items-start gap-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground/60 w-12 pt-1.5">Detalle</Label>
                                <Textarea 
                                  value={item.description || ""} 
                                  onChange={e => {
                                    const currentItems = [...(currentBlock.data.items || [])];
                                    currentItems[idx] = { ...currentItems[idx], description: e.target.value };
                                    updateBlockData(currentBlock.id, "items", currentItems);
                                  }}
                                  className="min-h-[50px] rounded-lg text-xs flex-1"
                                  placeholder="Descripción del hito..."
                                />
                              </div>

                              <div className="flex items-center justify-between pl-14 pt-1">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground/60">Marcar como Completado</span>
                                <Button
                                  size="sm"
                                  variant={item.completed ? "default" : "secondary"}
                                  onClick={() => {
                                    const currentItems = [...(currentBlock.data.items || [])];
                                    currentItems[idx] = { ...currentItems[idx], completed: !currentItems[idx].completed };
                                    updateBlockData(currentBlock.id, "items", currentItems);
                                  }}
                                  className="h-7 px-3 rounded-lg text-[9px] font-extrabold uppercase tracking-wider"
                                >
                                  {item.completed ? "Completado" : "Pendiente"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "matching" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Parejas de Apareamiento</Label>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const currentPairs = currentBlock.data.pairs || [];
                            const newId = Math.random().toString(36).substring(2, 9);
                            updateBlockData(currentBlock.id, "pairs", [
                              ...currentPairs,
                              { id: newId, premise: "Nuevo Concepto", definition: "Nueva Definición" }
                            ]);
                          }}
                          className="h-8 rounded-lg text-xs gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar Pareja
                        </Button>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {(currentBlock.data.pairs || []).map((pair: any, idx: number) => (
                          <div key={pair.id || idx} className="p-3 border border-border/40 bg-muted/10 rounded-xl space-y-3 relative group/pair-item">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => {
                                const currentPairs = [...(currentBlock.data.pairs || [])];
                                currentPairs.splice(idx, 1);
                                updateBlockData(currentBlock.id, "pairs", currentPairs);
                              }}
                              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover/pair-item:opacity-100 transition-opacity"
                              disabled={(currentBlock.data.pairs || []).length <= 1}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Pareja #{idx + 1}</span>

                            <div className="grid grid-cols-1 gap-2.5">
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground/60 w-16">Concepto</Label>
                                <Input 
                                  value={pair.premise || ""} 
                                  onChange={e => {
                                    const currentPairs = [...(currentBlock.data.pairs || [])];
                                    currentPairs[idx] = { ...currentPairs[idx], premise: e.target.value };
                                    updateBlockData(currentBlock.id, "pairs", currentPairs);
                                  }}
                                  className="h-8 rounded-lg text-xs font-semibold flex-1"
                                  placeholder="Ej: Kotlin"
                                />
                              </div>

                              <div className="flex items-start gap-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground/60 w-16 pt-1.5">Definición</Label>
                                <Textarea 
                                  value={pair.definition || ""} 
                                  onChange={e => {
                                    const currentPairs = [...(currentBlock.data.pairs || [])];
                                    currentPairs[idx] = { ...currentPairs[idx], definition: e.target.value };
                                    updateBlockData(currentBlock.id, "pairs", currentPairs);
                                  }}
                                  className="min-h-[50px] rounded-lg text-xs flex-1"
                                  placeholder="Ej: Lenguaje oficial para Android..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "embed" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">URL del Recurso (CodePen, Sandbox, YouTube, Figma, Replit, etc.)</Label>
                        <Input 
                          value={currentBlock.data.url || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "url", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold"
                          placeholder="https://codepen.io/username/pen/hash"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Altura del Contenedor (píxeles)</Label>
                        <Input 
                          type="number"
                          value={currentBlock.data.height !== undefined ? currentBlock.data.height : 450} 
                          onChange={e => updateBlockData(currentBlock.id, "height", parseInt(e.target.value) || 450)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="450"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Leyenda / Título Descriptivo (Opcional)</Label>
                        <Input 
                          value={currentBlock.data.caption || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "caption", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="Ej: Editor interactivo de HTML y CSS"
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "pdf" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">URL del Documento PDF</Label>
                        <Input 
                          value={currentBlock.data.url || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "url", e.target.value)}
                          className="rounded-xl h-10 text-sm font-semibold"
                          placeholder="https://ejemplo.com/documento.pdf"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Altura del Visor (píxeles)</Label>
                        <Input 
                          type="number"
                          value={currentBlock.data.height !== undefined ? currentBlock.data.height : 650} 
                          onChange={e => updateBlockData(currentBlock.id, "height", parseInt(e.target.value) || 650)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="650"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Título / Leyenda del Documento (Opcional)</Label>
                        <Input 
                          value={currentBlock.data.title || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "title", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="Ej: Guía Rápida de Kotlin"
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "mermaid" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Código del Diagrama (Sintaxis Mermaid)</Label>
                        <Textarea 
                          value={currentBlock.data.chart || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "chart", e.target.value)}
                          className="min-h-[250px] rounded-xl text-xs font-mono p-4"
                          placeholder="graph TD&#10;  A[Inicio] --> B(Proceso)&#10;  B --> C[Fin]"
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 leading-relaxed space-y-1">
                        <span className="font-bold">Ejemplos rápidos de sintaxis:</span>
                        <pre className="p-2 rounded-lg bg-muted text-[9px] overflow-x-auto font-mono">
{`graph TD
  A[Inicio] --> B{¿Es Kotlin?}
  B -- Sí --> C[Excelente]
  B -- No --> D[Recomendar Kotlin]`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "image" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">URL de la Imagen</Label>
                        <Input 
                          value={currentBlock.data.url || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "url", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="https://ejemplo.com/imagen.png"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Texto Alternativo / Leyenda</Label>
                        <Input 
                          value={currentBlock.data.alt || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "alt", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="Describir la imagen..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Alineación de la Imagen</Label>
                        <Select 
                          value={currentBlock.data.align || "center"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "align", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Izquierda</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="right">Derecha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tamaño / Ancho de Imagen</Label>
                        <Select 
                          value={currentBlock.data.width || "large"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "width", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Pequeña (max-w-md)</SelectItem>
                            <SelectItem value="medium">Mediana (max-w-2xl)</SelectItem>
                            <SelectItem value="large">Grande (max-w-full)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Redondeado de Esquinas</Label>
                        <Select 
                          value={currentBlock.data.radius || "large"} 
                          onValueChange={val => updateBlockData(currentBlock.id, "radius", val)}
                        >
                          <SelectTrigger className="rounded-xl h-10 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ninguno (Esquinas Rectas)</SelectItem>
                            <SelectItem value="small">Pequeño</SelectItem>
                            <SelectItem value="medium">Mediano</SelectItem>
                            <SelectItem value="large">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "video" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">URL del Video (YouTube o enlace MP4 directo)</Label>
                        <Input 
                          value={currentBlock.data.url || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "url", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="https://www.youtube.com/watch?v=... o https://ejemplo.com/video.mp4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Leyenda / Subtítulo del Video</Label>
                        <Input 
                          value={currentBlock.data.caption || ""} 
                          onChange={e => updateBlockData(currentBlock.id, "caption", e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          placeholder="Describir el video..."
                        />
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "carousel" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border border-border/40 mb-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Alineación del Carrusel</Label>
                          <Select 
                            value={currentBlock.data.align || "center"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "align", val)}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Izquierda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Derecha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tamaño / Ancho Máximo</Label>
                          <Select 
                            value={currentBlock.data.width || "large"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "width", val)}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Pequeño (max-w-md)</SelectItem>
                              <SelectItem value="medium">Mediano (max-w-2xl)</SelectItem>
                              <SelectItem value="large">Grande (max-w-4xl)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Efecto de Transición</Label>
                          <Select 
                            value={currentBlock.data.transitionEffect || "fade"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "transitionEffect", val)}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fade">Desvanecer (Fade)</SelectItem>
                              <SelectItem value="slide">Deslizar (Slide)</SelectItem>
                              <SelectItem value="zoom">Escalar (Zoom)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Reproducción Automática</Label>
                          <Select 
                            value={currentBlock.data.autoplay ? "true" : "false"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "autoplay", val === "true")}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">Desactivado</SelectItem>
                              <SelectItem value="true">Activado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {currentBlock.data.autoplay && (
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Velocidad (Segundos entre diapositivas)</Label>
                            <Input 
                              type="number"
                              min={1}
                              max={60}
                              value={currentBlock.data.interval !== undefined ? currentBlock.data.interval : 5} 
                              onChange={e => updateBlockData(currentBlock.id, "interval", parseInt(e.target.value) || 5)}
                              className="rounded-xl h-10 text-sm font-semibold"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-b pb-2 border-border/40">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Imágenes del Carrusel</Label>
                        <Button 
                          onClick={() => addCollectionItem(currentBlock.id, "items", { url: "", caption: "" })}
                          size="sm" 
                          className="h-8 rounded-xl text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Foto
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {(currentBlock.data.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="p-4 border rounded-xl bg-card space-y-3 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Foto #{idx + 1}</span>
                              <button 
                                onClick={() => removeCollectionItem(currentBlock.id, "items", idx)}
                                className="text-muted-foreground hover:text-red-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase">URL de la Imagen</Label>
                                <Input 
                                  value={item.url || ""} 
                                  onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "url", e.target.value)}
                                  className="h-9 rounded-lg text-xs"
                                  placeholder="https://..."
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase">Leyenda / Subtítulo</Label>
                                <Input 
                                  value={item.caption || ""} 
                                  onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "caption", e.target.value)}
                                  className="h-9 rounded-lg text-xs font-semibold"
                                  placeholder="ej. Vista general"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "list" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 border-border/40">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Elementos de la Lista</Label>
                        <Button 
                          onClick={() => addCollectionItem(currentBlock.id, "items", { text: "Nuevo elemento" })}
                          size="sm" 
                          className="h-8 rounded-xl text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tipo de Lista</Label>
                          <Select 
                            value={currentBlock.data.ordered ? "ordered" : "unordered"} 
                            onValueChange={val => updateBlockData(currentBlock.id, "ordered", val === "ordered")}
                          >
                            <SelectTrigger className="rounded-xl h-10 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unordered">Desordenada (Viñetas)</SelectItem>
                              <SelectItem value="ordered">Ordenada (Números)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(currentBlock.data.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-card">
                            <button 
                              onClick={() => {
                                const isTask = item.checked !== undefined;
                                updateCollectionItemValue(currentBlock.id, "items", idx, "checked", isTask ? undefined : false);
                              }}
                              className="p-1 rounded hover:bg-muted text-primary"
                              title={item.checked !== undefined ? "Convertir a viñeta simple" : "Convertir a tarea checkeable"}
                            >
                              {item.checked !== undefined ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 opacity-40" />}
                            </button>

                            {item.checked !== undefined && (
                              <input 
                                type="checkbox" 
                                checked={!!item.checked} 
                                onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "checked", e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            )}

                            <Input 
                              value={item.text || ""} 
                              onChange={e => updateCollectionItemValue(currentBlock.id, "items", idx, "text", e.target.value)}
                              className="flex-1 h-9 rounded-lg text-xs"
                              placeholder="Texto del elemento..."
                            />

                            <button 
                              onClick={() => removeCollectionItem(currentBlock.id, "items", idx)}
                              className="text-muted-foreground hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentBlock.type === "table" && (
                    <div className="space-y-4">
                      <div className="border-b pb-2 border-border/40 flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Estructura de la Tabla</Label>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              const currentHeaders = [...(currentBlock.data.headers || [])];
                              currentHeaders.push(`Cabecera ${currentHeaders.length + 1}`);
                              updateBlockData(currentBlock.id, "headers", currentHeaders);
                              const currentRows = (currentBlock.data.rows || []).map((row: string[]) => [...row, ""]);
                              updateBlockData(currentBlock.id, "rows", currentRows);
                            }}
                            size="sm" 
                            variant="outline"
                            className="h-8 rounded-xl text-[9px] font-bold uppercase"
                          >
                            + Columna
                          </Button>
                          <Button 
                            onClick={() => {
                              const currentHeaders = currentBlock.data.headers || [];
                              const newRow = Array(currentHeaders.length).fill("");
                              const currentRows = [...(currentBlock.data.rows || [])];
                              currentRows.push(newRow);
                              updateBlockData(currentBlock.id, "rows", currentRows);
                            }}
                            size="sm" 
                            className="h-8 rounded-xl text-[9px] font-bold uppercase"
                          >
                            + Fila
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-primary">Columnas (Cabeceras)</Label>
                        <div className="flex flex-wrap gap-2">
                          {(currentBlock.data.headers || []).map((header: string, headerIdx: number) => (
                            <div key={headerIdx} className="flex items-center gap-1.5 bg-muted/30 p-2 rounded-xl border">
                              <Input 
                                value={header} 
                                onChange={e => {
                                  const newHeaders = [...currentBlock.data.headers];
                                  newHeaders[headerIdx] = e.target.value;
                                  updateBlockData(currentBlock.id, "headers", newHeaders);
                                }}
                                className="w-28 h-8 text-xs font-bold"
                              />
                              <button 
                                onClick={() => {
                                  const newHeaders = [...currentBlock.data.headers];
                                  newHeaders.splice(headerIdx, 1);
                                  updateBlockData(currentBlock.id, "headers", newHeaders);
                                  const newRows = (currentBlock.data.rows || []).map((row: string[]) => {
                                    const r = [...row];
                                    r.splice(headerIdx, 1);
                                    return r;
                                  });
                                  updateBlockData(currentBlock.id, "rows", newRows);
                                }}
                                className="text-muted-foreground hover:text-red-500 p-0.5"
                                title="Eliminar columna"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label className="text-[10px] font-black uppercase text-primary">Celdas de Datos (Filas)</Label>
                        <div className="space-y-3">
                          {(currentBlock.data.rows || []).map((row: string[], rowIdx: number) => (
                            <div key={rowIdx} className="p-3 border rounded-xl bg-card/50 flex flex-col gap-2 relative">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Fila #{rowIdx + 1}</span>
                                <button 
                                  onClick={() => {
                                    const newRows = [...currentBlock.data.rows];
                                    newRows.splice(rowIdx, 1);
                                    updateBlockData(currentBlock.id, "rows", newRows);
                                  }}
                                  className="text-muted-foreground hover:text-red-500 p-1"
                                  title="Eliminar fila"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {row.map((cell: string, cellIdx: number) => (
                                  <div key={cellIdx} className="space-y-1">
                                    <Label className="text-[9px] text-muted-foreground/60 leading-none truncate max-w-full block">
                                      {currentBlock.data.headers?.[cellIdx] || `Col ${cellIdx + 1}`}
                                    </Label>
                                    <Input 
                                      value={cell || ""} 
                                      onChange={e => {
                                        const newRows = [...currentBlock.data.rows];
                                        const r = [...newRows[rowIdx]];
                                        r[cellIdx] = e.target.value;
                                        newRows[rowIdx] = r;
                                        updateBlockData(currentBlock.id, "rows", newRows);
                                      }}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
    </>
  );
}
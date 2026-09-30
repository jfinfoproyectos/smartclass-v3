"use client";

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DocumentMetadata, 
  DocumentStyleConfig, 
  CorporateColorScheme, 
  CoverStyle, 
  DocumentStatus,
  PageSize,
  PageOrientation,
  FontFamily
} from "../types";
import { CORPORATE_COLOR_SCHEMES, STATUS_CONFIG } from "../constants/themes";
import { 
  Palette, 
  FileText, 
  Layout, 
  Sliders, 
  Shield, 
  Check, 
  Sparkles,
  BookOpen,
  Layers
} from "lucide-react";

interface DocumentSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: DocumentMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<DocumentMetadata>>;
  styleConfig: DocumentStyleConfig;
  setStyleConfig: React.Dispatch<React.SetStateAction<DocumentStyleConfig>>;
}

export function DocumentSettingsDrawer({
  open,
  onOpenChange,
  metadata,
  setMetadata,
  styleConfig,
  setStyleConfig,
}: DocumentSettingsDrawerProps) {
  const colorSchemes: CorporateColorScheme[] = [
    "teal",
    "slate",
    "navy",
    "crimson",
    "emerald",
    "indigo",
    "amber",
    "cyber"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border bg-background shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Configuración Corporativa del Documento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Personaliza la identidad institucional, paleta de colores, cabeceras y gobernanza del PDF.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="metadata" className="w-full">
          <div className="px-6 pt-3 border-b border-border/60 bg-muted/10">
            <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/60 p-1">
              <TabsTrigger value="metadata" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <FileText className="h-3.5 w-3.5" />
                Metadatos
              </TabsTrigger>
              <TabsTrigger value="design" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Palette className="h-3.5 w-3.5" />
                Diseño & Estilo
              </TabsTrigger>
              <TabsTrigger value="governance" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                <Shield className="h-3.5 w-3.5" />
                Gobernanza & Páginas
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Metadatos */}
          <TabsContent value="metadata" className="p-6 space-y-4 m-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Título Principal del Documento</Label>
                <Input
                  className="mt-1 text-xs"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Informe Ejecutivo de Arquitectura"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Subtítulo o Resumen Breve</Label>
                <Input
                  className="mt-1 text-xs"
                  value={metadata.subtitle || ""}
                  onChange={(e) => setMetadata(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ej: Evaluación de rendimiento y seguridad"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Institución o Empresa</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.institution}
                    onChange={(e) => setMetadata(prev => ({ ...prev, institution: e.target.value }))}
                    placeholder="Ej: SmartClass Enterprise"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Autor / Responsable Técnico</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.author}
                    onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Ej: Ing. Carlos Mendoza"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Categoría / Tipo</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.category}
                    onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Ej: Auditoría Técnica"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Versión</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.version}
                    onChange={(e) => setMetadata(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="Ej: 1.0.0"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Código Folio / Referencia</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.folioCode}
                    onChange={(e) => setMetadata(prev => ({ ...prev, folioCode: e.target.value }))}
                    placeholder="Ej: DOC-2026-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Estado del Documento</Label>
                  <Select
                    value={metadata.status}
                    onValueChange={(val: DocumentStatus) => setMetadata(prev => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Fecha de Emisión</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={metadata.dateStr}
                    onChange={(e) => setMetadata(prev => ({ ...prev, dateStr: e.target.value }))}
                    placeholder="Ej: 28 de Septiembre de 2026"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Diseño & Estilo */}
          <TabsContent value="design" className="p-6 space-y-5 m-0">
            {/* Paleta Corporativa */}
            <div>
              <Label className="text-xs font-semibold text-foreground block mb-2">
                Paleta de Color Corporativa
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {colorSchemes.map((cs) => {
                  const item = CORPORATE_COLOR_SCHEMES[cs];
                  const isSelected = styleConfig.colorScheme === cs;
                  return (
                    <button
                      key={cs}
                      type="button"
                      onClick={() => setStyleConfig(prev => ({ ...prev, colorScheme: cs }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs" 
                          : "border-border hover:border-border/80 bg-card"
                      }`}
                    >
                      <div 
                        className="w-5 h-5 rounded-full shrink-0 shadow-inner flex items-center justify-center text-white text-[10px]" 
                        style={{ backgroundColor: item.accent }}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-foreground truncate">{item.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estilo de Portada */}
            <div>
              <Label className="text-xs font-semibold text-foreground block mb-2">
                Estilo de Portada / Encabezado
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { id: "none", title: "Directo 1:1 Markdown", desc: "Sin cabeceras inyectadas (Fiel al Markdown)" },
                  { id: "hero", title: "Hero Banner", desc: "Cabecera ejecutiva en página 1" },
                  { id: "cover-page", title: "Portada Completa", desc: "Página inicial independiente de lujo" },
                  { id: "minimal", title: "Minimalista", desc: "Cabecera compacta académica" },
                ].map((item) => {
                  const isSelected = styleConfig.coverStyle === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStyleConfig(prev => ({ ...prev, coverStyle: item.id as CoverStyle }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs" 
                          : "border-border hover:border-border/80 bg-card"
                      }`}
                    >
                      <p className="text-xs font-bold text-foreground flex items-center justify-between">
                        {item.title}
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipografía y Tema de Código */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold text-foreground">Familia Tipográfica PDF</Label>
                <Select
                  value={styleConfig.fontFamily}
                  onValueChange={(val: FontFamily) => setStyleConfig(prev => ({ ...prev, fontFamily: val }))}
                >
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Helvetica" className="text-xs">Helvetica (Moderna Sans-Serif)</SelectItem>
                    <SelectItem value="Times-Roman" className="text-xs">Times-Roman (Formal Editorial)</SelectItem>
                    <SelectItem value="Courier" className="text-xs">Courier (Monospace Técnica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Tema de Resaltado de Código</Label>
                <Select
                  value={styleConfig.codeTheme}
                  onValueChange={(val: string) => setStyleConfig(prev => ({ ...prev, codeTheme: val }))}
                >
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-dark-pro" className="text-xs">One Dark Pro (Default)</SelectItem>
                    <SelectItem value="github-light" className="text-xs">GitHub Light (Claro)</SelectItem>
                    <SelectItem value="github-dark" className="text-xs">GitHub Dark</SelectItem>
                    <SelectItem value="dracula" className="text-xs">Dracula Dark</SelectItem>
                    <SelectItem value="nord" className="text-xs">Nord Frost</SelectItem>
                    <SelectItem value="monokai" className="text-xs">Monokai Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Switch Números de Línea en Código */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
              <div>
                <p className="text-xs font-semibold text-foreground">Numeración en Bloques de Código</p>
                <p className="text-[11px] text-muted-foreground">Muestra números de línea en snippets de código</p>
              </div>
              <Switch
                checked={styleConfig.showLineNumbers}
                onCheckedChange={(val) => setStyleConfig(prev => ({ ...prev, showLineNumbers: val }))}
              />
            </div>
          </TabsContent>

          {/* TAB 3: Gobernanza & Páginas */}
          <TabsContent value="governance" className="p-6 space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground">Tamaño de Hoja</Label>
                <Select
                  value={styleConfig.pageSize}
                  onValueChange={(val: PageSize) => setStyleConfig(prev => ({ ...prev, pageSize: val }))}
                >
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4" className="text-xs">A4 (Estándar Internacional)</SelectItem>
                    <SelectItem value="LETTER" className="text-xs">Carta / Letter (US)</SelectItem>
                    <SelectItem value="LEGAL" className="text-xs">Oficio / Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">Orientación</Label>
                <Select
                  value={styleConfig.orientation}
                  onValueChange={(val: PageOrientation) => setStyleConfig(prev => ({ ...prev, orientation: val }))}
                >
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait" className="text-xs">Vertical (Portrait)</SelectItem>
                    <SelectItem value="landscape" className="text-xs">Horizontal (Landscape)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                <div>
                  <p className="text-xs font-semibold text-foreground">Encabezado Repetitivo Superior</p>
                  <p className="text-[11px] text-muted-foreground">Muestra nombre de institución y proyecto en cada página</p>
                </div>
                <Switch
                  checked={styleConfig.showRunningHeader}
                  onCheckedChange={(val) => setStyleConfig(prev => ({ ...prev, showRunningHeader: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                <div>
                  <p className="text-xs font-semibold text-foreground">Pie de Página y Numeración</p>
                  <p className="text-[11px] text-muted-foreground">Muestra "Página X de Y" y cláusula corporativa</p>
                </div>
                <Switch
                  checked={styleConfig.showRunningFooter}
                  onCheckedChange={(val) => setStyleConfig(prev => ({ ...prev, showRunningFooter: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                <div>
                  <p className="text-xs font-semibold text-foreground">Marca de Agua de Fondo</p>
                  <p className="text-[11px] text-muted-foreground">Imprime texto diagonal translúcido (ej: CONFIDENCIAL / OFICIAL)</p>
                </div>
                <Switch
                  checked={styleConfig.showWatermark}
                  onCheckedChange={(val) => setStyleConfig(prev => ({ ...prev, showWatermark: val }))}
                />
              </div>

              {styleConfig.showWatermark && (
                <div>
                  <Label className="text-xs font-semibold text-foreground">Texto de la Marca de Agua</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={styleConfig.watermarkText || ""}
                    onChange={(e) => setStyleConfig(prev => ({ ...prev, watermarkText: e.target.value }))}
                    placeholder="Ej: CONFIDENCIAL / OFICIAL / BORRADOR"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-foreground">Texto Personalizado Pie de Página</Label>
                <Input
                  className="mt-1 text-xs"
                  value={styleConfig.customFooterText || ""}
                  onChange={(e) => setStyleConfig(prev => ({ ...prev, customFooterText: e.target.value }))}
                  placeholder="Ej: SmartClass Enterprise • Todos los derechos reservados."
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 flex justify-end">
          <Button 
            type="button" 
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold gap-1.5"
          >
            <Check className="h-4 w-4" />
            Aplicar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

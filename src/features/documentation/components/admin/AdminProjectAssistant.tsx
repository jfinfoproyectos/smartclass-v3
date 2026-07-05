"use client";

import React, { useState } from "react";
import { 
  HelpCircle, 
  BookOpen, 
  Settings, 
  Code2, 
  Info, 
  Layers, 
  FileCode2, 
  Library,
  Copy,
  FolderTree,
  Globe,
  AlertCircle,
  Hash,
  Terminal as TerminalIcon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function AdminProjectAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("¡Copiado al portapapeles!");
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
          "rounded-xl transition-all duration-300 gap-2 h-9 px-4", 
          isOpen ? "bg-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
        )}
        onClick={() => setIsOpen(true)}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Ayuda</span>
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="!sm:max-w-[70vw] !w-[70vw] border-l border-white/10 bg-background/95 backdrop-blur-3xl p-0 overflow-hidden flex flex-col shadow-2xl">
          <SheetHeader className="p-10 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-2xl shadow-primary/20 animate-pulse">
                <Library className="w-8 h-8" />
              </div>
              <div>
                <SheetTitle className="text-3xl font-black uppercase tracking-tighter">Omni Assistant</SheetTitle>
                <SheetDescription className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">The Ultimate Site Architecture Masterclass</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="architecture" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-10 py-6 bg-white/[0.02]">
              <TabsList className="w-full bg-white/5 border border-white/10 p-1.5 rounded-2xl h-14">
                <TabsTrigger value="architecture" className="flex-1 gap-2 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl">
                  <Layers className="w-4 h-4" /> Arquitectura
                </TabsTrigger>
                <TabsTrigger value="frontmatter" className="flex-1 gap-2 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl">
                  <FileCode2 className="w-4 h-4" /> Frontmatter
                </TabsTrigger>
                <TabsTrigger value="site" className="flex-1 gap-2 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl">
                  <Globe className="w-4 h-4" /> Sitio & SEO
                </TabsTrigger>
                <TabsTrigger value="components" className="flex-1 gap-2 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white transition-all rounded-xl">
                  <Code2 className="w-4 h-4" /> Componentes
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-10 pb-20 custom-scrollbar">
              {/* === ARCHITECTURE === */}
              <TabsContent value="architecture" className="space-y-10 mt-0 focus-visible:outline-none">
                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                    <Info className="w-4 h-4" /> Estructura del Ecosistema
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    FusionDoc organiza el contenido basándose en una jerarquía física en GitHub. Entender los 3 niveles es crucial para un despliegue exitoso.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors group">
                      <Globe className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="text-xs font-bold text-foreground mb-2">Nivel 1: Proyecto</h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">La carpeta raíz (ej: <code className="text-primary/80">/docs/v2</code>). Define la identidad global del sitio.</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors group">
                      <Layers className="w-5 h-5 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="text-xs font-bold text-foreground mb-2">Nivel 2: Tópicos</h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">Carpetas que agrupan contenidos. Deben tener un <code className="text-primary/80">index.md</code> para ser visibles.</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 transition-colors group">
                      <FileCode2 className="w-5 h-5 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                      <h4 className="text-xs font-bold text-foreground mb-2">Nivel 3: Páginas</h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">Archivos <code className="text-primary/80">.md</code> individuales. Son las hojas finales de contenido que lee el usuario.</p>
                    </div>
                  </div>
                </section>

                <section className="p-6 rounded-3xl border border-dashed border-white/10 bg-white/5 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Anidamiento Enterprise</h4>
                    <pre className="text-[11px] font-mono leading-relaxed text-muted-foreground bg-black/40 p-6 rounded-2xl border border-white/5">
                      docs/{"\n"}
                      └── mi-proyecto/          <span className="text-primary/30"># Nivel 1</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;├── index.md             <span className="text-primary/30"># Homepage del sitio</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;└── 01-primeros-pasos/   <span className="text-primary/30"># Nivel 2 (Tópico)</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── index.md         <span className="text-primary/30"># Metadata del grupo</span>{"\n"}
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 01-instalar.md    <span className="text-primary/30"># Nivel 3 (Contenido)</span>
                    </pre>
                  </div>
                </section>
              </TabsContent>

              {/* === FRONTMATTER === */}
              <TabsContent value="frontmatter" className="space-y-10 mt-0 focus-visible:outline-none">
                <section className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                    <FileCode2 className="w-4 h-4" /> Diccionario de Metadatos
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    El Frontmatter es el bloque YAML al inicio de tus archivos <code className="text-primary/70">.md</code> que controla el comportamiento lógico y visual de la página.
                  </p>

                  <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/5 shadow-2xl">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="p-5 font-black uppercase tracking-widest text-primary">Atributo</th>
                          <th className="p-5 font-black uppercase tracking-widest text-primary">Propósito</th>
                          <th className="p-5 font-black uppercase tracking-widest text-primary">Ejemplo / Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 whitespace-nowrap">
                        {[
                          { k: "title", d: "Título principal de la página (H1).", v: "string" },
                          { k: "description", d: "Extracto para tarjetas NavigationGrid y SEO.", v: "string" },
                          { k: "icon", d: "Icono de Lucide (ej: lucide:cpu).", v: "slug" },
                          { k: "order", d: "Orden numérico dentro de su grupo.", v: "number" },
                          { k: "category", d: "Nombre del grupo en el menú lateral.", v: "string" },
                          { k: "categoryOrder", d: "Orden del grupo entero en el menú.", v: "number" },
                          { k: "draft", d: "Si es true, oculta la página en producción.", v: "boolean" },
                          { k: "date", d: "Publicación futura (YYYY-MM-DD).", v: "date" },
                          { k: "public", d: "Raíz: Acceso sin login (solo index.md raíz).", v: "boolean" }
                        ].map(item => (
                          <tr key={item.k} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-5 font-mono font-bold text-primary group-hover:pl-7 transition-all tracking-tight">
                               <span className="text-primary/40 mr-1">#</span>{item.k}
                            </td>
                            <td className="p-5 text-muted-foreground/80 leading-snug whitespace-normal">{item.d}</td>
                            <td className="p-5 font-black uppercase tracking-tighter text-muted-foreground/30">{item.v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                    <Code2 className="w-4 h-4" /> Escenarios de Configuración
                  </h4>

                  <div className="grid grid-cols-1 gap-8">
                    {/* Caso 1: Home del Proyecto */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">01</div>
                          <span className="text-xs font-bold">Home del Proyecto (index.md raíz)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`---\ntitle: Mi Framework Pro\ndescription: La guía definitiva para el motor v4.\nicon: lucide:shield-check\norder: 1\npublic: true\n---`)} className="h-8 gap-2 text-[10px]">
                          <Copy className="w-3 h-3" /> Copiar
                        </Button>
                      </div>
                      <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-3">
                         <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-4 mb-4">
                           Configura la identidad del sitio entero. El campo <code className="text-primary">public: true</code> permite que el sitio sea visible sin iniciar sesión.
                         </p>
                         <pre className="text-[11px] font-mono text-primary/70 leading-relaxed">
                            ---{"\n"}
                            title: Mi Framework Pro{"\n"}
                            description: La guía definitiva para el motor v4{"\n"}
                            icon: lucide:shield-check    {"\n"}
                            order: 1{"\n"}
                            public: true     <span className="text-primary/30"># Visibilidad global</span>{"\n"}
                            ---
                         </pre>
                      </div>
                    </div>

                    {/* Caso 2: Guía Estándar */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-[10px]">02</div>
                          <span className="text-xs font-bold">Página de Contenido (Guía)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`---\ntitle: Instalación Rápida\ncategory: Comenzando\norder: 5\nicon: lucide:download-cloud\n---`)} className="h-8 gap-2 text-[10px]">
                          <Copy className="w-3 h-3" /> Copiar
                        </Button>
                      </div>
                      <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-3">
                         <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-blue-500/20 pl-4 mb-4">
                           Controla la jerarquía en el Sidebar. <code className="text-blue-500">category</code> agrupa este archivo junto a otros similares.
                         </p>
                         <pre className="text-[11px] font-mono text-blue-400/60 leading-relaxed">
                            ---{"\n"}
                            title: Instalación Rápida{"\n"}
                            category: Comenzando      <span className="text-blue-500/30"># Nombre del grupo</span>{"\n"}
                            order: 5                  <span className="text-blue-500/30"># Posición en el grupo</span>{"\n"}
                            icon: lucide:download-cloud{"\n"}
                            ---
                         </pre>
                      </div>
                    </div>

                    {/* Caso 3: Programación y Ocultación */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-[10px]">03</div>
                          <span className="text-xs font-bold">Lanzamiento Programado (Draft/Date)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`---\ntitle: Feature Secreta\ndate: 2026-12-31\ndraft: true\n---`)} className="h-8 gap-2 text-[10px]">
                          <Copy className="w-3 h-3" /> Copiar
                        </Button>
                      </div>
                      <div className="p-6 rounded-3xl bg-black/40 border border-white/5 space-y-3">
                         <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-amber-500/20 pl-4 mb-4">
                           Ideal para preparar documentación antes de un despliegue. Si la <code className="text-amber-500">date</code> es futura, el sistema mantendrá la página en 404 automáticamente.
                         </p>
                         <pre className="text-[11px] font-mono text-amber-400/60 leading-relaxed">
                            ---{"\n"}
                            title: Feature Secreta{"\n"}
                            date: 2026-12-31       <span className="text-amber-500/30"># No visible hasta 2026</span>{"\n"}
                            draft: true            <span className="text-amber-500/30"># Oculto manualmente</span>{"\n"}
                            ---
                         </pre>
                      </div>
                    </div>
                  </div>
                </section>
              </TabsContent>

              {/* === SITE CONFIG === */}
              <TabsContent value="site" className="space-y-8 mt-0 focus-visible:outline-none">
                <section className="space-y-10">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2 mb-4">
                      <Settings className="w-4 h-4" /> Configuración Global de Proyecto
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      El sitio web hereda su identidad del archivo <code className="text-primary/80">index.md</code> ubicado en la raíz de su carpeta de proyecto.
                    </p>
                    <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-background border border-white/10 flex items-center justify-center font-black text-primary shadow-lg">P</div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold">Public/Private Mode</h4>
                          <p className="text-[11px] text-muted-foreground">Usa <code className="text-primary/80 font-mono">public: true</code> en el frontmatter raíz para que todos puedan ver el proyecto sin loguearse.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-background border border-white/10 flex items-center justify-center font-black text-primary shadow-lg">
                           <Layout className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold">Iconografía del Proyecto</h4>
                          <p className="text-[11px] text-muted-foreground">El ícono definido aquí será el que aparezca en el seleccionador de proyectos del Dashboard.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       < Globe className="w-4 h-4" /> Visibilidad Programada
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      FusionDoc incluye un motor de cronograma inteligente. Si estableces una <code className="text-primary/80">date</code> futura, el motor ocultará automáticamente la página del sidebar y la deshabilitará para el público hasta que llegue la fecha, permitiéndote preparar lanzamientos con antelación.
                    </p>
                  </div>
                </section>
              </TabsContent>

              {/* === COMPONENTS === */}
              <TabsContent value="components" className="space-y-8 mt-0 focus-visible:outline-none">
                <section className="grid grid-cols-1 gap-8">
                   <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                        <Library className="w-4 h-4" /> Librería de Componentes MDX
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Potencia tus documentos inyectando componentes interactivos de alta fidelidad. Aquí tienes los más utilizados:
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      {[
                        { name: "Alert", icon: AlertCircle, usage: '<Alert variant="info" title="Info">...</Alert>' },
                        { name: "Steps", icon: Layers, usage: '<Steps>\n  <Step title="1">...</Step>\n</Steps>' },
                        { name: "Terminal", icon: TerminalIcon, usage: '<Terminal title="npm">npm start</Terminal>' },
                        { name: "Embed", icon: Code2, usage: '<CodeEmbed url="..." autoHeight />' },
                        { name: "Video", icon: Globe, usage: '<Video src="..." />' },
                        { name: "Tabs", icon: Settings, usage: '<Tabs items={["A", "B"]}>...</Tabs>' }
                      ].map((comp) => (
                        <div key={comp.name} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all group">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                              <comp.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest">{comp.name}</span>
                          </div>
                          <div className="relative group/code">
                            <pre className="text-[9px] font-mono text-muted-foreground/60 bg-black/40 p-3 rounded-xl overflow-hidden truncate">
                              {comp.usage}
                            </pre>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity h-6 w-6"
                              onClick={() => copyToClipboard(comp.usage)}
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                   </div>

                   <div className="p-8 rounded-3xl bg-secondary/5 border border-dashed border-white/10 text-center space-y-3">
                      <p className="text-xs text-muted-foreground">
                        ¿Necesitas más componentes? Usa el <strong>Asistente de Componentes</strong> (Icono <Plus className="inline w-3 h-3" />) en la barra de herramientas del editor.
                      </p>
                   </div>
                </section>
              </TabsContent>
            </div>
          </Tabs>

          <div className="absolute top-6 right-10">
             <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-white/10 shrink-0">
               <X className="w-6 h-6 text-muted-foreground/40" />
             </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function Layout({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

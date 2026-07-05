"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { updateSettingsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { SHIKI_THEMES } from "@/features/documentation/components/CodeThemeSelector";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { 
  Globe, 
  Palette, 
  Save, 
  Loader2,
  ExternalLink
} from "lucide-react";
import DynamicIcon from "@/features/documentation/components/DynamicIcon";
import { SocialLinksEditor } from "./SocialLinksEditor";

interface SettingsFormProps {
  initialSettings: any;
  themes: any[];
}

export function SettingsForm({ initialSettings, themes }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    siteTitle: initialSettings.siteTitle || "",
    siteLogo: initialSettings.siteLogo || "",
    footerText: initialSettings.footerText || "",
    socialLinks: initialSettings.socialLinks || "[]",
    defaultTheme: initialSettings.defaultTheme || "",
    defaultAppearance: initialSettings.defaultAppearance || "",
    defaultCodeTheme: initialSettings.defaultCodeTheme || "",
    forceDefaultSettings: initialSettings.forceDefaultSettings || false,
  });

  const { setTheme } = useTheme();

  // LIVE PREVIEW EFFECT - Removed setTheme to prevent unwanted theme switching
  // The theme will now only change upon saving or via the header toggle.
  useEffect(() => {
    // Force hide/show buttons live preview (this only affects UI visibility, not theme)
    window.dispatchEvent(new CustomEvent("fusiondoc-force-preview", { detail: formData.forceDefaultSettings }));
  }, [formData.forceDefaultSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [activeTab, setActiveTab] = useState("general");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateSettingsAction(formData);
      if (result.success) {
        toast.success("Configuración actualizada correctamente");
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar la configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-500">
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        {/* Integrated Header for Settings */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight font-heading uppercase">
              Configuración <span className="text-primary">Global</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
              Personalización y Ajustes del Sistema
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || (activeTab === "appearance" && !formData.forceDefaultSettings && formData.forceDefaultSettings === initialSettings.forceDefaultSettings)}
              className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest gap-2.5 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-[10px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </div>

        <TabsList className="h-12 bg-muted/20 p-1 gap-1 border border-border/50 rounded-2xl w-fit">
          <TabsTrigger value="general" className="rounded-xl gap-2 font-black text-[9px] uppercase tracking-widest px-6 h-10 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Globe className="w-3.5 h-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-xl gap-2 font-black text-[9px] uppercase tracking-widest px-6 h-10 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Palette className="w-3.5 h-3.5" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        <div className="outline-none space-y-8">
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 pb-6 pt-6 px-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Identidad del Sitio</CardTitle>
              <CardDescription className="text-xs font-medium">Nombre, logo y textos globales.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="siteTitle" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Título del Sitio</Label>
                  <Input
                    id="siteTitle"
                    name="siteTitle"
                    value={formData.siteTitle}
                    onChange={handleChange}
                    placeholder="Ej: FusionDoc"
                    className="h-12 rounded-xl bg-muted/20 border-border focus:bg-background transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="siteLogo" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Logo (Icono)</Label>
                  <Input
                    id="siteLogo"
                    name="siteLogo"
                    value={formData.siteLogo}
                    onChange={handleChange}
                    placeholder="Ej: lucide:package"
                    className="h-12 rounded-xl bg-muted/20 border-border focus:bg-background transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="footerText" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Texto del Pie de Página</Label>
                <Input
                  id="footerText"
                  name="footerText"
                  value={formData.footerText}
                  onChange={handleChange}
                  placeholder="Ej: © 2026 FusionDoc"
                  className="h-12 rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="socialLinks" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Enlaces Sociales</Label>
                <SocialLinksEditor 
                  value={formData.socialLinks} 
                  onChange={(val) => setFormData(prev => ({ ...prev, socialLinks: val }))} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 pb-6 pt-6 px-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Preferencia de Estilo</CardTitle>
              <CardDescription className="text-xs font-medium">Temas y resaltado de código.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className={cn("grid gap-6 sm:grid-cols-2 transition-all duration-300", !formData.forceDefaultSettings && "opacity-40 grayscale pointer-events-none")}>
                <div className="space-y-3">
                  <Label htmlFor="defaultTheme" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Tema por Defecto</Label>
                  <Select 
                    value={formData.defaultTheme} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, defaultTheme: val }))}
                    disabled={!formData.forceDefaultSettings}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border focus:bg-background transition-all">
                      <SelectValue placeholder="Selecciona un tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Predeterminado</SelectItem>
                      {themes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="defaultAppearance" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Apariencia</Label>
                  <Select 
                    value={formData.defaultAppearance} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, defaultAppearance: val }))}
                    disabled={!formData.forceDefaultSettings}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border focus:bg-background transition-all">
                      <SelectValue placeholder="Selecciona apariencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="dark">Oscuro (Dark)</SelectItem>
                      <SelectItem value="light">Claro (Light)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={cn("space-y-3 transition-all duration-300", !formData.forceDefaultSettings && "opacity-40 grayscale pointer-events-none")}>
                <Label htmlFor="defaultCodeTheme" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Tema de Código (Shiki)</Label>
                <Select 
                  value={formData.defaultCodeTheme} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, defaultCodeTheme: val }))}
                  disabled={!formData.forceDefaultSettings}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border focus:bg-background transition-all">
                    <SelectValue placeholder="Selecciona tema de código" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {SHIKI_THEMES.map(st => (
                      <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="space-y-0.5">
                    <Label htmlFor="forceDefaultSettings" className="text-base font-bold">Forzar valores por defecto</Label>
                    <p className="text-xs text-muted-foreground font-medium">
                      Si se activa, los usuarios no verán los botones de personalización en el header.
                    </p>
                  </div>
                  <Switch
                    id="forceDefaultSettings"
                    checked={formData.forceDefaultSettings}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, forceDefaultSettings: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end pt-2">
          <Button 
            type="submit" 
            disabled={loading || (activeTab === "appearance" && !formData.forceDefaultSettings && formData.forceDefaultSettings === initialSettings.forceDefaultSettings)}
            className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest gap-2.5 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
      </Tabs>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { updateSystemSettingsAction } from "@/app/admin-actions";
import { 
    Key, 
    Save, 
    ShieldCheck, 
    User, 
    ActivitySquare, 
    Palette, 
    Code, 
    Sun, 
    Moon, 
    Monitor, 
    Loader2,
    RefreshCw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeInfo } from "@/components/theme/ThemeSelector";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

interface AdminSettingsProps {
    initialSettings: {
        geminiApiKeyMode: "GLOBAL" | "USER";
        hasGlobalKey: boolean;
        hasGithubToken: boolean;
        institutionName?: string | null;
        institutionLogo?: string | null;
        institutionHeroImage?: string | null;
        footerText?: string | null;
        auditLogEnabled: boolean;
        appThemeMode: string;
        appThemeColor: string;
        appAllowThemeColorChange: boolean;
        appCodeTheme: string;
        appAllowCodeThemeChange: boolean;
    };
    themes: ThemeInfo[];
}

export function AdminSettings({ initialSettings, themes }: AdminSettingsProps) {
    const { setTheme } = useTheme();
    const [auditLogEnabled, setAuditLogEnabled] = useState(initialSettings.auditLogEnabled);
    const [visualSettings, setVisualSettings] = useState({
        appThemeMode: initialSettings.appThemeMode || "STUDENT",
        appThemeColor: initialSettings.appThemeColor || "zinc",
        appAllowThemeColorChange: initialSettings.appAllowThemeColorChange ?? true,
        appCodeTheme: initialSettings.appCodeTheme || "one-dark-pro",
        appAllowCodeThemeChange: initialSettings.appAllowCodeThemeChange ?? true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSaveGeneral = () => {
        startTransition(async () => {
            try {
                await updateSystemSettingsAction({
                    auditLogEnabled: auditLogEnabled,
                });

                toast.success("Configuración guardada", {
                    description: "Los ajustes generales han sido actualizados"
                });
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo guardar la configuración"
                });
            }
        });
    };

    const autoSaveVisuals = async (updates: any) => {
        setIsSaving(true);
        try {
            const newSettings = { ...visualSettings, ...updates };
            await updateSystemSettingsAction(newSettings);
            
            // Apply theme changes locally
            if (updates.appThemeMode) {
                if (updates.appThemeMode === "LIGHT") setTheme("light");
                else if (updates.appThemeMode === "DARK") setTheme("dark");
            }

            if (updates.appThemeColor) {
                const selectedTheme = themes.find(t => t.id === updates.appThemeColor);
                if (selectedTheme) {
                    applyThemeColorLocally(selectedTheme);
                } else if (updates.appThemeColor === "zinc") {
                    removeThemeColorLocally();
                }
            }
        } catch (error: any) {
            toast.error("Error al guardar identidad visual", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const applyThemeColorLocally = (theme: ThemeInfo) => {
        const elId = "smartclass-dynamic-theme";
        let styleEl = document.getElementById(elId);
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = elId;
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = theme.cssContent;
        localStorage.setItem("smartclass-theme", theme.id);
        localStorage.setItem("smartclass-theme-css-v2", theme.cssContent);
        window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
    };

    const removeThemeColorLocally = () => {
        const elId = "smartclass-dynamic-theme";
        const styleEl = document.getElementById(elId);
        if (styleEl) styleEl.remove();
        localStorage.setItem("smartclass-theme", "default");
        localStorage.removeItem("smartclass-theme-css-v2");
        window.dispatchEvent(new CustomEvent("smartclass-theme-changed"));
    };

    const updateVisualSetting = (key: string, value: any) => {
        setVisualSettings(prev => ({ ...prev, [key]: value }));
        autoSaveVisuals({ [key]: value });
    };

    return (
        <div className="space-y-6 relative">
            {/* Auto-save status indicator */}
            <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full bg-background border shadow-2xl transition-all duration-500",
                    isSaving ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                )}>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Sincronizando...</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
                    <p className="text-muted-foreground">
                        Gestiona las preferencias globales de la institución
                    </p>
                </div>
                {isSaving && (
                    <Badge variant="outline" className="animate-pulse bg-primary/5 border-primary/20 text-primary px-3 py-1">
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Guardando...
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ActivitySquare className="h-5 w-5" />
                                Registro de Auditoría
                            </CardTitle>
                            <CardDescription>
                                Controla si el sistema registra todas las acciones de los usuarios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Monitoreo de Acciones (Audit Logs)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Si desactivas esta opción, el sistema dejará de guardar nuevos registros de auditoría.
                                    </p>
                                </div>
                                <Switch
                                    checked={auditLogEnabled}
                                    onCheckedChange={setAuditLogEnabled}
                                    disabled={isPending}
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSaveGeneral} disabled={isPending}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isPending ? "Guardando..." : "Guardar Cambios Generales"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Personalización de la Institución</CardTitle>
                            <CardDescription>Define el nombre y logo que aparecerán en la página de inicio.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={async (formData) => {
                                const { updateSettingsAction } = await import("@/features/admin/actions/settingsActions");
                                await updateSettingsAction(formData);
                                toast.success("Configuración actualizada");
                            }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="institutionName">Nombre de la Institución</Label>
                                    <Input
                                        id="institutionName"
                                        name="institutionName"
                                        defaultValue={initialSettings.institutionName || ""}
                                        placeholder="Ej: Universidad EIA"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="footerText">Texto del Footer</Label>
                                    <Input
                                        id="footerText"
                                        name="footerText"
                                        defaultValue={initialSettings.footerText || ""}
                                        placeholder="Ej: © 2025 EIA - Todos los derechos reservados"
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit">Guardar Personalización</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Appearance & Style Card - Global Policy */}
                    <Card className="h-full border-primary/20 shadow-xl shadow-primary/5 overflow-hidden">
                        <div className="h-1 bg-primary/20 w-full" />
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Palette className="h-5 w-5 text-primary" />
                                IDENTIDAD VISUAL DE LA APLICACIÓN
                            </CardTitle>
                            <CardDescription>
                                Los cambios se aplican inmediatamente a toda la plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Theme Mode Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-bold">Modo de Interfaz</Label>
                                    <div className="flex items-center gap-1 p-1 bg-accent/50 rounded-lg border">
                                        <Badge 
                                            variant={visualSettings.appThemeMode === "LIGHT" ? "default" : "outline"} 
                                            className="cursor-pointer px-2 transition-all" 
                                            onClick={() => updateVisualSetting("appThemeMode", "LIGHT")}
                                        >
                                            <Sun className="w-3.5 h-3.5" />
                                        </Badge>
                                        <Badge 
                                            variant={visualSettings.appThemeMode === "DARK" ? "default" : "outline"} 
                                            className="cursor-pointer px-2 transition-all" 
                                            onClick={() => updateVisualSetting("appThemeMode", "DARK")}
                                        >
                                            <Moon className="w-3.5 h-3.5" />
                                        </Badge>
                                        <Badge 
                                            variant={visualSettings.appThemeMode === "STUDENT" ? "default" : "outline"} 
                                            className="cursor-pointer px-2 transition-all" 
                                            onClick={() => updateVisualSetting("appThemeMode", "STUDENT")}
                                        >
                                            <Monitor className="w-3.5 h-3.5" />
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium italic">
                                    {visualSettings.appThemeMode === "STUDENT" ? "Elección libre para estudiantes." : `Interfaz bloqueada en modo ${visualSettings.appThemeMode === "LIGHT" ? "claro" : "oscuro"}.`}
                                </p>
                            </div>

                            {/* Theme Selection (Palette) */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="flex items-center justify-between">
                                   <div className="space-y-0.5">
                                      <Label className="text-sm font-bold">Tema Visual (Paleta Maestro)</Label>
                                      <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">Branding Institucional</p>
                                   </div>
                                   <Select 
                                      value={visualSettings.appThemeColor || "zinc"} 
                                      onValueChange={(val) => updateVisualSetting("appThemeColor", val)}
                                   >
                                      <SelectTrigger className="w-44 h-10 text-xs font-bold bg-background border-primary/20">
                                          <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="zinc">Zinc (Predeterminado)</SelectItem>
                                          {themes.map(theme => (
                                              <SelectItem key={theme.id} value={theme.id}>
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: theme.primaryColor }} />
                                                      {theme.name}
                                                  </div>
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                   </Select>
                                </div>
                            </div>

                            {/* Code Style Selection */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="flex items-center justify-between">
                                   <div className="space-y-0.5">
                                      <Label className="text-sm font-bold">Resaltado de Código</Label>
                                      <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">Estilo de Programación</p>
                                   </div>
                                   <Select 
                                      value={visualSettings.appCodeTheme} 
                                      onValueChange={(val) => updateVisualSetting("appCodeTheme", val)}
                                   >
                                      <SelectTrigger className="w-44 h-10 text-xs font-bold bg-background border-primary/20">
                                          <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="one-dark-pro">One Dark Pro</SelectItem>
                                          <SelectItem value="github-dark">GitHub Dark</SelectItem>
                                          <SelectItem value="github-light">GitHub Light</SelectItem>
                                          <SelectItem value="monokai">Monokai</SelectItem>
                                          <SelectItem value="dracula">Dracula</SelectItem>
                                          <SelectItem value="nord">Nord</SelectItem>
                                      </SelectContent>
                                   </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

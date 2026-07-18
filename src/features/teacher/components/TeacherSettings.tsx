"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveTeacherCredentialsAction } from "@/app/teacher-actions";
import { 
    Key, 
    Save, 
    Github, 
    RefreshCw, 
    CheckCircle2, 
    XCircle,
    Palette,
    Code,
    Sun,
    Moon,
    Monitor,
    Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ThemeInfo } from "@/components/theme/ThemeSelector";

interface TeacherSettingsProps {
    initialCredentials: {
        hasGithubToken: boolean;
        hasGeminiApiKey: boolean;
        aiProvider: string;
        aiModel: string;
        aiUrl?: string;
    };
    themes: ThemeInfo[];
}

export function TeacherSettings({ initialCredentials, themes }: TeacherSettingsProps) {
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [githubToken, setGithubToken] = useState("");
    const [aiProvider, setAiProvider] = useState(initialCredentials.aiProvider || "google");
    const [aiModel, setAiModel] = useState(initialCredentials.aiModel || "gemini-2.0-flash");
    const [isSaving, setIsSaving] = useState(false);

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // Auto-save function
    const autoSave = useCallback(async (updates: any) => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            
            // Credentials and AI (only if provided in updates)
            if (updates.aiProvider) formData.append("aiProvider", updates.aiProvider);
            else formData.append("aiProvider", aiProvider);

            if (updates.aiModel) formData.append("aiModel", updates.aiModel);
            else formData.append("aiModel", aiModel);

            if (updates.geminiApiKey) formData.append("geminiApiKey", updates.geminiApiKey);
            if (updates.githubToken) formData.append("githubToken", updates.githubToken);

            await saveTeacherCredentialsAction(formData);
        } catch (error: any) {
            toast.error("Error al auto-guardar", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    }, [aiProvider, aiModel]);



    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const { testAICredentialsAction } = await import("@/app/teacher-actions");
            const result = await testAICredentialsAction({
                provider: aiProvider,
                model: aiModel,
                apiKey: geminiApiKey || ""
            });

            if (result.success) {
                setTestResult({ success: true, message: result.message || "Conexión exitosa" });
                toast.success("¡Conexión exitosa!", { description: result.message });
            } else {
                setTestResult({ success: false, message: result.error || "No se pudo probar la conexión" });
                toast.error("Error de conexión", { description: result.error });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
            toast.error("Error", { description: error.message || "No se pudo probar la conexión." });
        } finally {
            setIsTesting(false);
        }
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold tracking-tight">Configuración Personal</h2>
                    <p className="text-muted-foreground">
                        Los cambios se guardan y aplican automáticamente
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
                    <Card className="rounded-2xl border border-border/40 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Key className="h-5 w-5 text-blue-500" />
                                IA / LLM Provider & Model API
                            </CardTitle>
                            <CardDescription>
                                Configuración de motor de calificación inteligente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="aiProvider" className="text-xs font-bold opacity-70 uppercase">Proveedor</Label>
                                    <select
                                        id="aiProvider"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-1 focus:ring-primary outline-none transition-all"
                                        value={aiProvider}
                                        onChange={(e) => {
                                            setAiProvider(e.target.value);
                                            autoSave({ aiProvider: e.target.value });
                                        }}
                                    >
                                        <option value="google">Google Gemini</option>
                                        <option value="minimax">MiniMax</option>
                                        <option value="ollama">Ollama (Local)</option>
                                        <option value="deepseek">DeepSeek</option>
                                        <option value="anthropic">Anthropic (Claude)</option>
                                        <option value="xai">xAI (Grok)</option>
                                        <option value="mistral">Mistral AI</option>
                                        <option value="openai">OpenAI</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aiModel" className="text-xs font-bold opacity-70 uppercase">Modelo</Label>
                                    <Input
                                        id="aiModel"
                                        type="text"
                                        placeholder="Ej: gemini-2.0-flash"
                                        value={aiModel}
                                        onChange={(e) => setAiModel(e.target.value)}
                                        onBlur={(e) => autoSave({ aiModel: e.target.value })}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="geminiApiKey" className="text-xs font-bold opacity-70 uppercase">API Key</Label>
                                <Input
                                    id="geminiApiKey"
                                    type="password"
                                    placeholder={initialCredentials.hasGeminiApiKey ? "•••••••••••••••• (Clave configurada)" : "Ingresa tu API Key"}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    onBlur={(e) => {
                                        if (e.target.value) autoSave({ geminiApiKey: e.target.value });
                                    }}
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="pt-2 border-t flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isTesting || isSaving}
                                    onClick={handleTestConnection}
                                    className="flex items-center gap-2 h-8 text-[10px] font-bold uppercase tracking-wider"
                                >
                                    <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin" : ""}`} />
                                    {isTesting ? "Probando..." : "Probar conexión"}
                                </Button>

                                {testResult && (
                                    <div className={`flex items-center gap-2 text-[10px] font-bold ${testResult.success ? "text-green-600" : "text-destructive"}`}>
                                        {testResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="rounded-2xl border border-border/40 overflow-hidden bg-card/25 backdrop-blur-md shadow-xl shadow-black/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Github className="h-5 w-5 text-foreground" />
                                GitHub Integration
                            </CardTitle>
                            <CardDescription>
                                Acceso a repositorios de estudiantes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="githubToken" className="text-xs font-bold opacity-70 uppercase">Personal Access Token</Label>
                                <Input
                                    id="githubToken"
                                    type="password"
                                    placeholder={initialCredentials.hasGithubToken ? "•••••••••••••••• (Token configurado)" : "Ingresa tu Token"}
                                    value={githubToken}
                                    onChange={(e) => setGithubToken(e.target.value)}
                                    onBlur={(e) => {
                                        if (e.target.value) autoSave({ githubToken: e.target.value });
                                    }}
                                    className="h-9 text-sm"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}

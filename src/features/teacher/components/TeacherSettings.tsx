"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveTeacherCredentialsAction } from "@/app/teacher-actions";
import { 
    Key, 
    Github, 
    RefreshCw, 
    CheckCircle2, 
    XCircle,
    Loader2,
    Bot,
    Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

    const autoSave = useCallback(async (updates: any) => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            
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
                    "flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-white shadow-2xl transition-all duration-500",
                    isSaving ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                )}>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Sincronizando...</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI / LLM Provider Settings Card */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Bot className="h-5 w-5" />
                            </div>
                            Proveedor & Modelo de IA
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Configura los motores de calificación automática y asistencia inteligente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="aiProvider" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proveedor</Label>
                                <select
                                    id="aiProvider"
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                                <Label htmlFor="aiModel" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modelo</Label>
                                <Input
                                    id="aiModel"
                                    type="text"
                                    placeholder="Ej: gemini-2.0-flash"
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    onBlur={(e) => autoSave({ aiModel: e.target.value })}
                                    className="h-10 text-sm rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="geminiApiKey" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">API Key del Proveedor</Label>
                            <Input
                                id="geminiApiKey"
                                type="password"
                                placeholder={initialCredentials.hasGeminiApiKey ? "•••••••••••••••• (Clave activa)" : "Ingresa tu API Key"}
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                onBlur={(e) => {
                                    if (e.target.value) autoSave({ geminiApiKey: e.target.value });
                                }}
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isTesting || isSaving}
                                onClick={handleTestConnection}
                                className="flex items-center gap-2 h-9 rounded-xl text-xs font-bold uppercase tracking-wider border-slate-200 dark:border-slate-800"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
                                {isTesting ? "Probando..." : "Probar conexión"}
                            </Button>

                            {testResult && (
                                <div className={`flex items-center gap-2 text-xs font-semibold ${testResult.success ? "text-primary" : "text-destructive"}`}>
                                    {testResult.success ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4" />}
                                    <span>{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* GitHub Integration Card */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Github className="h-5 w-5" />
                            </div>
                            Integración con GitHub
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Acceso a repositorios públicos y privados de entregas estudiantiles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="githubToken" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Access Token</Label>
                            <Input
                                id="githubToken"
                                type="password"
                                placeholder={initialCredentials.hasGithubToken ? "•••••••••••••••• (Token activo)" : "Ingresa tu Token de GitHub"}
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                onBlur={(e) => {
                                    if (e.target.value) autoSave({ githubToken: e.target.value });
                                }}
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

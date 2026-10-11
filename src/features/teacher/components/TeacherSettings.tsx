"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    Sparkles,
    Save
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
    const [aiUrl, setAiUrl] = useState(initialCredentials.aiUrl || "");
    const [useCustomUrl, setUseCustomUrl] = useState<boolean>(() => {
        return Boolean(initialCredentials.aiUrl && initialCredentials.aiUrl.trim().length > 0);
    });
    const [isSaving, setIsSaving] = useState(false);

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSaveAll = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append("aiProvider", aiProvider);
            formData.append("aiModel", aiModel);
            formData.append("aiUrl", useCustomUrl ? aiUrl.trim() : "");

            if (geminiApiKey) {
                formData.append("geminiApiKey", geminiApiKey);
            }
            if (githubToken) {
                formData.append("githubToken", githubToken);
            }

            await saveTeacherCredentialsAction(formData);
            toast.success("Cambios guardados correctamente", {
                description: "Las credenciales de IA y GitHub se han guardado con éxito.",
            });
        } catch (error: any) {
            toast.error("Error al guardar los cambios", {
                description: error.message || "Ocurrió un problema al guardar tus ajustes.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const { testAICredentialsAction } = await import("@/app/teacher-actions");
            const result = await testAICredentialsAction({
                provider: aiProvider,
                model: aiModel,
                apiKey: geminiApiKey || "",
                aiUrl: useCustomUrl ? aiUrl.trim() : ""
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
        <form onSubmit={handleSaveAll} className="space-y-6 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI / LLM Provider Settings Card */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm flex flex-col justify-between">
                    <div>
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
                                            const newProvider = e.target.value;
                                            setAiProvider(newProvider);
                                            if (newProvider === "nvidia") {
                                                if (!aiModel || aiModel.includes("gemini") || aiModel.includes("gpt")) {
                                                    setAiModel("nvidia/nemotron-3.5-lightning-30b-a3b");
                                                }
                                                if (!aiUrl) {
                                                    setAiUrl("https://integrate.api.nvidia.com/v1");
                                                }
                                            } else if (newProvider === "google") {
                                                if (!aiModel || aiModel.includes("nemotron") || aiModel.includes("gpt")) {
                                                    setAiModel("gemini-2.0-flash");
                                                }
                                            } else if (newProvider === "openai") {
                                                if (!aiModel || aiModel.includes("gemini") || aiModel.includes("nemotron")) {
                                                    setAiModel("gpt-4o-mini");
                                                }
                                            }
                                        }}
                                    >
                                        <option value="google">Google Gemini</option>
                                        <option value="nvidia">NVIDIA NIM (Nemotron, Llama, etc.)</option>
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic (Claude)</option>
                                        <option value="deepseek">DeepSeek</option>
                                        <option value="xai">xAI (Grok)</option>
                                        <option value="mistral">Mistral AI</option>
                                        <option value="minimax">MiniMax</option>
                                        <option value="ollama">Ollama (Local)</option>
                                        <option value="custom">Compatible OpenAI (URL personalizada)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="aiModel" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modelo</Label>
                                    <Input
                                        id="aiModel"
                                        type="text"
                                        placeholder={
                                            aiProvider === "nvidia" 
                                                ? "nvidia/nemotron-3.5-lightning-30b-a3b" 
                                                : aiProvider === "openai" 
                                                ? "gpt-4o-mini" 
                                                : "Ej: gemini-2.0-flash"
                                        }
                                        value={aiModel}
                                        onChange={(e) => setAiModel(e.target.value)}
                                        className="h-10 text-sm rounded-xl"
                                    />
                                </div>
                            </div>

                            {["nvidia", "custom", "ollama", "openai"].includes(aiProvider) && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center space-x-2.5">
                                        <Checkbox
                                            id="useCustomUrl"
                                            checked={useCustomUrl}
                                            onCheckedChange={(checked) => {
                                                const isChecked = Boolean(checked);
                                                setUseCustomUrl(isChecked);
                                                if (isChecked && !aiUrl) {
                                                    if (aiProvider === "nvidia") setAiUrl("https://integrate.api.nvidia.com/v1");
                                                    else if (aiProvider === "ollama") setAiUrl("http://localhost:11434/v1");
                                                    else if (aiProvider === "openai") setAiUrl("https://api.openai.com/v1");
                                                }
                                            }}
                                        />
                                        <Label htmlFor="useCustomUrl" className="text-xs font-semibold cursor-pointer select-none text-foreground">
                                            Personalizar URL Base del API (Base URL)
                                        </Label>
                                    </div>

                                    {useCustomUrl ? (
                                        <div className="space-y-1.5 pl-6 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="aiUrl" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    URL Base personalizada
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {aiProvider === "nvidia" ? "Por defecto: https://integrate.api.nvidia.com/v1" : "Opcional"}
                                                </span>
                                            </div>
                                            <Input
                                                id="aiUrl"
                                                type="text"
                                                placeholder={
                                                    aiProvider === "nvidia"
                                                        ? "https://integrate.api.nvidia.com/v1"
                                                        : aiProvider === "ollama"
                                                        ? "http://localhost:11434/v1"
                                                        : "https://api.openai.com/v1"
                                                }
                                                value={aiUrl}
                                                onChange={(e) => setAiUrl(e.target.value)}
                                                className="h-10 text-sm rounded-xl font-mono text-xs"
                                            />
                                        </div>
                                    ) : (
                                        <p className="pl-6 text-[11px] text-muted-foreground italic">
                                            {aiProvider === "nvidia" && "Usando por defecto la URL oficial de NVIDIA NIM: https://integrate.api.nvidia.com/v1"}
                                            {aiProvider === "ollama" && "Usando por defecto la URL local de Ollama: http://localhost:11434/v1"}
                                            {aiProvider === "openai" && "Usando por defecto la API oficial de OpenAI"}
                                            {aiProvider === "custom" && "Activa la casilla para ingresar tu URL base"}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="geminiApiKey" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {aiProvider === "nvidia" ? "API Key de NVIDIA (nvapi-...)" : "API Key del Proveedor"}
                                </Label>
                                <Input
                                    id="geminiApiKey"
                                    type="password"
                                    placeholder={
                                        initialCredentials.hasGeminiApiKey
                                            ? "•••••••••••••••• (Clave activa)"
                                            : aiProvider === "nvidia"
                                            ? "nvapi-..."
                                            : "Ingresa tu API Key"
                                    }
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
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
                    </div>
                </Card>

                {/* GitHub Integration Card */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-card shadow-sm flex flex-col justify-between">
                    <div>
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
                                    className="h-10 text-sm rounded-xl"
                                />
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>

            {/* Save Button Action Bar */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Guardando Cambios...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Guardar Cambios</span>
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}

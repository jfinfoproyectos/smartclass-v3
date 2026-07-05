"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfileAction, updateProfileAction } from "@/features/profile/actions/profileActions";
import { getGeminiApiKeyModeAction } from "@/features/admin/actions/settingsActions";;
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatName } from "@/lib/utils";


export function ProfileCompletionCheck() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [identificacion, setIdentificacion] = useState("");
    const [nombres, setNombres] = useState("");
    const [apellido, setApellido] = useState("");
    const [telefono, setTelefono] = useState("");
    const [geminiApiKey, setGeminiApiKey] = useState(""); // mantenemos para compatibilidad con profesores
    const [consent, setConsent] = useState(false);

    // Config State
    const [apiKeyMode, setApiKeyMode] = useState<"GLOBAL" | "USER">("GLOBAL");
    const [hasUserKey, setHasUserKey] = useState(false);
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [keyMissing, setKeyMissing] = useState(false);

    const { data: session, refetch } = authClient.useSession();
    // El rol del usuario actual
    const userRole = session?.user?.role;

    useEffect(() => {
        if (session?.user) {
            checkStatus();
        }
    }, [session]);

    const checkStatus = async () => {
        try {
            const [profile, modeData] = await Promise.all([
                getProfileAction(),
                getGeminiApiKeyModeAction()
            ]);

            let isProfileIncomplete = false;
            let isKeyMissing = false;
            let isComplete = true;

            // Check Profile
            if (!profile?.identificacion || !profile?.nombres || !profile?.apellido) {
                isProfileIncomplete = true;
                setNombres(profile?.nombres || session?.user?.name?.split(" ")[0] || "");
                setApellido(profile?.apellido || session?.user?.name?.split(" ").slice(1).join(" ") || "");
                setIdentificacion(profile?.identificacion || "");
                setTelefono(profile?.telefono || "");
                isComplete = false;
            } else {
                setIdentificacion(profile.identificacion);
                setNombres(profile.nombres);
                setApellido(profile.apellido);
                setTelefono(profile.telefono || "");
            }
            setConsent(!!profile?.dataProcessingConsent); // Load existing consent if any

            // Check API Key -- solo relevante para profesores, no para estudiantes
            if (modeData) {
                setApiKeyMode(modeData.mode);
                setHasUserKey(modeData.hasUserKey);
                // Los estudiantes ya no necesitan API Key de Gemini (la calificación la hace el profesor)
                if (modeData.mode === "USER" && !modeData.hasUserKey && session?.user?.role !== "student") {
                    isKeyMissing = true;
                    isComplete = false;
                }
            }

            // Check if consent is given
            if (!profile?.dataProcessingConsent) {
                isComplete = false;
            }

            if (isProfileIncomplete || !profile?.dataProcessingConsent) {
                setProfileIncomplete(isProfileIncomplete);
                setKeyMissing(isKeyMissing);
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }

        } catch (error) {
            console.error("Error checking profile status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (profileIncomplete && (!identificacion.trim() || !nombres.trim() || !apellido.trim())) {
            toast.error("Por favor completa todos los campos obligatorios del perfil.");
            return;
        }

        // if (keyMissing && !geminiApiKey.trim()) {
        //     toast.error("Por favor ingresa tu API Key de Gemini.");
        //     return;
        // }

        if (!consent) {
            toast.error("Debes aceptar la autorización de tratamiento de datos para continuar.");
            return;
        }

        setSaving(true);
        try {
            const capitalizedNombres = formatName(nombres)
            const capitalizedApellido = formatName(apellido)

            const formData = new FormData();
            formData.append("identificacion", identificacion);
            formData.append("nombres", capitalizedNombres);
            formData.append("apellido", capitalizedApellido);
            if (telefono) formData.append("telefono", telefono);
            if (geminiApiKey) formData.append("geminiApiKey", geminiApiKey);
            formData.append("dataProcessingConsent", "true"); // Always send true if allowing save

            await updateProfileAction(formData);

            // Update session name if changed
            const fullName = `${capitalizedNombres} ${capitalizedApellido}`.trim();
            if (session?.user?.name !== fullName) {
                await authClient.updateUser({ name: fullName });
            }

            await refetch?.();
            toast.success("Información actualizada correctamente");

            // Re-check status instead of just closing to ensure everything is really persisted
            await checkStatus();

        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Error al guardar la información");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[85vh] overflow-y-auto [&>button]:hidden text-left" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Información Requerida</DialogTitle>
                    <DialogDescription>
                        Para continuar usando la plataforma, necesitamos que completes la siguiente información.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Atención</AlertTitle>
                        <AlertDescription>
                            Estos datos son obligatorios para el correcto funcionamiento del sistema y la gestión académica.
                        </AlertDescription>
                    </Alert>

                    {profileIncomplete && (
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Datos Personales</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombres">Nombres *</Label>
                                    <Input id="nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Tus nombres" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="apellido">Apellido *</Label>
                                    <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Tu apellido" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="identificacion">Identificación (Cédula/DNI) *</Label>
                                    <Input id="identificacion" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} placeholder="Número de documento" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono</Label>
                                    <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Número de contacto" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección de API Key --- solo para profesores/admin */}
                    {keyMissing && userRole !== "student" && (
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Configuración de IA</h3>
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="geminiApiKey" className="text-primary font-bold">IA / LLM API Key</Label>
                                    <Badge variant="outline" className="text-[10px] border-muted-foreground text-muted-foreground">Opcional</Badge>
                                </div>
                                <Input
                                    id="geminiApiKey"
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="Tu API Key de Google, OpenAI o MiniMax..."
                                    type="password"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Puedes agregar tu API Key ahora o más tarde en la configuración.
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-1 underline text-primary">
                                        Obtener Key
                                    </a>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-start space-x-2 pt-4 border-t">
                    <Checkbox
                        id="consent"
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="consent"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Autorización de Tratamiento de Datos
                        </label>
                        <p className="text-sm text-muted-foreground text-justify">
                            De conformidad con la <strong>Ley 1581 de 2012</strong> y el Decreto 1377 de 2013, autorizo de manera voluntaria, previa, explícita, informada e inequívoca el tratamiento de mis datos personales para fines académicos y administrativos dentro de la plataforma.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={saving || !consent}>
                        {saving ? "Guardando..." : "Guardar y Continuar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

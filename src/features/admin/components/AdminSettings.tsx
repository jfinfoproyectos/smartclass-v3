"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThemeInfo } from "@/components/theme/ThemeSelector";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AdminSettingsProps {
    initialSettings: {
        institutionName?: string | null;
        institutionLogo?: string | null;
        institutionHeroImage?: string | null;
        footerText?: string | null;
    };
    themes: ThemeInfo[];
}

export function AdminSettings({ initialSettings, themes }: AdminSettingsProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-6 max-w-4xl">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
                    <p className="text-muted-foreground">
                        Branding y Ajustes Generales
                    </p>
                </div>
            </div>

            <div className="space-y-6">
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
        </div>
    );
}

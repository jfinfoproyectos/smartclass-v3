"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, Clipboard, ExternalLink, RefreshCw, X } from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";
import LZString from "lz-string";
import { toast } from "sonner";
import { shortenUrl } from "../actions";
import { Loader2 } from "lucide-react";

export function QuickShare() {
    const [content, setContent] = useState("");
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [isShortening, setIsShortening] = useState(false);

    const handleGenerate = () => {
        if (!content.trim()) return;

        try {
            // Compress using LZ-String to base64-like URI component
            const compressed = LZString.compressToEncodedURIComponent(content);
            const url = `${window.location.origin}/share?d=${compressed}`;

            // Check approximate URL length warning (browsers differ, 2000 is safe safe, 8000 usually ok)
            if (url.length > 8000) {
                toast.warning("El contenido es demasiado largo para un enlace QR seguro. Intenta reducirlo.");
                return;
            }

            setGeneratedUrl(url);
            setIsShortening(false); // Reset shortening state
        } catch (e) {
            console.error("Failed to encode", e);
            toast.error("Error al generar el enlace.");
        }
    };

    const handleShorten = async () => {
        if (!generatedUrl) return;

        setIsShortening(true);
        try {
            const short = await shortenUrl(generatedUrl);
            if (short) {
                setGeneratedUrl(short);
                toast.success("Enlace acortado exitosamente");
            } else {
                toast.error("No se pudo acortar el enlace. Intenta más tarde.");
            }
        } catch (error) {
            toast.error("Error de conexión al acortar.");
        } finally {
            setIsShortening(false);
        }
    };


    const handleClear = () => {
        setContent("");
        setGeneratedUrl(null);
    };

    const copyToClipboard = () => {
        if (generatedUrl) {
            navigator.clipboard.writeText(generatedUrl);
            toast.success("Enlace copiado al portapapeles");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
            {/* Input Panel */}
            <div className="flex flex-col gap-4 h-full">
                <Card className="flex-1 flex flex-col bg-muted/10 border-2 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-primary" />
                            Generar Contenido
                        </CardTitle>
                        <CardDescription>
                            Escribe o pega texto, enlaces o instrucciones.
                            Se generará un QR sin guardar nada en base de datos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4 p-4 min-h-0">
                        <textarea
                            placeholder="Escribe aquí... Ej: 'Lean el capítulo 4 para el lunes' o pega un enlace de YouTube."
                            className="flex h-full w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-lg font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 custom-scrollbar overflow-auto whitespace-pre"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={10000}
                        />
                        <div className="text-right text-xs text-muted-foreground">
                            {content.length}/10000 caracteres
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleGenerate}
                                className="flex-1"
                                disabled={!content.trim()}
                            >
                                Generar QR y Enlace
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleClear}
                                title="Limpiar"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Output Panel */}
            <div className="flex flex-col gap-4">
                <Card className="flex-1 flex flex-col items-center justify-center border-2 bg-white/50 dark:bg-black/20">
                    {generatedUrl ? (
                        <div className="flex flex-col items-center gap-8 p-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="p-4 bg-white rounded-lg shadow-lg">
                                {generatedUrl && generatedUrl.length < 2200 ? (
                                    <QRCode
                                        value={generatedUrl}
                                        size={256}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                ) : (
                                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-yellow-50 text-yellow-600 rounded-lg p-6 border-2 border-yellow-100 border-dashed">
                                        <QrCode className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-sm font-semibold text-center mb-2">
                                            Contenido Extenso
                                        </p>
                                        <p className="text-xs text-center mb-4 text-muted-foreground">
                                            El texto es demasiado largo para generar un código QR legible ({content.length} caracteres), pero el enlace funciona perfectamente.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 w-full max-w-md pt-4 border-t">
                                <Label className="text-muted-foreground">Enlace para compartir (Proyectar o Copiar):</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedUrl}
                                        readOnly
                                        className="font-mono text-lg h-12 bg-muted/50 text-ellipsis"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <Button size="icon" className="h-12 w-12 shrink-0" onClick={copyToClipboard} title="Copiar">
                                        <Clipboard className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 w-auto px-4 shrink-0 gap-2"
                                        onClick={handleShorten}
                                        disabled={isShortening || generatedUrl.includes("tinyurl.com")}
                                        title="Acortar enlace (TinyURL)"
                                    >
                                        {isShortening ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acortar"}
                                    </Button>
                                    <Button size="icon" variant="outline" className="h-12 w-12 shrink-0" asChild title="Abrir">
                                        <Link href={generatedUrl} target="_blank">
                                            <ExternalLink className="w-5 h-5" />
                                        </Link>
                                    </Button>
                                </div>
                                <p className="text-sm text-center text-muted-foreground">
                                    El enlace expira si cierras esta pestaña (a menos que lo acortes).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-8">
                            <QrCode className="w-24 h-24 mx-auto mb-4 opacity-10" />
                            <p className="text-lg font-medium">Esperando contenido...</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clipboard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import LZString from "lz-string";

function ShareContent() {
    const searchParams = useSearchParams();
    const data = searchParams.get('d');
    const [decodedContent, setDecodedContent] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (data) {
            try {
                // Try decompressing with LZ-String first
                let decoded = LZString.decompressFromEncodedURIComponent(data);

                // Fallback for backward compatibility (if any simple encoding exists) or failure
                if (!decoded) {
                    try {
                        decoded = decodeURIComponent(escape(atob(data)));
                    } catch {
                        // If both fail, it's invalid
                        throw new Error("Invalid content");
                    }
                }

                setDecodedContent(decoded);
            } catch (e) {
                console.error("Decoding error", e);
                setError(true);
            }
        }
    }, [data]);

    const copyToClipboard = () => {
        if (decodedContent) {
            navigator.clipboard.writeText(decodedContent);
            toast.success("Contenido copiado al portapapeles");
        }
    };

    const isUrl = (text: string) => {
        try {
            new URL(text);
            return true;
        } catch {
            return false;
        }
    };

    if (error) {
        return (
            <Card className="w-full max-w-2xl mx-auto mt-10 border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Error al cargar contenido
                    </CardTitle>
                    <CardDescription>
                        El enlace parece estar roto o contiene datos inválidos.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!decodedContent) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <p className="text-muted-foreground animate-pulse">Cargando contenido...</p>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-3xl mx-auto mt-10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-center text-xl">Contenido Compartido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-muted p-6 rounded-lg min-h-[100px] max-h-[60vh] overflow-auto custom-scrollbar whitespace-pre font-sans text-lg">
                    {decodedContent}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={copyToClipboard} size="lg" className="gap-2">
                        <Clipboard className="w-5 h-5" />
                        Copiar Texto
                    </Button>

                    {isUrl(decodedContent) && (
                        <Button variant="outline" size="lg" asChild>
                            <Link href={decodedContent} target="_blank">
                                Abrir Enlace
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function SharePage() {
    return (
        <div className="container py-10">
            <Suspense fallback={
                <div className="flex justify-center items-center min-h-[50vh]">
                    <p className="text-muted-foreground animate-pulse">Cargando...</p>
                </div>
            }>
                <ShareContent />
            </Suspense>
        </div>
    );
}

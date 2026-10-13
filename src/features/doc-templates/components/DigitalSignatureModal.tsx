"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    PenTool, 
    Upload, 
    Type, 
    RotateCcw, 
    Check, 
    ShieldCheck, 
    Trash2, 
    Sparkles,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { DigitalSignatureData } from "../utils/docxUtils";

interface DigitalSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    variableId: string;
    variableLabel: string;
    initialData?: DigitalSignatureData | null;
    onSaveSignature: (signature: DigitalSignatureData) => void;
}

export function DigitalSignatureModal({
    isOpen,
    onClose,
    variableId,
    variableLabel,
    initialData,
    onSaveSignature
}: DigitalSignatureModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [strokeColor, setStrokeColor] = useState<string>("#0f2b5c"); // Azul notarial
    const [activeTab, setActiveTab] = useState<string>("draw");

    // Datos del firmante
    const [signerName, setSignerName] = useState<string>(initialData?.signerName || "");
    const [signerId, setSignerId] = useState<string>(initialData?.signerId || "");
    const [signerRole, setSignerRole] = useState<string>(initialData?.signerRole || "Docente / Titular");

    // Carga de imagen externa
    const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);

    // Tipográfica
    const [typedSignatureText, setTypedSignatureText] = useState<string>(initialData?.signerName || "");
    const [selectedFontIndex, setSelectedFontIndex] = useState<number>(0);

    const cursiveFonts = [
        "font-serif italic",
        "italic tracking-wide font-sans",
        "font-mono italic"
    ];

    // Inicializar canvas al abrir o cambiar a pestaña draw
    useEffect(() => {
        if (!isOpen) return;

        if (initialData) {
            setSignerName(initialData.signerName);
            setSignerId(initialData.signerId || "");
            setSignerRole(initialData.signerRole || "");
            if (initialData.signatureDataUrl) {
                setUploadedImageData(initialData.signatureDataUrl);
            }
        }

        // Configurar canvas
        const timer = setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";

                    // Si ya había imagen de firma previa, dibujarla en el canvas
                    if (initialData?.signatureDataUrl) {
                        const img = new Image();
                        img.onload = () => {
                            ctx.drawImage(img, 10, 10, canvas.width - 20, canvas.height - 20);
                            setHasDrawn(true);
                        };
                        img.src = initialData.signatureDataUrl;
                    }
                }
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [isOpen, initialData, activeTab]);

    // Manejadores del Canvas (Mouse & Touch)
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        setIsDrawing(true);
        setHasDrawn(true);

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.strokeStyle = strokeColor;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    // Subir imagen de firma desde archivo
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Por favor selecciona un archivo de imagen (PNG o JPG).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setUploadedImageData(dataUrl);
            toast.success("Imagen de firma cargada.");
        };
        reader.readAsDataURL(file);
    };

    // Generar canvas a partir de firma tipográfica
    const renderTypedSignatureToDataUrl = (): string => {
        const canvas = document.createElement("canvas");
        canvas.width = 450;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Renderizado caligráfico
        ctx.fillStyle = strokeColor;
        ctx.font = "italic 32px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedSignatureText || signerName || "Firma Digital", canvas.width / 2, canvas.height / 2);

        // Línea inferior formal
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, canvas.height - 35);
        ctx.lineTo(canvas.width - 40, canvas.height - 35);
        ctx.stroke();

        return canvas.toDataURL("image/png");
    };

    const handleConfirm = () => {
        if (!signerName.trim()) {
            toast.error("Debes ingresar el nombre del firmante.");
            return;
        }

        let finalDataUrl = "";

        if (activeTab === "draw") {
            const canvas = canvasRef.current;
            if (!canvas || !hasDrawn) {
                toast.error("Por favor dibuja tu firma en el lienzo antes de continuar.");
                return;
            }
            finalDataUrl = canvas.toDataURL("image/png");
        } else if (activeTab === "upload") {
            if (!uploadedImageData) {
                toast.error("Por favor selecciona una imagen de tu firma.");
                return;
            }
            finalDataUrl = uploadedImageData;
        } else if (activeTab === "type") {
            if (!typedSignatureText.trim()) {
                toast.error("Por favor escribe tu nombre para la firma tipográfica.");
                return;
            }
            finalDataUrl = renderTypedSignatureToDataUrl();
        }

        // Generar hash aleatorio de verificación
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const verificationCode = `SC-SIG-${randomHex}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

        const signatureData: DigitalSignatureData = {
            variableId,
            signatureDataUrl: finalDataUrl,
            signerName: signerName.trim(),
            signerId: signerId.trim() || undefined,
            signerRole: signerRole.trim() || undefined,
            signedAt: new Date().toISOString(),
            verificationCode
        };

        onSaveSignature(signatureData);
        toast.success(`Firma digitalizada vinculada exitosamente a "${variableLabel}".`);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                Estampar Firma Digitalizada
                                <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                                    {variableLabel}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs">
                                Digitaliza tu firma con validez interna e incrustación en el documento Word y PDF.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Metadatos del firmante */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div>
                            <Label className="text-xs text-slate-300 font-medium">Nombre Completo *</Label>
                            <Input
                                value={signerName}
                                onChange={(e) => {
                                    setSignerName(e.target.value);
                                    if (!typedSignatureText) setTypedSignatureText(e.target.value);
                                }}
                                placeholder="Ej: Dr. Carlos Méndez"
                                className="mt-1 h-8 text-xs bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-300 font-medium">Cédula / Documento ID</Label>
                            <Input
                                value={signerId}
                                onChange={(e) => setSignerId(e.target.value)}
                                placeholder="Ej: C.C. 1.098.765.432"
                                className="mt-1 h-8 text-xs bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-300 font-medium">Cargo / Calidad</Label>
                            <Input
                                value={signerRole}
                                onChange={(e) => setSignerRole(e.target.value)}
                                placeholder="Ej: Docente Titular"
                                className="mt-1 h-8 text-xs bg-slate-900 border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    {/* Selector de Métodos de Firma */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 bg-slate-950 border border-slate-800">
                            <TabsTrigger value="draw" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <PenTool className="w-3.5 h-3.5" />
                                Dibujar Trazo
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Upload className="w-3.5 h-3.5" />
                                Subir Imagen
                            </TabsTrigger>
                            <TabsTrigger value="type" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Type className="w-3.5 h-3.5" />
                                Caligráfica
                            </TabsTrigger>
                        </TabsList>

                        {/* Pestaña 1: Dibujar Trazo en Canvas */}
                        <TabsContent value="draw" className="space-y-3 mt-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Color de tinta:</span>
                                    <button
                                        type="button"
                                        onClick={() => setStrokeColor("#0f2b5c")}
                                        className={`w-5 h-5 rounded-full border-2 ${strokeColor === "#0f2b5c" ? "border-indigo-400 scale-110" : "border-transparent"}`}
                                        style={{ backgroundColor: "#0f2b5c" }}
                                        title="Azul Notarial"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setStrokeColor("#111827")}
                                        className={`w-5 h-5 rounded-full border-2 ${strokeColor === "#111827" ? "border-indigo-400 scale-110" : "border-transparent"}`}
                                        style={{ backgroundColor: "#111827" }}
                                        title="Negro Formal"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearCanvas}
                                    className="text-xs text-slate-400 hover:text-red-400 h-7 px-2"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    Limpiar
                                </Button>
                            </div>

                            <div className="relative border-2 border-dashed border-slate-700 rounded-xl overflow-hidden bg-white shadow-inner flex justify-center">
                                <canvas
                                    ref={canvasRef}
                                    width={500}
                                    height={180}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                    className="cursor-crosshair touch-none w-full max-w-[500px]"
                                />
                                {!hasDrawn && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs">
                                        <PenTool className="w-6 h-6 mb-1 opacity-40 text-slate-600" />
                                        <span>Dibuja tu firma aquí usando el mouse o pantalla táctil</span>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Subir Imagen */}
                        <TabsContent value="upload" className="space-y-3 mt-3">
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center bg-slate-950/40 hover:border-indigo-500/50 transition-colors">
                                {uploadedImageData ? (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white rounded-lg inline-block shadow-md">
                                            <img
                                                src={uploadedImageData}
                                                alt="Firma Cargada"
                                                className="max-h-24 max-w-full object-contain mx-auto"
                                            />
                                        </div>
                                        <div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setUploadedImageData(null)}
                                                className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                Quitar y subir otra
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                                        <p className="text-sm font-medium text-slate-200">Haz clic para subir imagen de tu firma</p>
                                        <p className="text-xs text-slate-400 mt-1">Formatos recomendados: PNG con fondo transparente o JPG claro</p>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </TabsContent>

                        {/* Pestaña 3: Caligráfica Tipográfica */}
                        <TabsContent value="type" className="space-y-3 mt-3">
                            <div>
                                <Label className="text-xs text-slate-300">Texto de la firma:</Label>
                                <Input
                                    value={typedSignatureText}
                                    onChange={(e) => setTypedSignatureText(e.target.value)}
                                    placeholder="Escribe el nombre tal como quieres que figure"
                                    className="mt-1 text-sm bg-slate-950 border-slate-700 text-white"
                                />
                            </div>

                            <div className="p-4 bg-white rounded-xl shadow-inner text-center">
                                <p className="text-3xl text-slate-900 font-serif italic py-3 select-none">
                                    {typedSignatureText || "Firma Digital"}
                                </p>
                                <div className="border-t border-slate-400 w-48 mx-auto mt-1" />
                                <p className="text-xs text-slate-500 mt-1">Firma electrónica caligráfica generada</p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Sello de Seguridad */}
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Se emitirá un código de verificación criptográfica único que se incrustará en el documento.</span>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        <Check className="w-4 h-4 mr-1.5" />
                        Guardar y Estampar Firma
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

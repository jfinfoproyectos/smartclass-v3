"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles } from "lucide-react"
import { generateActivityDescriptionAction, generateActivityStatementAction } from "@/app/activity-ai-actions"

interface AIGenerateDialogProps {
    isOpen: boolean
    onClose: () => void
    onUseContent: (content: string) => void
    type: "description" | "statement"
    activityType: string
}

export function AIGenerateDialog({
    isOpen,
    onClose,
    onUseContent,
    type,
    activityType
}: AIGenerateDialogProps) {
    const [prompt, setPrompt] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsGenerating(true)
        setError(null)

        try {
            const result = type === "description"
                ? await generateActivityDescriptionAction(prompt, activityType)
                : await generateActivityStatementAction(prompt, activityType)

            if (result.error) {
                setError(result.error)
                setIsGenerating(false)
            } else if (result.content) {
                // Insert content immediately and close
                onUseContent(result.content)
                handleClose()
            }
        } catch (err: any) {
            setError(err.message || "Error al generar contenido")
            setIsGenerating(false)
        }
    }

    const handleClose = () => {
        setPrompt("")
        setError(null)
        setIsGenerating(false)
        onClose()
    }

    const title = type === "description" ? "Generar Instrucciones con IA" : "Generar Enunciado con IA"
    const placeholder = type === "description"
        ? "Ejemplo: Actividad sobre variables y tipos de datos en Python para principiantes"
        : "Ejemplo: Proyecto final de desarrollo web con React, debe incluir autenticación, CRUD de productos y diseño responsive"

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        Describe qué debe contener {type === "description" ? "las instrucciones" : "el enunciado"} y la IA lo generará automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="ai-prompt">¿Qué debe generar la IA?</Label>
                        <Textarea
                            id="ai-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={placeholder}
                            className="min-h-[120px] max-h-[300px] overflow-y-auto"
                            disabled={isGenerating}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey && !isGenerating && prompt.trim()) {
                                    handleGenerate()
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Presiona Ctrl+Enter para generar rápidamente
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generar e Insertar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

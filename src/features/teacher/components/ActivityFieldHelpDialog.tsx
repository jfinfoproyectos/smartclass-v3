"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ActivityFieldHelpDialogProps {
    type: "instructions" | "statement"
}

export function ActivityFieldHelpDialog({ type }: ActivityFieldHelpDialogProps) {
    const isInstructions = type === "instructions"

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                    <HelpCircle className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">Ayuda</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>
                        {isInstructions ? "Instrucciones (Informativas)" : "Enunciado / Rúbrica de Evaluación"}
                    </DialogTitle>
                    <DialogDescription>
                        {isInstructions
                            ? "Información general para ayudar al estudiante"
                            : "Criterios de evaluación y rúbrica"}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[calc(85vh-8rem)] pr-4">
                    {isInstructions ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Las instrucciones son información general para ayudar al estudiante a entender el contexto de la actividad.
                            </p>

                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                                    ✅ ¿Qué incluir?
                                </h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                                    <li><strong>Objetivos de aprendizaje:</strong> Qué aprenderán los estudiantes</li>
                                    <li><strong>Contexto:</strong> Por qué es importante esta actividad</li>
                                    <li><strong>Recursos de apoyo:</strong> Enlaces, documentación, tutoriales</li>
                                    <li><strong>Consejos generales:</strong> Tips para completar la actividad</li>
                                    <li><strong>Información de entrega:</strong> Formato esperado</li>
                                </ul>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">
                                    ❌ NO incluir aquí:
                                </h4>
                                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                                    <li>Criterios de evaluación específicos</li>
                                    <li>Rúbricas de calificación</li>
                                    <li>Puntos a evaluar</li>
                                </ul>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                    Estos van en el <strong>Enunciado/Rúbrica</strong>
                                </p>
                            </div>

                            <div className="border rounded-lg p-3 bg-muted/50">
                                <h4 className="font-medium text-sm mb-2">💡 Ejemplo:</h4>
                                <div className="text-xs font-mono bg-background p-3 rounded border">
                                    <pre className="whitespace-pre-wrap">{`# Objetivos
- Comprender variables en Python
- Practicar tipos de datos básicos

# Recursos
- [Documentación Python](https://docs.python.org)
- Tutorial en video: enlace

# Consejos
- Prueba tu código antes de entregar
- Usa nombres descriptivos para variables`}</pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                El enunciado define QUÉ se debe entregar y CÓMO se evaluará. Es fundamental para la calificación automática.
                            </p>

                            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">
                                    ✅ ¿Qué incluir?
                                </h4>
                                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1.5 list-disc list-inside">
                                    <li><strong>Descripción clara:</strong> Qué debe entregar el estudiante</li>
                                    <li><strong>Requisitos específicos:</strong> Lista detallada de lo que debe incluir</li>
                                    <li><strong>Rúbrica de evaluación:</strong> Criterios con porcentajes</li>
                                    <li><strong>Especificaciones técnicas:</strong> Tecnologías, formatos, etc.</li>
                                    <li><strong>Ejemplos:</strong> De buenas entregas (opcional)</li>
                                </ul>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">
                                    📊 Ejemplo de Rúbrica
                                </h4>
                                <div className="text-xs font-mono bg-white dark:bg-purple-900/20 p-3 rounded mt-2 overflow-x-auto">
                                    <pre>{`| Criterio | Descripción | Porcentaje |
|----------|-------------|------------|
| Funcionalidad | Código ejecuta correctamente | 40% |
| Código Limpio | Buenas prácticas | 30% |
| Documentación | Comentarios y README | 20% |
| Creatividad | Solución innovadora | 10% |`}</pre>
                                </div>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                                <h4 className="font-medium text-indigo-900 dark:text-indigo-300 mb-2">
                                    🤖 Evaluación Automática con IA
                                </h4>
                                <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
                                    <p><strong>La IA usa este enunciado para:</strong></p>
                                    <ul className="space-y-1 list-disc list-inside ml-2 text-xs">
                                        <li>Analizar el código del estudiante</li>
                                        <li>Evaluar según los criterios definidos aquí</li>
                                        <li>Generar calificación (0.0 - 5.0)</li>
                                        <li>Crear retroalimentación detallada</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
                                    ⚠️ Importante para IA
                                </h4>
                                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1.5 list-disc list-inside">
                                    <li><strong>Sé específico:</strong> Cuanto más detallada la rúbrica, mejor la evaluación</li>
                                    <li><strong>Define criterios medibles:</strong> Usa porcentajes claros</li>
                                    <li><strong>Incluye ejemplos:</strong> De qué es correcto e incorrecto</li>
                                </ul>
                            </div>

                            <div className="border rounded-lg p-3 bg-muted/50">
                                <h4 className="font-medium text-sm mb-2">💡 Ejemplo Completo:</h4>
                                <div className="text-xs font-mono bg-background p-3 rounded border max-h-64 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap">{`# Enunciado
Crear una calculadora en Python con operaciones básicas.

## Requisitos
1. Función sumar(a, b)
2. Función restar(a, b)
3. Función multiplicar(a, b)
4. Función dividir(a, b) con manejo de división por cero
5. Menú interactivo

## Rúbrica
| Criterio | Descripción | % |
|----------|-------------|---|
| Funcionalidad | Todas las operaciones funcionan | 40% |
| Manejo de errores | División por cero controlada | 30% |
| Código limpio | PEP 8, nombres descriptivos | 20% |
| Documentación | Docstrings y comentarios | 10% |

## Formato de Entrega
- Archivo: calculadora.py
- README.md con instrucciones`}</pre>
                                </div>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useAnimation, PanInfo, useMotionValue, useTransform, animate, useMotionValueEvent } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Users, ChevronDown, Check, X, Pencil, Volume2, VolumeX, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { cn, formatName } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Student {
    id: string;
    name: string;
    image: string | null;
    profile?: {
        nombres?: string;
        apellido?: string;
        identificacion?: string;
    } | null;
}

interface HistoryItem {
    student: Student;
    timestamp: string;
    grade?: number;
}

interface RouletteProps {
    students: { user: Student }[];
    courseId: string;
}

// Pastel colors for better readability
const SEGMENT_COLORS = [
    "#FFB3BA", // Pink
    "#BAFFC9", // Green
    "#BAE1FF", // Blue
    "#FFFFBA", // Yellow
    "#FFDFBA", // Orange
    "#E0BBE4", // Purple
    "#957DAD", // Violet
    "#D291BC", // Magenta
    "#FEC8D8", // Rose
    "#FF9AA2", // Salmon
];

export function Roulette({ students: initialStudents, courseId }: RouletteProps) {
    const [candidates, setCandidates] = useState<Student[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selected, setSelected] = useState<Student | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winnerModalOpen, setWinnerModalOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [grade, setGrade] = useState<string>("");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    // Animation controls
    const controls = useAnimation();
    const rotation = useMotionValue(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastTickRef = useRef(0);

    // Initialize Audio Context
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioContextRef.current?.close();
        }
    }, []);

    const playTickSound = () => {
        if (!audioContextRef.current || !soundEnabled) return;
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);

        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.03);
    };

    const playWinSound = () => {
        if (!audioContextRef.current || !soundEnabled) return;
        const ctx = audioContextRef.current;

        // Simple celebratory arpeggio
        [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.5);
        });
    };

    const startEditing = (item: HistoryItem) => {
        setEditingId(item.student.id);
        setEditValue(item.grade?.toString() || "");
    };

    const saveGrade = (studentId: string) => {
        const newGrade = parseFloat(editValue);
        if (isNaN(newGrade) || newGrade < 0 || newGrade > 5) return;

        setHistory(prev => prev.map(item => {
            if (item.student.id === studentId) {
                return { ...item, grade: newGrade };
            }
            return item;
        }));
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    // Track rotation for ticks
    useMotionValueEvent(rotation, "change", (latest) => {
        if (candidates.length === 0) return;
        const segmentAngle = 360 / candidates.length;
        const tickIndex = Math.floor(latest / segmentAngle);
        if (tickIndex !== lastTickRef.current) {
            playTickSound();
            lastTickRef.current = tickIndex;
        }
    });

    // Initialize/Load state
    useEffect(() => {
        const stored = localStorage.getItem(`roulette-storage-${courseId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed.candidates)) setCandidates(parsed.candidates);

                if (Array.isArray(parsed.history)) {
                    // Migration check: Handle old format (Student[]) vs new format (HistoryItem[])
                    const validHistory: HistoryItem[] = parsed.history.map((item: any) => {
                        // Check if it's the new format
                        if (item && typeof item === 'object' && 'student' in item) {
                            return item as HistoryItem;
                        }
                        // Assume old format (Student) and migrate
                        if (item && typeof item === 'object' && 'id' in item) {
                            return {
                                student: item as Student,
                                timestamp: new Date().toISOString()
                            };
                        }
                        return null;
                    }).filter((item: HistoryItem | null): item is HistoryItem => item !== null);

                    setHistory(validHistory);
                }
            } catch (e) {
                console.error("Failed to load roulette state", e);
                const flatStudents = initialStudents.map(s => s.user);
                setCandidates(flatStudents);
            }
        } else {
            const flatStudents = initialStudents.map(s => s.user);
            setCandidates(flatStudents);
        }
        setIsLoaded(true);
        rotation.set(0);
        lastTickRef.current = 0;
    }, [initialStudents, courseId, rotation]);

    // Save state
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(`roulette-storage-${courseId}`, JSON.stringify({
            candidates,
            history
        }));
    }, [candidates, history, courseId, isLoaded]);

    const getFullName = (student: Student) => {
        return formatName(student.name, student.profile);
    };

    const handleSpin = async () => {
        if (candidates.length === 0 || isSpinning) return;

        setIsSpinning(true);
        setSelected(null);
        setGrade("");

        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const winnerIndex = Math.floor(Math.random() * candidates.length);
        const winner = candidates[winnerIndex];

        const segmentAngle = 360 / candidates.length;
        const offset = segmentAngle / 2;
        const spins = 5 + Math.floor(Math.random() * 5);

        const currentRot = rotation.get();
        const targetMod = 360 - (winnerIndex * segmentAngle) - offset;
        const currentMod = currentRot % 360;
        let delta = targetMod - currentMod;
        if (delta < 0) delta += 360;

        const finalRotation = currentRot + (360 * spins) + delta;

        await animate(rotation, finalRotation, {
            duration: 5,
            ease: [0.2, 0.8, 0.2, 1],
        });

        playWinSound();

        setTimeout(() => {
            setSelected(winner);
            setWinnerModalOpen(true);
            setIsSpinning(false);

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
        }, 500);
    };

    const handleWinnerConfirmed = () => {
        if (!selected) return;

        const newHistoryItem: HistoryItem = {
            student: selected,
            timestamp: new Date().toISOString(),
            grade: grade ? parseFloat(grade) : undefined
        };

        setHistory(prev => [newHistoryItem, ...prev]);
        setCandidates(prev => prev.filter(c => c.id !== selected.id));

        setSelected(null);
        setWinnerModalOpen(false);
        setGrade("");

        rotation.set(0);
        lastTickRef.current = 0;
    };

    const handleReset = () => {
        const flatStudents = initialStudents.map(s => s.user);
        setCandidates(flatStudents);
        setHistory([]);
        setSelected(null);
        setWinnerModalOpen(false);
        rotation.set(0);
        lastTickRef.current = 0;
        localStorage.removeItem(`roulette-storage-${courseId}`);
    };

    const handleExport = () => {
        if (history.length === 0) return;

        const data = history.map(item => ({
            Nombre: getFullName(item.student),
            Fecha: new Date(item.timestamp).toLocaleDateString(),
            Hora: new Date(item.timestamp).toLocaleTimeString(),
            Nota: item.grade !== undefined ? item.grade : "N/A"
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Resultados");
        XLSX.writeFile(wb, `Roulette_Results_${courseId}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
            {/* Main Stage */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden border-2 shadow-lg bg-linear-to-b from-background to-muted/20">
                    <div className="absolute top-4 left-4 z-10">
                        <Badge variant="outline" className="text-sm px-3 py-1 bg-background/50 backdrop-blur">
                            <Users className="w-3 h-3 mr-2" />
                            Disponibles: {candidates.length}
                        </Badge>
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-full bg-background/50 backdrop-blur"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            title={soundEnabled ? "Silenciar" : "Activar sonido"}
                        >
                            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-full bg-background/50 backdrop-blur"
                            onClick={handleReset}
                            disabled={isSpinning || (candidates.length === initialStudents.length)}
                            title="Reiniciar Ruleta"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 text-foreground drop-shadow-md">
                            <ChevronDown className="w-12 h-12 fill-current stroke-[4px]" />
                        </div>

                        <motion.div
                            className="w-[90%] h-[90%] rounded-full shadow-2xl border-4 border-muted relative"
                            style={{
                                rotate: rotation,
                                originX: 0.5,
                                originY: 0.5
                            }}
                        >
                            {candidates.length > 0 ? (
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {candidates.map((student, i) => {
                                        const total = candidates.length;
                                        const angle = 360 / total;
                                        const startAngle = i * angle;
                                        const endAngle = (i + 1) * angle;

                                        const startRad = (startAngle * Math.PI) / 180;
                                        const endRad = (endAngle * Math.PI) / 180;

                                        const x1 = 50 + 50 * Math.cos(startRad);
                                        const y1 = 50 + 50 * Math.sin(startRad);
                                        const x2 = 50 + 50 * Math.cos(endRad);
                                        const y2 = 50 + 50 * Math.sin(endRad);

                                        const largeArc = angle > 180 ? 1 : 0;
                                        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                                        return (
                                            <g key={student.id}>
                                                <path
                                                    d={pathData}
                                                    fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                                                    stroke="white"
                                                    strokeWidth="0.5"
                                                />
                                                <text
                                                    x="50"
                                                    y="50"
                                                    fill="black"
                                                    fontSize={Math.max(2, 6 - (total * 0.1))}
                                                    fontWeight="bold"
                                                    textAnchor="end"
                                                    alignmentBaseline="middle"
                                                    transform={`rotate(${startAngle + angle / 2}, 50, 50) translate(46, 0)`}
                                                >
                                                    {formatName(student.name, student.profile).split(' ')[0]}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                            ) : (
                                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    Sin participantes
                                </div>
                            )}
                        </motion.div>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <Button
                                onClick={handleSpin}
                                disabled={isSpinning || candidates.length === 0}
                                className={cn(
                                    "w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-xl border-4 border-muted flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-primary text-primary-foreground p-0",
                                    isSpinning && "opacity-80 cursor-not-allowed"
                                )}
                            >
                                <span className={cn("text-[10px] sm:text-xs font-bold uppercase", isSpinning && "animate-pulse")}>
                                    {isSpinning ? "..." : "Girar"}
                                </span>
                            </Button>
                        </div>
                    </div>



                    {/* Controls - Moved to top right */}
                </Card>
            </div >

            <div className="flex flex-col gap-4">
                <Card className="flex-1 flex flex-col max-h-[calc(100vh-200px)]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Seleccionados
                        </CardTitle>
                        <div className="flex items-center justify-between">
                            <CardDescription>
                                Historial de ganadores
                            </CardDescription>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-2"
                                onClick={handleExport}
                                disabled={history.length === 0}
                                title="Exportar a Excel"
                            >
                                <Download className="w-4 h-4" />
                                <span className="sr-only sm:not-sr-only sm:inline-block">Exportar</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <p>Aún no hay seleccionados</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item, i) => (
                                    <div
                                        key={item.timestamp + i}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border animate-in slide-in-from-right-5 fade-in duration-300"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background text-xs font-bold text-muted-foreground border">
                                            {history.length - i}
                                        </div>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={item.student?.image || undefined} />
                                            <AvatarFallback>{formatName(item.student?.name || "", item.student?.profile)[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                            <p className="font-medium text-sm bg-transparent">
                                                {item.student ? getFullName(item.student) : "Estudiante desconocido"}
                                            </p>

                                            {editingId === item.student.id ? (
                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="5"
                                                        step="0.1"
                                                        className="w-12 h-7 text-sm text-center border rounded bg-background"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveGrade(item.student.id);
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                    />
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => saveGrade(item.student.id)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={cancelEdit}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {item.grade !== undefined && (
                                                        <Badge
                                                            variant={item.grade >= 3 ? "default" : "destructive"}
                                                            className="text-[10px] h-5 px-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => startEditing(item)}
                                                            title="Clic para editar nota"
                                                        >
                                                            {item.grade.toFixed(1)}
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                        onClick={() => startEditing(item)}
                                                        title="Editar nota"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={winnerModalOpen} onOpenChange={(open) => {
                if (!open) handleWinnerConfirmed();
            }}>
                <DialogContent className="sm:max-w-md text-center border-none shadow-none bg-transparent">
                    <div className="bg-background rounded-xl border-4 border-primary shadow-2xl p-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />

                        <DialogHeader>
                            <DialogTitle className="text-3xl font-extrabold text-primary mb-2">¡TENEMOS UN GANADOR!</DialogTitle>
                        </DialogHeader>

                        {selected && (
                            <div className="flex flex-col items-center gap-6 py-6 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                                    <Avatar className="w-32 h-32 border-4 border-background shadow-xl relative z-10">
                                        <AvatarImage src={selected.image || undefined} className="object-cover" />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                            {formatName(selected.name, selected.profile)[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg z-20">
                                        <Trophy className="w-6 h-6 fill-yellow-900" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold">{getFullName(selected)}</h2>
                                </div>

                                <div className="w-full max-w-xs space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Asignar Calificación (Opcional)</label>
                                    <div className="flex gap-2 justify-center">
                                        {[1, 2, 3, 4, 5].map((g) => (
                                            <Button
                                                key={g}
                                                variant={grade === g.toString() ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setGrade(g.toString())}
                                                className="w-10 h-10 rounded-full font-bold"
                                            >
                                                {g}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 justify-center mt-2">
                                        <span className="text-xs text-muted-foreground mr-2">O manual:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="5"
                                            step="0.1"
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                            className="w-20 p-2 text-center rounded-md border text-sm"
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="justify-center sm:justify-center">
                            <Button
                                size="lg"
                                onClick={handleWinnerConfirmed}
                                className="w-full sm:w-auto text-lg font-semibold"
                            >
                                Confirmar y Continuar
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}

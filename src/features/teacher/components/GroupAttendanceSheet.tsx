"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCourseAttendanceReportAction } from "@/features/teacher/actions/reportActions";
import { toast } from "sonner";
import { 
    Loader2, 
    Users,
    Search,
    Award,
    AlertTriangle,
    Info,
    Calendar as CalendarIcon,
    BrainCircuit
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceStatistics } from "./AttendanceStatistics";
import { StudentAttendanceDashboard } from "./StudentAttendanceDashboard";
import { BarChart3, Download, TrendingDown } from "lucide-react";
import * as XLSX from 'xlsx';
import { GroupAttendanceAnalytics } from "./GroupAttendanceAnalytics";

interface GroupAttendanceSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    courseTitle: string;
}

export function GroupAttendanceSheet({
    isOpen,
    onOpenChange,
    courseId,
    courseTitle
}: GroupAttendanceSheetProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getCourseAttendanceReportAction(courseId);
            setData(result || []);
        } catch (error) {
            console.error("Error loading group attendance report:", error);
            toast.error("Error al cargar el resumen de asistencia");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, courseId]);

    const dateColumns = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => 
            key !== 'ID' && key !== 'Estudiante' && key !== 'Correo'
        ).sort();
    }, [data]);

    const filteredData = useMemo(() => {
        let result = data;
        
        // Apply search
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter(row => 
                row.Estudiante?.toLowerCase().includes(lowSearch) || 
                row.ID?.toLowerCase().includes(lowSearch)
            );
        }

        // Apply Drill-down chart filter
        if (activeFilter) {
            result = result.filter(row => {
                return dateColumns.some(date => row[date]?.status === activeFilter);
            });
        }

        return result;
    }, [data, searchTerm, activeFilter, dateColumns]);

    const handleExportExcel = () => {
        try {
            const statusMap: Record<string, string> = {
                'PRESENT': '', 'P': '',
                'ABSENT': 'FALTA',  'A': 'FALTA',
                'LATE':   'TARDE',  'L': 'TARDE',
                'LEAVE_EARLY': 'RETIRO', 'R': 'RETIRO',
                'EXCUSED': '', 'E': '',
            };

            // Only include date columns that have at least one F or T across all students
            const relevantDateColumns = dateColumns.filter(date =>
                data.some(row => {
                    const cell = row[date];
                    if (!cell || cell === '-' || !cell.status) return false;
                    const mapped = statusMap[cell.status] ?? cell.status;
                    return mapped === 'FALTA' || mapped === 'TARDE' || mapped === 'RETIRO';
                })
            );

            const exportData = data.map(row => {
                const base: any = {
                    'ID': row.ID,
                    'Estudiante': row.Estudiante,
                };

                relevantDateColumns.forEach(date => {
                    const cell = row[date];
                    if (cell === '-' || !cell || !cell.status) {
                        base[date] = '';
                    } else {
                        base[date] = statusMap[cell.status] ?? cell.status;
                    }
                });

                return base;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
            XLSX.writeFile(wb, `Asistencia_${courseTitle}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success("Excel generado correctamente");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error al exportar a Excel");
        }
    };

    const getDesertionRisk = (row: any) => {
        if (dateColumns.length === 0) return 0;
        let absences = 0;
        let total = 0;
        dateColumns.forEach(date => {
            if (row[date]?.status !== '-') {
                total++;
                if (row[date]?.status === 'A') absences++;
            }
        });
        return total > 0 ? (absences / total) * 100 : 0;
    };

    const renderCellContent = (cellData: any) => {
        if (cellData === '-') return <span className="text-muted-foreground">-</span>;
        
        const { status, justification, arrivalTime, departureTime, remarks } = cellData;

        const markers = [];

        // Attendance Marker
        if (status && status !== '-') {
            let badge = null;
            let tooltipContent = null;

             switch (status) {
                case 'P':
                    badge = (
                        <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-green-200 dark:shadow-none ring-2 ring-white dark:ring-slate-900">
                            P
                        </div>
                    );
                    tooltipContent = "Presente";
                    break;
                case 'A':
                    badge = (
                        <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-red-200 dark:shadow-none ring-2 ring-white dark:ring-slate-900">
                            A
                        </div>
                    );
                    tooltipContent = "Inasistencia";
                    break;
                case 'L':
                    badge = (
                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-orange-200 dark:shadow-none ring-2 ring-white dark:ring-slate-900">
                            T
                        </div>
                    );
                    tooltipContent = (
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-orange-500">Llegada Tarde</span>
                            {arrivalTime && (
                                <span className="text-xs">
                                    Hora: {format(new Date(arrivalTime), "h:mm a", { locale: es })}
                                </span>
                            )}
                        </div>
                    );
                    break;
                case 'E':
                    badge = (
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-blue-200 dark:shadow-none ring-2 ring-white dark:ring-slate-900">
                            E
                        </div>
                    );
                    tooltipContent = (
                        <div className="flex flex-col gap-1 max-w-[200px]">
                            <span className="font-bold text-blue-500">Excusado</span>
                            {justification && (
                                <span className="text-xs italic whitespace-normal">
                                    "{justification}"
                                </span>
                            )}
                        </div>
                    );
                    break;
                case 'R':
                    badge = (
                        <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-[10px] shadow-sm shadow-indigo-200 dark:shadow-none ring-2 ring-white dark:ring-slate-900">
                            R
                        </div>
                    );
                    tooltipContent = (
                        <div className="flex flex-col gap-1 max-w-[200px]">
                            <span className="font-bold text-indigo-500">Retiro Temprano</span>
                            {departureTime && (
                                <span className="text-xs">
                                    Hora: {format(new Date(departureTime), "h:mm a", { locale: es })}
                                </span>
                            )}
                            {justification && (
                                <span className="text-xs italic whitespace-normal">
                                    "{justification}"
                                </span>
                            )}
                        </div>
                    );
                    break;
            }

            if (badge) {
                markers.push(
                    <Tooltip key="attendance">
                        <TooltipTrigger asChild>
                            <div className="cursor-help">{badge}</div>
                        </TooltipTrigger>
                        <TooltipContent>{tooltipContent}</TooltipContent>
                    </Tooltip>
                );
            }
        }

        // Remarks Markers
        if (remarks && Array.isArray(remarks)) {
            remarks.forEach((remark, idx) => {
                const isAttention = remark.type === 'ATTENTION';
                const Icon = isAttention ? AlertTriangle : Award;
                const bgColor = isAttention ? 'bg-amber-100' : 'bg-purple-100';
                const textColor = isAttention ? 'text-amber-700' : 'text-purple-700';
                const borderColor = isAttention ? 'border-amber-200' : 'border-purple-200';

                markers.push(
                    <Tooltip key={`remark-${idx}`}>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "cursor-help w-6 h-6 rounded-md border flex items-center justify-center transition-colors",
                                bgColor, textColor, borderColor
                            )}>
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex flex-col gap-1 max-w-[200px]">
                                <span className="font-bold">{isAttention ? "Llamado de Atención" : "Felicitación"}</span>
                                <span className="text-xs font-semibold">{remark.title}</span>
                                {remark.description && (
                                    <span className="text-[10px] italic whitespace-normal text-muted-foreground">
                                        {remark.description}
                                    </span>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            });
        }

        return (
            <div className="flex items-center justify-center gap-1 min-h-[24px]">
                {markers.length > 0 ? markers : <span className="text-muted-foreground text-[10px]">-</span>}
            </div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[100dvh] sm:h-[100dvh] p-0 flex flex-col gap-0 max-w-full">
                <Tabs defaultValue="matrix" className="flex-1 flex flex-col overflow-hidden">
                    <SheetHeader className="p-6 border-b shrink-0">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <SheetTitle className="text-2xl flex items-center gap-2">
                                    <Users className="h-6 w-6 text-primary" />
                                    Resumen de Asistencia y Observaciones - {courseTitle}
                                </SheetTitle>
                                <SheetDescription>
                                    Vista general de asistencia, llamados de atención y felicitaciones.
                                </SheetDescription>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <TabsList className="bg-muted/50 h-10 p-1">
                                    <TabsTrigger 
                                        value="matrix" 
                                        className="px-4 h-8"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Matriz
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="stats"
                                        className="px-4 h-8"
                                    >
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Estadísticas
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="analytics"
                                        className="px-4 h-8"
                                    >
                                        <BrainCircuit className="h-4 w-4 mr-2" />
                                        Análisis Grupal
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-10 gap-2 text-xs" 
                                        onClick={handleExportExcel}
                                        disabled={loading || data.length === 0}
                                    >
                                        <Download className="h-4 w-4" />
                                        Excel
                                    </Button>

                                    {(searchTerm || activeFilter) && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-10 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setActiveFilter(null);
                                            }}
                                        >
                                            Limpiar Filtros
                                        </Button>
                                    )}

                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar estudiante..."
                                            className="pl-9 h-10"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={loadData} disabled={loading} title="Recargar">
                                        <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-hidden">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="text-muted-foreground animate-pulse">Cargando reporte consolidado...</p>
                                </div>
                            ) : (
                                <TooltipProvider>
                                    <TabsContent value="matrix" className="h-full mt-0 flex flex-col overflow-hidden">
                                        <div className="flex-1 overflow-auto relative">
                                            <Table className="border-separate border-spacing-0">
                                                <TableHeader className="sticky top-0 bg-background z-30 shadow-sm border-b">
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="w-[240px] min-w-[240px] sticky left-0 top-0 bg-background z-50 border-r border-b-2 border-b-primary/20 p-4 opacity-100 backdrop-blur-none">
                                                            <div className="flex items-center gap-2 text-primary">
                                                                <Users className="h-4 w-4" />
                                                                <span className="font-bold tracking-tight">Estudiantes</span>
                                                            </div>
                                                        </TableHead>
                                                        {dateColumns.map(date => (
                                                            <TableHead 
                                                                key={date} 
                                                                className={cn(
                                                                    "min-w-[110px] text-center px-2 bg-background border-b-2 transition-all duration-200",
                                                                    hoveredColumn === date ? "border-b-primary bg-primary/[0.03]" : "border-b-primary/10"
                                                                )}
                                                                onMouseEnter={() => setHoveredColumn(date)}
                                                                onMouseLeave={() => setHoveredColumn(null)}
                                                            >
                                                                <div className="flex flex-col items-center py-2">
                                                                    <span className={cn(
                                                                        "text-[10px] uppercase font-black transition-colors",
                                                                        hoveredColumn === date ? "text-primary" : "text-muted-foreground"
                                                                    )}>
                                                                        {new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'short' })}
                                                                    </span>
                                                                    <span className={cn(
                                                                        "text-sm font-bold tracking-tight transition-all",
                                                                        hoveredColumn === date ? "text-primary scale-110" : "text-foreground"
                                                                    )}>
                                                                        {new Date(date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </TableHead>
                                                        ))}
                                                        {dateColumns.length === 0 && (
                                                            <TableHead className="text-center italic text-muted-foreground bg-secondary border-b">No hay registros</TableHead>
                                                        )}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredData.length > 0 ? (
                                                        filteredData.map((row, idx) => {
                                                            const risk = getDesertionRisk(row);
                                                            const isAtRisk = risk > 15;
                                                            
                                                            return (
                                                                <TableRow 
                                                                    key={row.ID || idx} 
                                                                    className={cn(
                                                                        "h-14 transition-colors group/row", 
                                                                        isAtRisk ? "bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/50" : "hover:bg-primary/[0.02]"
                                                                    )}
                                                                >
                                                                    <TableCell 
                                                                        className={cn(
                                                                            "font-medium sticky left-0 bg-background z-20 border-r border-b whitespace-nowrap overflow-hidden text-ellipsis transition-all px-4 cursor-pointer group-hover/row:text-primary",
                                                                            "opacity-100 backdrop-blur-none",
                                                                            isAtRisk ? "bg-red-50 dark:bg-red-950/40" : "bg-background shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]",
                                                                            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-primary/0 group-hover/row:after:bg-primary/50"
                                                                        )}
                                                                        onClick={() => setSelectedStudent(row)}
                                                                    >
                                                                        <div className="flex flex-col leading-tight relative">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-bold tracking-tight">{row.Estudiante}</span>
                                                                                {isAtRisk && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <TrendingDown className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent className="bg-red-600 text-white font-bold border-none">
                                                                                            Riesgo: {risk.toFixed(1)}% inasistencias
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[10px] text-muted-foreground/70 font-mono tracking-tighter">{row.ID}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    {dateColumns.map(date => (
                                                                        <TableCell 
                                                                            key={date} 
                                                                            className={cn(
                                                                                "text-center p-0 border-b border-r border-r-slate-50 dark:border-r-slate-800/50 transition-colors",
                                                                                hoveredColumn === date && "bg-primary/[0.015]"
                                                                            )}
                                                                            onMouseEnter={() => setHoveredColumn(date)}
                                                                            onMouseLeave={() => setHoveredColumn(null)}
                                                                        >
                                                                            <div className="w-full h-full py-2">
                                                                                {renderCellContent(row[date])}
                                                                            </div>
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            );
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={dateColumns.length + 1} className="h-24 text-center">
                                                                No se encontraron estudiantes.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="stats" className="h-full mt-0 p-6 overflow-y-auto">
                                        <AttendanceStatistics 
                                            data={data} 
                                            dateColumns={dateColumns} 
                                            onFilter={(val) => {
                                                if (['P', 'A', 'L', 'E', 'R'].includes(val)) {
                                                    setActiveFilter(val);
                                                    setSearchTerm("");
                                                    const label = val === 'P' ? 'Presente' : val === 'A' ? 'Inasistencia' : val === 'L' ? 'Tarde' : val === 'E' ? 'Excusado' : 'Retiro';
                                                    toast.info(`Filtrando por estado: ${label}`);
                                                } else {
                                                    setSearchTerm(val);
                                                    setActiveFilter(null);
                                                    toast.info(`Filtrando por estudiante: ${val}`);
                                                }
                                            }}
                                        />
                                    </TabsContent>
                                    <TabsContent value="analytics" className="h-full mt-0 p-6 overflow-y-auto">
                                        <GroupAttendanceAnalytics data={data} dateColumns={dateColumns} />
                                    </TabsContent>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                </Tabs>

                <StudentAttendanceDashboard 
                    isOpen={!!selectedStudent}
                    onOpenChange={(open) => !open && setSelectedStudent(null)}
                    studentData={selectedStudent}
                    dateColumns={dateColumns}
                />

                <div className="p-4 border-t bg-muted/30 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center font-black text-[9px]">P</div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Presente</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-[9px]">A</div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inasistencia</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-[9px]">T</div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tarde</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-[9px]">E</div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Excusado</span>
                            </div>
                            <div className="w-px h-5 bg-border hidden sm:block mx-2" />
                            <div className="flex items-center gap-3 group">
                                <div className="bg-amber-100 text-amber-600 border border-amber-200 rounded-md w-6 h-6 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atención</span>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="bg-purple-100 text-purple-600 border border-purple-200 rounded-md w-6 h-6 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <Award className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Felicitación</span>
                            </div>
                        </div>
                        
                        <div className="text-[10px] font-medium text-muted-foreground uppercase bg-background/50 px-2 py-1 rounded border">
                            {filteredData.length} Ests / {dateColumns.length} Fechas
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

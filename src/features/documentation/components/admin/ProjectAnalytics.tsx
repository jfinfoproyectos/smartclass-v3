"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  Eye, 
  TrendingUp, 
  ShieldCheck,
  BrainCircuit,
  Activity,
  BookOpenText,
  Unlink,
  Search,
  ChevronRight,
  Settings2,
  ArrowRight,
  ExternalLink,
  History,
  RefreshCcw,
  Trash2,
  Palette,
  Code,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { 
  getProjectAnalyticsAction, 
  getStudentProgressAction,
  updateCourseDocSettingsAction,
  getStudentViewLogsAction,
  clearStudentHistoryAction,
  getProjectChartDataAction
} from "../../actions/progressActions";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);
import { 
  linkProjectToCourseAction 
} from "../../actions/adminDocsActions";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseDocManagerProps {
  courseId: string;
  docProjectId: string | null;
  availableProjects: { id: string, name: string }[];
}

export function ProjectAnalytics({ courseId, docProjectId, availableProjects }: CourseDocManagerProps) {
  const [projectId, setProjectId] = useState<string | null>(docProjectId);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const colors = {
    primary: "rgb(59, 130, 246)",
    secondary: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    text: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
    grid: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    tooltipBg: isDark ? "#1f2937" : "#fff",
    tooltipText: isDark ? "#fff" : "#000",
    areaGradient: "rgba(59, 130, 246, 0.1)"
  };

  const [settings, setSettings] = useState({
    trackingEnabled: true,
    aiTutorEnabled: false,
    aiQuestionsLimit: 5,
    themeMode: "STUDENT",
    codeTheme: "one-dark-pro",
    allowCodeThemeChange: true,
    themeColor: "zinc",
    allowThemeColorChange: true
  });

  useEffect(() => {
    if (projectId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  async function loadData() {
    if (!projectId) return;
    setLoading(true);
    try {
      const [stats, progress, charts] = await Promise.all([
        getProjectAnalyticsAction(projectId, courseId),
        getStudentProgressAction(projectId, courseId),
        getProjectChartDataAction(projectId, courseId)
      ]);
      setAnalytics(stats);
      setStudentProgress(progress);
      setChartData(charts);
      if (stats.settings) {
        setSettings({
          ...stats.settings,
          themeColor: stats.settings.themeColor || "zinc"
        });
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [viewLogs, setViewLogs] = useState<any[]>([]);

  const handleShowDetails = async (student: any) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const logs = await getStudentViewLogsAction(student.userId, projectId!);
      setViewLogs(logs);
    } catch (error) {
      toast.error("Error al cargar historial");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedStudent || !projectId) return;
    if (!confirm(`¿Estás seguro de borrar el historial de ${selectedStudent.name}?`)) return;
    
    setLoadingDetails(true);
    try {
      await clearStudentHistoryAction(selectedStudent.userId, projectId);
      toast.success("Historial borrado");
      setViewLogs([]);
      loadData();
    } catch (error) {
      toast.error("Error al borrar historial");
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    setUpdatingSettings(true);
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await updateCourseDocSettingsAction(courseId, updated);
      toast.success("Configuración actualizada");
    } catch (error) {
      toast.error("Error al actualizar");
      setSettings(settings);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleLink = async (id: string) => {
    setLoading(true);
    try {
      await linkProjectToCourseAction(courseId, id);
      setProjectId(id);
      toast.success("Documentación vinculada");
    } catch (error) {
      toast.error("Error al vincular");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await linkProjectToCourseAction(courseId, null);
      setProjectId(null);
      setAnalytics(null);
      setStudentProgress([]);
      toast.success("Documentación desvinculada");
    } catch (error) {
      toast.error("Error al desvincular");
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Vincular Documentación</h2>
          <p className="text-sm text-muted-foreground">Selecciona un proyecto de documentación para este curso</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {availableProjects.map((p) => (
            <Card key={p.id} className="hover:border-primary transition-all cursor-pointer group" onClick={() => handleLink(p.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <BookOpenText className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all" />
              </CardContent>
            </Card>
          ))}
          {availableProjects.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed rounded-xl opacity-40">
               <p className="text-sm font-medium">No hay proyectos disponibles</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && !analytics) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4">
      <RefreshCcw className="w-8 h-8 animate-spin text-primary opacity-40" />
      <p className="text-sm font-bold animate-pulse text-muted-foreground">Cargando...</p>
    </div>
  );

  const filteredStudents = studentProgress.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Course Header Consistency */}
      <Card className="border-none shadow-none bg-accent/30">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                    <BookOpenText className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{analytics?.projectName}</h2>
                    <p className="text-sm text-muted-foreground font-medium">Gestión y Analíticas de Documentación</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {analytics?.projectSlug && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={`/docs/${analytics.projectSlug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" /> Abrir Sitio
                        </a>
                    </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                    <a href={`/dashboard/teacher/docs/${projectId}`} target="_blank">
                        <Settings2 className="w-4 h-4 mr-2" /> Editar
                    </a>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Unlink className="w-4 h-4 mr-2" /> Desvincular
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Desvincular Documentación?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Los estudiantes ya no podrán ver el contenido de este proyecto en este curso.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUnlink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Config Section */}
          <div className="lg:col-span-4 space-y-6">
              <Card>
                  <CardHeader className="pb-3 border-b bg-accent/20">
                      <div className="flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm font-bold">CONFIGURACIÓN GENERAL</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-bold">Seguimiento</Label>
                              <p className="text-xs text-muted-foreground">Registrar visitas y tiempo</p>
                          </div>
                          <Switch 
                            checked={settings.trackingEnabled} 
                            onCheckedChange={(val) => updateSettings({ trackingEnabled: val })}
                            disabled={updatingSettings}
                          />
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                          <div className="space-y-0.5">
                              <Label className="text-sm font-bold">Asistente IA</Label>
                              <p className="text-xs text-muted-foreground">Tutor contextual activo</p>
                          </div>
                          <Switch 
                            checked={settings.aiTutorEnabled} 
                            onCheckedChange={(val) => updateSettings({ aiTutorEnabled: val })}
                            disabled={updatingSettings}
                          />
                      </div>
                      <div className="pt-4 border-t space-y-3">
                          <Label className="text-sm font-bold">Límite de Consultas</Label>
                          <div className="flex items-center gap-3">
                              <Input 
                                type="number" 
                                value={settings.aiQuestionsLimit} 
                                onChange={(e) => setSettings({...settings, aiQuestionsLimit: parseInt(e.target.value)})}
                                onBlur={() => updateSettings({ aiQuestionsLimit: settings.aiQuestionsLimit })}
                                className="w-20 h-9 font-bold text-center"
                              />
                              <span className="text-xs text-muted-foreground font-medium">Consultas por hora</span>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {/* Advanced UI Settings */}
              <Card>
                  <CardHeader className="pb-3 border-b bg-accent/20">
                      <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm font-bold">APARIENCIA Y ESTILO</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                      {/* Theme Mode Selection */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <Label className="text-sm font-bold">Modo de Interfaz</Label>
                              <div className="flex items-center gap-1 p-1 bg-accent/50 rounded-lg border">
                                  <Badge variant={settings.themeMode === "LIGHT" ? "default" : "outline"} className="cursor-pointer px-2" onClick={() => updateSettings({ themeMode: "LIGHT" })}><Sun className="w-3 h-3" /></Badge>
                                  <Badge variant={settings.themeMode === "DARK" ? "default" : "outline"} className="cursor-pointer px-2" onClick={() => updateSettings({ themeMode: "DARK" })}><Moon className="w-3 h-3" /></Badge>
                                  <Badge variant={settings.themeMode === "STUDENT" ? "default" : "outline"} className="cursor-pointer px-2" onClick={() => updateSettings({ themeMode: "STUDENT" })}><Monitor className="w-3 h-3" /></Badge>
                              </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                              {settings.themeMode === "STUDENT" ? "El estudiante puede elegir claro u oscuro." : `Forzado a modo ${settings.themeMode === "LIGHT" ? "claro" : "oscuro"}.`}
                          </p>
                      </div>

                      {/* Theme Color Selection */}
                      <div className="pt-4 border-t space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Paleta Cromática</Label>
                                <p className="text-[10px] text-muted-foreground font-medium">Color principal de la interfaz</p>
                             </div>
                             <Select 
                                value={settings.themeColor || "zinc"} 
                                onValueChange={(val) => updateSettings({ themeColor: val })}
                                disabled={updatingSettings}
                             >
                                <SelectTrigger className="w-36 h-8 text-[10px] font-bold">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="zinc">Zinc (Default)</SelectItem>
                                    <SelectItem value="slate">Slate</SelectItem>
                                    <SelectItem value="stone">Stone</SelectItem>
                                    <SelectItem value="gray">Gray</SelectItem>
                                    <SelectItem value="neutral">Neutral</SelectItem>
                                    <SelectItem value="red">Red</SelectItem>
                                    <SelectItem value="rose">Rose</SelectItem>
                                    <SelectItem value="orange">Orange</SelectItem>
                                    <SelectItem value="blue">Blue</SelectItem>
                                    <SelectItem value="yellow">Yellow</SelectItem>
                                    <SelectItem value="violet">Violet</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="flex items-center justify-between">
                             <Label className="text-xs font-bold opacity-70">Permitir que el estudiante cambie el color</Label>
                             <Switch 
                                checked={settings.allowThemeColorChange} 
                                onCheckedChange={(val) => updateSettings({ allowThemeColorChange: val })}
                                disabled={updatingSettings}
                                className="scale-75"
                             />
                          </div>
                      </div>

                      {/* Code Style Selection */}
                      <div className="pt-4 border-t space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Estilo de Código</Label>
                                <p className="text-[10px] text-muted-foreground font-medium">Tema para bloques de código</p>
                             </div>
                             <Select 
                                value={settings.codeTheme} 
                                onValueChange={(val) => updateSettings({ codeTheme: val })}
                                disabled={updatingSettings}
                             >
                                <SelectTrigger className="w-36 h-8 text-[10px] font-bold">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="one-dark-pro">One Dark Pro</SelectItem>
                                    <SelectItem value="github-dark">GitHub Dark</SelectItem>
                                    <SelectItem value="github-light">GitHub Light</SelectItem>
                                    <SelectItem value="monokai">Monokai</SelectItem>
                                    <SelectItem value="dracula">Dracula</SelectItem>
                                    <SelectItem value="nord">Nord</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="flex items-center justify-between">
                             <Label className="text-xs font-bold opacity-70">Permitir que el estudiante cambie el estilo</Label>
                             <Switch 
                                checked={settings.allowCodeThemeChange} 
                                onCheckedChange={(val) => updateSettings({ allowCodeThemeChange: val })}
                                disabled={updatingSettings}
                                className="scale-75"
                             />
                          </div>
                      </div>

                      {/* Preview Bar (Visual mimic from attachment) */}
                      <div className="pt-4">
                          <div className="flex items-center justify-center min-h-[48px] py-3 px-6 bg-accent/30 rounded-full border border-dashed opacity-80 scale-90 mx-auto w-fit">
                              {(settings.allowThemeColorChange || settings.allowCodeThemeChange) && (
                                <div className="flex items-center gap-4">
                                  {settings.allowThemeColorChange && (
                                    <div className="p-1.5 rounded-full text-primary">
                                      <Palette className="w-4 h-4" />
                                    </div>
                                  )}
                                  {settings.allowCodeThemeChange && (
                                    <div className="p-1.5 rounded-full text-primary">
                                      <Code className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                              )}

                              {(settings.allowThemeColorChange || settings.allowCodeThemeChange) && settings.themeMode === "STUDENT" && (
                                <div className="w-[1px] h-4 bg-border mx-4" />
                              )}

                              {settings.themeMode === "STUDENT" && (
                                <div className="p-1.5 rounded-full text-primary">
                                  <Sun className="w-4 h-4" />
                                </div>
                              )}

                              {!settings.allowThemeColorChange && !settings.allowCodeThemeChange && settings.themeMode !== "STUDENT" && (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4">
                                  Controles Ocultos para Estudiantes
                                </span>
                              )}
                          </div>
                          <p className="text-[9px] text-center text-muted-foreground font-medium mt-2">
                             Previsualización de barra de controles para el estudiante
                          </p>
                      </div>
                  </CardContent>
              </Card>

              {/* Stats Grid Mini */}
              <div className="grid grid-cols-1 gap-4">
                  <StatCard label="Visitas" value={analytics?.totalViews || 0} icon={<Activity />} color="blue" />
                  <StatCard label="Estudiantes" value={analytics?.activeStudentsCount || 0} icon={<Users />} color="purple" />
                  <StatCard label="Promedio" value={formatTime(analytics?.avgTimeSpent || 0)} icon={<Clock />} color="orange" />
              </div>
          </div>

          {/* Main Analytics Content */}
          <div className="lg:col-span-8 space-y-6">
              {chartData && (
                  <div className="space-y-6">
                      {/* Trend Chart - Full Width */}
                      <Card>
                          <CardHeader className="pb-3 border-b bg-accent/20">
                              <CardTitle className="text-xs font-bold flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-primary" />
                                  TENDENCIA DIARIA DE VISITAS
                              </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 h-[250px]">
                              <Line 
                                data={{
                                  labels: chartData.dailyChartData.map((d: any) => {
                                    const date = new Date(d.date);
                                    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
                                  }),
                                  datasets: [{
                                    label: 'Visitas',
                                    data: chartData.dailyChartData.map((d: any) => d.visitas),
                                    fill: true,
                                    borderColor: colors.primary,
                                    backgroundColor: colors.areaGradient,
                                    tension: 0.4,
                                    borderWidth: 3,
                                    pointRadius: 4,
                                    pointBackgroundColor: colors.primary,
                                  }]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: { legend: { display: false } },
                                  scales: {
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                                    y: { border: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, precision: 0 } }
                                  }
                                } as any}
                              />
                          </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Visits Bar Chart */}
                        <Card>
                            <CardHeader className="pb-3 border-b bg-accent/20">
                                <CardTitle className="text-xs font-bold flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    VISITAS POR ESTUDIANTE
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 h-[250px]">
                                <Bar 
                                  data={{
                                    labels: chartData.studentStats.map((s: any) => s.name.split(' ')[0]),
                                    datasets: [{
                                      label: 'Visitas',
                                      data: chartData.studentStats.map((s: any) => s.visitas),
                                      backgroundColor: colors.primary,
                                      borderRadius: 4,
                                    }]
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                      x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
                                      y: { border: { display: false }, ticks: { font: { size: 9 }, precision: 0 } }
                                    }
                                  } as any}
                                />
                            </CardContent>
                        </Card>

                        {/* Time Bar Chart */}
                        <Card>
                            <CardHeader className="pb-3 border-b bg-accent/20">
                                <CardTitle className="text-xs font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    TIEMPO DE ESTUDIO (MIN)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 h-[250px]">
                                <Bar 
                                  data={{
                                    labels: chartData.studentStats.map((s: any) => s.name.split(' ')[0]),
                                    datasets: [{
                                      label: 'Minutos',
                                      data: chartData.studentStats.map((s: any) => s.tiempo),
                                      backgroundColor: "#8b5cf6",
                                      borderRadius: 4,
                                    }]
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                      x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
                                      y: { border: { display: false }, ticks: { font: { size: 9 } } }
                                    }
                                  } as any}
                                />
                            </CardContent>
                        </Card>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Table Section */}
      <Card>
          <CardHeader className="pb-3 border-b bg-accent/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  SEGUIMIENTO DETALLADO
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar estudiante..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                />
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Estudiante</TableHead>
                          <TableHead className="text-center">Visitas</TableHead>
                          <TableHead className="text-center">Tiempo</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                        <TableRow key={s.userId}>
                            <TableCell>
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={s.image} />
                                    <AvatarFallback>{s.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                                {s.name}
                                <p className="text-[10px] text-muted-foreground font-medium">{s.email}</p>
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="secondary" className="font-bold">{s.totalViews ?? 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-xs font-bold text-muted-foreground">{formatTime(s.totalTimeSpent)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleShowDetails(s)}>
                                    <History className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <VisitDetailsDialog 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
        student={selectedStudent} 
        loading={loadingDetails} 
        logs={viewLogs} 
        handleClearHistory={handleClearHistory}
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactElement, color: string }) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
        purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
        orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
    };

    return (
        <Card className={cn("p-4 border", colors[color])}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-black/20 shadow-sm">
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
                    <p className="text-xl font-bold tracking-tight">{value}</p>
                </div>
            </div>
        </Card>
    );
}

function VisitDetailsDialog({ open, onOpenChange, student, loading, logs, handleClearHistory }: { open: boolean, onOpenChange: (v: boolean) => void, student: any, loading: boolean, logs: any[], handleClearHistory: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
               <Avatar className="h-10 w-10">
                  <AvatarImage src={student?.image} />
                  <AvatarFallback>{student?.name?.substring(0,2).toUpperCase()}</AvatarFallback>
               </Avatar>
               <div>
                  <DialogTitle>{student?.name}</DialogTitle>
                  <DialogDescription className="text-xs">Historial de navegación</DialogDescription>
               </div>
               <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto text-destructive hover:bg-destructive/10"
                onClick={handleClearHistory}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Limpiar
              </Button>
            </div>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto pr-2 py-4 space-y-3">
            {loading ? (
              <div className="py-10 text-center animate-pulse text-sm font-bold">Cargando...</div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Sin registros</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border bg-accent/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tight">Sesión de estudio</span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                        {new Date(log.viewedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
  );
}

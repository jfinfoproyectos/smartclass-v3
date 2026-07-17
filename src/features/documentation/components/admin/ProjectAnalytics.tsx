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
                    <p className="text-sm text-muted-foreground font-medium">Gestión y Configuración de Documentación</p>
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

      <div className="max-w-2xl mx-auto pt-6">
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/10">
              <BookOpenText className="w-8 h-8 text-primary mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold">El proyecto de documentación está vinculado y listo para los estudiantes.</p>
              <p className="text-xs text-muted-foreground mt-1">El asistente IA y el visor público se encuentran activos de manera permanente.</p>
          </div>
      </div>
    </div>
  );
}

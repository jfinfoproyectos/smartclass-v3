"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Search, Trash2, Eye, UserCog, Users as UsersIcon, UserPlus, ChevronLeft, ChevronRight,
    BookOpen, Calendar, MessageSquare, FileText, CheckCircle2, AlertCircle, X, GraduationCap,
    Download, FileSpreadsheet, File as FileIcon, KeyRound, Loader2, Mail, LayoutGrid, List,
    Copy, Check, ShieldCheck, UserCheck, ShieldAlert, Sparkles, Filter, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { updateUserRoleAction, deleteUserAction, createUserAction, toggleUserBanAction, getAllUsersAction, getUserDetailsAction, resetUserPasswordByAdminAction } from "@/app/admin-actions";
import { pdf } from "@react-pdf/renderer";
import { exportToExcel, exportUserReportToExcel } from "@/lib/export-utils";
import { UserReportDocument } from "./UserReportDocument";
import { UsersReportPDFDocument } from "./UsersReportPDFDocument";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatName } from "@/lib/utils";
import { AICanvasCard } from "@/components/ui/ai-canvas-card";

function GoogleIcon({ className = "h-3 w-3" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    );
}

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    image: string | null;
    createdAt: Date;
    banned?: boolean | null;
    accounts?: { providerId: string }[];
    profile?: {
        identificacion: string | null;
        nombres: string | null;
        apellido: string | null;
        telefono: string | null;
        dataProcessingConsent?: boolean | null;
    } | null;
    _count?: {
        coursesCreated: number;
        enrollments: number;
        submissions: number;
    };
}

export interface SummaryStats {
    total: number;
    student: number;
    teacher: number;
    admin: number;
    active: number;
    banned: number;
}

interface UserManagementProps {
    initialUsers: User[];
    totalCount: number;
    summaryStats?: SummaryStats;
    teachers?: User[];
}

export function UserManagement({ initialUsers, totalCount, summaryStats, teachers = [] }: UserManagementProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("student");
    const [teacherFilter, setTeacherFilter] = useState<string>("all");
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
    const [viewMode, setViewMode] = useState<"grid" | "table">("table");
    const [pageSize, setPageSize] = useState<number>(20);
    const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    // Stats
    const [stats, setStats] = useState<SummaryStats>(summaryStats || {
        total: totalCount,
        student: initialUsers.filter(u => u.role === "student").length,
        teacher: initialUsers.filter(u => u.role === "teacher").length,
        admin: initialUsers.filter(u => u.role === "admin").length,
        active: initialUsers.filter(u => !u.banned).length,
        banned: initialUsers.filter(u => u.banned).length,
    });

    const [coursesList, setCoursesList] = useState<{ id: string, title: string, teacherId?: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [fullUserDetails, setFullUserDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Create user form state
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserName, setNewUserName] = useState("");
    const [newUserRole, setNewUserRole] = useState<"teacher" | "admin">("teacher");
    const [newUserPassword, setNewUserPassword] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [currentTotal, setCurrentTotal] = useState(totalCount);
    const usersPerPage = pageSize;
    const totalPages = Math.max(1, Math.ceil(currentTotal / usersPerPage));

    // Role change dialog state
    const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
    const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: "teacher" | "student" | "admin"; userName: string } | null>(null);
    const [roleChangeConfirmation, setRoleChangeConfirmation] = useState("");

    // Password reset state
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [customResetPassword, setCustomResetPassword] = useState("");

    // Initial fetch for filter courses
    useEffect(() => {
        const fetchCourses = async () => {
            const { getAllCoursesForFilterAction } = await import("@/app/admin-actions");
            try {
                const courses = await getAllCoursesForFilterAction();
                setCoursesList(courses);
            } catch (e) {
                console.error("Failed to load courses for filter", e);
            }
        };
        fetchCourses();
    }, []);

    const refreshUsers = async (page = 1, overrides?: { role?: string, course?: string, teacher?: string, search?: string, status?: "all" | "active" | "banned", limit?: number }) => {
        setIsLoadingPage(true);
        try {
            const currentLimit = overrides?.limit !== undefined ? overrides.limit : pageSize;
            const offset = (page - 1) * currentLimit;
            // Use overrides if provided, otherwise current state
            const roleIdx = overrides?.role !== undefined ? overrides.role : roleFilter;
            const courseIdx = overrides?.course !== undefined ? overrides.course : courseFilter;
            const teacherIdx = overrides?.teacher !== undefined ? overrides.teacher : teacherFilter;
            const searchIdx = overrides?.search !== undefined ? overrides.search : searchQuery;
            const statusIdx = overrides?.status !== undefined ? overrides.status : statusFilter;

            const { users: newUsers, total } = await getAllUsersAction({
                limit: currentLimit,
                offset,
                role: roleIdx !== "all" ? (roleIdx as any) : undefined,
                courseId: courseIdx !== "all" ? courseIdx : undefined,
                teacherId: teacherIdx !== "all" ? teacherIdx : undefined,
                search: searchIdx || undefined,
                status: statusIdx !== "all" ? statusIdx : undefined,
            });
            setUsers(newUsers);
            setCurrentTotal(total);
            setCurrentPage(page);
        } catch (error) {
            toast.error("Error al cargar usuarios");
        } finally {
            setIsLoadingPage(false);
        }
    };

    const onFilterChange = (type: 'role' | 'course' | 'teacher' | 'search' | 'status' | 'pageSize', value: string | number) => {
        let currentRole = roleFilter;
        let currentCourse = courseFilter;
        let currentTeacher = teacherFilter;
        let currentSearch = searchQuery;
        let currentStatus = statusFilter;
        let currentLimit = pageSize;

        if (type === 'role') {
            const roleVal = value as string;
            setRoleFilter(roleVal);
            currentRole = roleVal;
            if (roleVal !== "student" && roleVal !== "all") {
                setCourseFilter("all");
                currentCourse = "all";
                setTeacherFilter("all");
                currentTeacher = "all";
            }
        }
        if (type === 'teacher') {
            const teacherVal = value as string;
            setTeacherFilter(teacherVal);
            currentTeacher = teacherVal;
            setCourseFilter("all");
            currentCourse = "all";
        }
        if (type === 'course') {
            setCourseFilter(value as string);
            currentCourse = value as string;
        }
        if (type === 'search') {
            setSearchQuery(value as string);
            currentSearch = value as string;
        }
        if (type === 'status') {
            setStatusFilter(value as any);
            currentStatus = value as any;
        }
        if (type === 'pageSize') {
            const size = Number(value);
            setPageSize(size);
            currentLimit = size;
        }

        startTransition(() => {
            refreshUsers(1, {
                role: currentRole,
                course: currentCourse,
                teacher: currentTeacher,
                search: currentSearch,
                status: currentStatus,
                limit: currentLimit
            });
        });
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setTeacherFilter("all");
        setCourseFilter("all");
        setStatusFilter("all");
        startTransition(() => {
            refreshUsers(1, {
                role: roleFilter,
                course: "all",
                teacher: "all",
                search: "",
                status: "all",
                limit: pageSize
            });
        });
    };

    const handleCopyEmail = (email: string, id: string) => {
        navigator.clipboard.writeText(email);
        setCopiedEmailId(id);
        toast.success(`Correo ${email} copiado`);
        setTimeout(() => setCopiedEmailId(null), 2000);
    };

    const handleExportAllUsersToExcel = async () => {
        setIsExporting(true);
        toast.info("Generando reporte de usuarios en Excel...");
        try {
            const { users: exportUsers } = await getAllUsersAction({
                limit: 1500,
                offset: 0,
                role: roleFilter !== "all" ? (roleFilter as any) : undefined,
                courseId: courseFilter !== "all" ? courseFilter : undefined,
                teacherId: teacherFilter !== "all" ? teacherFilter : undefined,
                search: searchQuery || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            });

            if (!exportUsers || exportUsers.length === 0) {
                toast.warning("No hay usuarios para exportar con los filtros seleccionados");
                return;
            }

            const dataToExport = exportUsers.map(u => {
                const isGoogle = u.accounts && u.accounts.length > 0 && u.accounts.every(a => a.providerId === "google");
                return {
                    "Nombre Completo": formatName(u.name, u.profile),
                    "Correo Electrónico": u.email,
                    "Identificación": u.profile?.identificacion || "N/A",
                    "Teléfono": u.profile?.telefono || "N/A",
                    "Rol": getRoleLabel(u.role),
                    "Método de Autenticación": isGoogle ? "Google OAuth" : "Correo y Contraseña",
                    "Estado": u.banned ? "Suspendido / Baneado" : "Activo",
                    "Cursos Dictados": u._count?.coursesCreated || 0,
                    "Inscripciones": u._count?.enrollments || 0,
                    "Entregas": u._count?.submissions || 0,
                    "Fecha de Registro": format(new Date(u.createdAt), "dd/MM/yyyy HH:mm"),
                };
            });

            await exportToExcel(
                dataToExport,
                `Directorio_Usuarios_SmartClass_${roleFilter}_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
                "Usuarios"
            );
            toast.success("Directorio exportado exitosamente a Excel");
        } catch (error) {
            console.error("Export Error:", error);
            toast.error("Error al exportar usuarios a Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportUsersPDF = async () => {
        setIsExportingPDF(true);
        toast.info("Generando reporte corporativo en PDF...");
        try {
            const { users: exportUsers } = await getAllUsersAction({
                limit: 1500,
                offset: 0,
                role: roleFilter !== "all" ? (roleFilter as any) : undefined,
                courseId: courseFilter !== "all" ? courseFilter : undefined,
                teacherId: teacherFilter !== "all" ? teacherFilter : undefined,
                search: searchQuery || undefined,
                status: statusFilter !== "all" ? statusFilter : undefined,
            });

            if (!exportUsers || exportUsers.length === 0) {
                toast.warning("No hay usuarios para exportar en PDF con los filtros seleccionados");
                return;
            }

            const teacherObj = teachers.find(t => t.id === teacherFilter);
            const teacherName = teacherObj ? formatName(teacherObj.name, teacherObj.profile) : 'Todos';
            const courseObj = coursesList.find(c => c.id === courseFilter);
            const courseTitle = courseObj ? courseObj.title : 'Todos';

            const blob = await pdf(
                <UsersReportPDFDocument
                    users={exportUsers as any}
                    stats={stats}
                    filterRole={roleFilter}
                    filterTeacher={teacherName}
                    filterCourse={courseTitle}
                    filterStatus={statusFilter}
                    filterSearch={searchQuery}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte_Corporativo_Usuarios_${roleFilter}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Reporte corporativo en PDF descargado con éxito");
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("Error al generar el reporte corporativo en PDF");
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handlePageChange = async (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || isLoadingPage) return;
        refreshUsers(newPage);
    };

    const handleRoleChange = async (userId: string, newRole: "teacher" | "student" | "admin") => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setPendingRoleChange({ userId, newRole, userName: formatName(user.name, user.profile) });
        setRoleChangeDialogOpen(true);
    };

    const confirmRoleChange = async () => {
        if (!pendingRoleChange || roleChangeConfirmation !== "cambiar") return;

        startTransition(async () => {
            try {
                await updateUserRoleAction(pendingRoleChange.userId, pendingRoleChange.newRole);

                setUsers(prev => prev.map(u =>
                    u.id === pendingRoleChange.userId ? { ...u, role: pendingRoleChange.newRole } : u
                ));

                toast.success("Rol actualizado", {
                    description: `El rol del usuario ha sido cambiado a ${pendingRoleChange.newRole}`
                });

                setRoleChangeDialogOpen(false);
                setPendingRoleChange(null);
                setRoleChangeConfirmation("");
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo actualizar el rol"
                });
            }
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        startTransition(async () => {
            try {
                await deleteUserAction(userToDelete.id);

                setUsers(prev => prev.filter(u => u.id !== userToDelete.id));

                toast.success("Usuario eliminado", {
                    description: "El usuario ha sido eliminado del sistema"
                });

                setDeleteDialogOpen(false);
                setUserToDelete(null);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo eliminar el usuario"
                });
            }
        });
    };

    const handleResetPasswordConfirm = async () => {
        if (!userToResetPassword) return;
        setIsResettingPassword(true);
        try {
            const res = await resetUserPasswordByAdminAction(
                userToResetPassword.id,
                customResetPassword.trim() || undefined
            );
            if (res.success) {
                toast.success("Contraseña restablecida", {
                    description: res.message
                });
                setResetPasswordDialogOpen(false);
                setUserToResetPassword(null);
                setCustomResetPassword("");
                refreshUsers(currentPage);
            }
        } catch (error: any) {
            toast.error("Error al restablecer", {
                description: error.message || "No se pudo restablecer la contraseña"
            });
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleToggleBan = async (userId: string, currentBanned: boolean) => {
        startTransition(async () => {
            try {
                await toggleUserBanAction(userId, !currentBanned);

                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, banned: !currentBanned } : u
                ));

                setStats(prev => ({
                    ...prev,
                    active: !currentBanned ? Math.max(0, prev.active - 1) : prev.active + 1,
                    banned: !currentBanned ? prev.banned + 1 : Math.max(0, prev.banned - 1),
                }));

                toast.success(!currentBanned ? "Usuario suspendido" : "Usuario reactivado", {
                    description: `La cuenta ha sido ${!currentBanned ? 'suspendida' : 'reactivada'} exitosamente`
                });
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo actualizar el estado del usuario"
                });
            }
        });
    };

    const getRoleBadgeVariant = (role: string | null) => {
        switch (role) {
            case "admin":
                return "destructive";
            case "teacher":
                return "default";
            case "student":
                return "secondary";
            default:
                return "outline";
        }
    };

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case "admin":
                return "Administrador";
            case "teacher":
                return "Profesor";
            case "student":
                return "Estudiante";
            default:
                return role || "Sin rol";
        }
    };

    const handleCreateUser = async () => {
        if (!newUserEmail || !newUserName || !newUserPassword) {
            toast.error("Error", {
                description: "Todos los campos son obligatorios"
            });
            return;
        }

        startTransition(async () => {
            try {
                const user = await createUserAction({
                    email: newUserEmail,
                    name: newUserName,
                    role: newUserRole,
                    password: newUserPassword
                });

                setUsers(prev => [{
                    ...user,
                    role: user.role as string,
                    createdAt: new Date(user.createdAt),
                    profile: null,
                    _count: {
                        coursesCreated: 0,
                        enrollments: 0,
                        submissions: 0
                    }
                }, ...prev]);

                toast.success("Usuario creado", {
                    description: `Se ha creado el usuario ${user.name}`
                });

                setNewUserEmail("");
                setNewUserName("");
                setNewUserRole("teacher");
                setNewUserPassword("");
                setCreateDialogOpen(false);
            } catch (error: any) {
                toast.error("Error", {
                    description: error.message || "No se pudo crear el usuario"
                });
            }
        });
    };

    const handleExportPDF = async () => {
        if (!selectedUser || !fullUserDetails) return;

        try {
            const blob = await pdf(
                <UserReportDocument user={selectedUser} details={fullUserDetails} />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte_${formatName(selectedUser.name, selectedUser.profile).replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("PDF generado correctamente");
        } catch (error) {
            console.error("PDF Error:", error);
            toast.error("Error al generar PDF");
        }
    };

    const handleExportExcel = async () => {
        if (!selectedUser || !fullUserDetails) return;
        try {
            const fileName = `reporte_${formatName(selectedUser.name, selectedUser.profile).replace(/\s+/g, '_')}`;
            await exportUserReportToExcel(selectedUser, fullUserDetails, fileName);
            toast.success("Excel generado correctamente con ExcelJS");
        } catch (error) {
            console.error("Error generating Excel:", error);
            toast.error("Error al generar el archivo Excel");
        }
    };

    return (
        <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Top Stats Cards with AI Canvas aesthetics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AICanvasCard
                    title="Estudiantes"
                    description="Alumnos y aprendices activos"
                    icon={GraduationCap}
                    badge={`${stats.student} estudiantes`}
                    badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    accentColor="from-blue-500/20 via-blue-500/10 to-transparent"
                    iconBgColor="bg-blue-500/10"
                    iconTextColor="text-blue-600 dark:text-blue-400"
                    compact={true}
                    onClick={() => onFilterChange('role', 'student')}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {stats.student}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            {stats.total > 0 ? `${Math.round((stats.student / stats.total) * 100)}% del total` : ""}
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Cuerpo Docente"
                    description="Profesores e instructores"
                    icon={BookOpen}
                    badge={`${stats.teacher} docentes`}
                    badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    accentColor="from-emerald-500/20 via-emerald-500/10 to-transparent"
                    iconBgColor="bg-emerald-500/10"
                    iconTextColor="text-emerald-600 dark:text-emerald-400"
                    compact={true}
                    onClick={() => onFilterChange('role', 'teacher')}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {stats.teacher}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            profesores activos
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Administradores"
                    description="Gestores con acceso global"
                    icon={ShieldCheck}
                    badge="Directivos"
                    badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    accentColor="from-amber-500/20 via-amber-500/10 to-transparent"
                    iconBgColor="bg-amber-500/10"
                    iconTextColor="text-amber-600 dark:text-amber-400"
                    compact={true}
                    onClick={() => onFilterChange('role', 'admin')}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {stats.admin}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            control del sistema
                        </span>
                    </div>
                </AICanvasCard>

                <AICanvasCard
                    title="Cuentas Activas"
                    description={`${stats.banned} suspendidas / ${stats.total} registradas`}
                    icon={UserCheck}
                    badge={stats.banned === 0 ? "100% Operativo" : `${stats.banned} restringidas`}
                    badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    accentColor="from-purple-500/20 via-purple-500/10 to-transparent"
                    iconBgColor="bg-purple-500/10"
                    iconTextColor="text-purple-600 dark:text-purple-400"
                    compact={true}
                    onClick={() => onFilterChange('status', 'active')}
                >
                    <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-black tracking-tight text-foreground">
                            {stats.active}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                            cuentas habilitadas
                        </span>
                    </div>
                </AICanvasCard>
            </div>

            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Supervisa, audita y administra las cuentas y permisos académicos del sistema
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Badge variant="outline" className="text-xs font-semibold px-3 py-1.5 bg-background shadow-xs border-border">
                        <UsersIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                        {currentTotal} usuarios
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportAllUsersToExcel}
                        disabled={isExporting}
                        className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                        <span className="hidden sm:inline">Exportar Excel</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportUsersPDF}
                        disabled={isExportingPDF}
                        className="gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                        {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-rose-600" />}
                        <span className="hidden sm:inline">Exportar PDF</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                        className="gap-1.5 shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Crear Usuario</span>
                    </Button>
                </div>
            </div>

            {/* Filter Toolbar & View Toggle */}
            <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-3.5 sm:p-4 shadow-xs space-y-3.5">
                {/* Row 1: Role Tabs & View Switcher */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Role Tabs */}
                    <Tabs value={roleFilter} onValueChange={(val) => onFilterChange('role', val)} className="w-full md:w-auto">
                        <TabsList className="grid grid-cols-4 sm:flex items-center h-10 p-1 bg-muted/60 rounded-xl border border-border/60">
                            <TabsTrigger value="all" className="rounded-lg text-xs font-medium px-3 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
                                <span>Todos</span>
                                <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5 bg-background/80">
                                    {stats.total}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="student" className="rounded-lg text-xs font-medium px-3 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
                                <span>Estudiantes</span>
                                <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5 bg-background/80">
                                    {stats.student}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="teacher" className="rounded-lg text-xs font-medium px-3 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
                                <span>Profesores</span>
                                <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5 bg-background/80">
                                    {stats.teacher}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="rounded-lg text-xs font-medium px-3 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
                                <span>Administradores</span>
                                <Badge variant="secondary" className="ml-1.5 text-[10px] py-0 px-1.5 bg-background/80">
                                    {stats.admin}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* View Switcher & Page Size */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        {/* Page Size Selector */}
                        <Select value={String(pageSize)} onValueChange={(val) => onFilterChange('pageSize', val)}>
                            <SelectTrigger className="w-[115px] h-9 bg-background/70 border-border/70 rounded-xl text-xs">
                                <SelectValue placeholder="Por pág." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20 / pág</SelectItem>
                                <SelectItem value="50">50 / pág</SelectItem>
                                <SelectItem value="100">100 / pág</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* View Switcher */}
                        <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/70">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className={`h-8 px-2.5 rounded-lg ${viewMode === "grid" ? "shadow-xs font-semibold" : "text-muted-foreground"}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("table")}
                                className={`h-8 px-2.5 rounded-lg ${viewMode === "table" ? "shadow-xs font-semibold" : "text-muted-foreground"}`}
                                title="Vista Tabla"
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Search & Contextual Dropdowns */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 pt-2 border-t border-border/40">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, email o identificación..."
                            value={searchQuery}
                            onChange={(e) => onFilterChange('search', e.target.value)}
                            className="pl-10 pr-9 bg-background/70 border-border/70 shadow-2xs h-9 rounded-xl text-xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => onFilterChange('search', '')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                                title="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Filters */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        {/* Teacher Filter (for students or all) */}
                        {(roleFilter === "student" || roleFilter === "all") && teachers && teachers.length > 0 && (
                            <div className="w-full sm:w-[195px]">
                                <Select value={teacherFilter} onValueChange={(val) => onFilterChange('teacher', val)}>
                                    <SelectTrigger className="w-full h-9 bg-background/70 border-border/70 rounded-xl text-xs">
                                        <SelectValue placeholder="Profesor: Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los profesores</SelectItem>
                                        {teachers.map((teacher) => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {formatName(teacher.name, teacher.profile)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Course Filter (for students or all) */}
                        {(roleFilter === "student" || roleFilter === "all") && (
                            <div className="w-full sm:w-[195px]">
                                <Select value={courseFilter} onValueChange={(val) => onFilterChange('course', val)}>
                                    <SelectTrigger className="w-full h-9 bg-background/70 border-border/70 rounded-xl text-xs">
                                        <SelectValue placeholder="Curso: Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los cursos</SelectItem>
                                        {(teacherFilter !== "all"
                                            ? coursesList.filter(c => !c.teacherId || c.teacherId === teacherFilter)
                                            : coursesList
                                        ).map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Status Filter */}
                        <div className="w-full sm:w-[160px]">
                            <Select value={statusFilter} onValueChange={(val) => onFilterChange('status', val)}>
                                <SelectTrigger className="w-full h-9 bg-background/70 border-border/70 rounded-xl text-xs">
                                    <SelectValue placeholder="Estado: Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="active">Solo Activos</SelectItem>
                                    <SelectItem value="banned">Suspendidos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reset Filters button */}
                        {(searchQuery || teacherFilter !== 'all' || courseFilter !== 'all' || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-xl shrink-0"
                                title="Limpiar todos los filtros"
                            >
                                <X className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Limpiar</span>
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Users Display (Bento Grid or Table) */}
            {isLoadingPage ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Cargando directorio de usuarios...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center shadow-xs">
                    <UsersIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-foreground">No se encontraron usuarios</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        No hay registros que coincidan con los filtros de búsqueda o criterios actuales.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("student");
                            setTeacherFilter("all");
                            setCourseFilter("all");
                            setStatusFilter("all");
                            refreshUsers(1, { role: "student", teacher: "all", course: "all", search: "", status: "all" });
                        }}
                        className="mt-4 gap-1.5 text-xs"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restablecer Filtros
                    </Button>
                </div>
            ) : viewMode === "grid" ? (
                /* Bento Grid Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {users.map((user) => {
                        const isGoogleOnly = user.accounts && user.accounts.length > 0 && user.accounts.every(a => a.providerId === "google");
                        const isBanned = !!user.banned;
                        const nameFormatted = formatName(user.name, user.profile);

                        return (
                            <Card key={user.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 border-border/70 hover:border-primary/40 bg-card rounded-2xl flex flex-col justify-between">
                                {/* Accent top gradient strip */}
                                <div className={`h-1.5 w-full ${
                                    user.role === 'admin'
                                        ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                        : user.role === 'teacher'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                }`} />

                                <CardHeader className="p-4 pb-3 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative shrink-0">
                                                <UserAvatar
                                                    src={user.image}
                                                    alt={nameFormatted}
                                                    fallbackText={nameFormatted}
                                                    size="md"
                                                />
                                                <span
                                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isBanned ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    title={isBanned ? "Suspendido" : "Activo"}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-sm truncate text-foreground leading-snug" title={nameFormatted}>
                                                    {nameFormatted}
                                                </h3>
                                                {user.profile?.identificacion ? (
                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono mt-0.5">
                                                        <span>CC:</span>
                                                        <span className="font-medium text-foreground/80">{user.profile.identificacion}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground italic">Sin identificación</span>
                                                )}
                                            </div>
                                        </div>

                                        <Badge variant={getRoleBadgeVariant(user.role)} className="shrink-0 text-[10px] font-semibold uppercase tracking-wider">
                                            {getRoleLabel(user.role)}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                                    {/* Email and provider badge */}
                                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 text-xs border border-border/40">
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
                                            <span className="truncate font-medium text-foreground/90 text-[11px]" title={user.email}>
                                                {user.email}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyEmail(user.email, user.id)}
                                                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                                title="Copiar correo"
                                            >
                                                {copiedEmailId === user.id ? (
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                            {isGoogleOnly ? (
                                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                                                    <GoogleIcon className="h-2 w-2 mr-1" /> Google
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                                    <Mail className="h-2 w-2 mr-1" /> Clave
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats summary & Registration date */}
                                    <div className="grid grid-cols-2 gap-2 text-[11px] my-1">
                                        <div className="p-2 rounded-xl bg-background border border-border/50">
                                            <span className="text-muted-foreground block text-[10px]">Actividad</span>
                                            {user.role === 'teacher' ? (
                                                <span className="font-semibold text-foreground text-xs">
                                                    {user._count?.coursesCreated || 0} cursos dictados
                                                </span>
                                            ) : user.role === 'student' ? (
                                                <span className="font-semibold text-foreground text-xs">
                                                    {user._count?.enrollments || 0} cursos • {user._count?.submissions || 0} entregas
                                                </span>
                                            ) : (
                                                <span className="font-semibold text-amber-600 text-xs">Acceso total</span>
                                            )}
                                        </div>
                                        <div className="p-2 rounded-xl bg-background border border-border/50">
                                            <span className="text-muted-foreground block text-[10px]">Registro</span>
                                            <span className="font-medium text-foreground text-xs">
                                                {format(new Date(user.createdAt), "dd/MM/yyyy")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status toggle & Actions */}
                                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={!user.banned}
                                                onCheckedChange={() => handleToggleBan(user.id, user.banned || false)}
                                                disabled={isPending}
                                            />
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {user.banned ? "Suspendido" : "Activo"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-foreground/80 hover:text-primary hover:bg-primary/10 rounded-lg"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setLoadingDetails(true);
                                                                setDetailsSheetOpen(true);
                                                                startTransition(async () => {
                                                                    try {
                                                                        const details = await getUserDetailsAction(user.id);
                                                                        setFullUserDetails(details);
                                                                    } catch (error) {
                                                                        toast.error("Error al cargar detalles");
                                                                    } finally {
                                                                        setLoadingDetails(false);
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Ver Detalles</p></TooltipContent>
                                                </Tooltip>

                                                {!isGoogleOnly && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                                                                onClick={() => {
                                                                    setUserToResetPassword(user);
                                                                    setCustomResetPassword("");
                                                                    setResetPasswordDialogOpen(true);
                                                                }}
                                                                disabled={isPending}
                                                            >
                                                                <KeyRound className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Restablecer contraseña</p></TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                            onClick={() => handleRoleChange(user.id, user.role === 'teacher' ? 'student' : 'teacher')}
                                                            disabled={isPending}
                                                        >
                                                            <UserCog className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Cambiar rol</p></TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                            disabled={isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Eliminar usuario</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Table Mode */
                <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border shadow-xs">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                                        <TableHead className="font-bold uppercase tracking-wider text-xs pl-6 py-4">Usuario</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs hidden md:table-cell py-4">Email / Acceso</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center py-4">Rol</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden lg:table-cell py-4">Estado</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden xl:table-cell py-4">Estadísticas</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-center hidden sm:table-cell py-4">Fecha Registro</TableHead>
                                        <TableHead className="font-bold uppercase tracking-wider text-xs text-right pr-6 py-4">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => {
                                        const isGoogleOnly = user.accounts && user.accounts.length > 0 && user.accounts.every(a => a.providerId === "google");
                                        const nameFormatted = formatName(user.name, user.profile);

                                        return (
                                            <TableRow key={user.id} className="group hover:bg-muted/20 transition-colors border-border/40">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar
                                                            src={user.image}
                                                            alt={nameFormatted}
                                                            fallbackText={nameFormatted}
                                                            size="sm"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-foreground">{nameFormatted}</div>
                                                            {user.profile?.identificacion ? (
                                                                <div className="text-xs text-muted-foreground font-mono">
                                                                    CC: {user.profile.identificacion}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-muted-foreground italic">
                                                                    Sin documento
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium text-foreground truncate max-w-[220px]" title={user.email}>
                                                                {user.email}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyEmail(user.email, user.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground transition-opacity"
                                                                title="Copiar correo"
                                                            >
                                                                {copiedEmailId === user.id ? (
                                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div>
                                                            {isGoogleOnly ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-blue-200 bg-blue-50/60 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                                                                >
                                                                    <GoogleIcon className="h-2.5 w-2.5 shrink-0" />
                                                                    <span>Google</span>
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="inline-flex items-center gap-1 text-[10px] font-medium py-0 px-1.5 border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                                                                >
                                                                    <Mail className="h-2.5 w-2.5 shrink-0" />
                                                                    <span>Correo y Contraseña</span>
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-3">
                                                    <Select
                                                        value={user.role || "student"}
                                                        onValueChange={(value) => handleRoleChange(user.id, value as any)}
                                                        disabled={isPending}
                                                    >
                                                        <SelectTrigger className="w-[130px] mx-auto h-8 text-xs bg-card">
                                                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px] uppercase font-semibold">
                                                                {getRoleLabel(user.role)}
                                                            </Badge>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="student">Estudiante</SelectItem>
                                                            <SelectItem value="teacher">Profesor</SelectItem>
                                                            <SelectItem value="admin">Administrador</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-center py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Switch
                                                            checked={!user.banned}
                                                            onCheckedChange={() => handleToggleBan(user.id, user.banned || false)}
                                                            disabled={isPending}
                                                        />
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            {user.banned ? "Suspendido" : "Activo"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden xl:table-cell text-center py-3">
                                                    {user._count && (
                                                        <div className="text-xs space-y-0.5">
                                                            {user.role === "teacher" && (
                                                                <div className="font-semibold text-foreground">{user._count.coursesCreated} cursos</div>
                                                            )}
                                                            {user.role === "student" && (
                                                                <>
                                                                    <div className="font-semibold text-foreground">{user._count.enrollments} cursos</div>
                                                                    <div className="text-muted-foreground text-[11px]">{user._count.submissions} entregas</div>
                                                                </>
                                                            )}
                                                            {user.role === "admin" && (
                                                                <div className="font-semibold text-amber-600 text-xs">Acceso total</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell text-center text-xs text-muted-foreground py-3">
                                                    {format(new Date(user.createdAt), "dd/MM/yyyy")}
                                                </TableCell>
                                                <TableCell className="text-right pr-6 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-lg"
                                                                        onClick={() => {
                                                                            setSelectedUser(user);
                                                                            setLoadingDetails(true);
                                                                            setDetailsSheetOpen(true);
                                                                            startTransition(async () => {
                                                                                try {
                                                                                    const details = await getUserDetailsAction(user.id);
                                                                                    setFullUserDetails(details);
                                                                                } catch (error) {
                                                                                    toast.error("Error al cargar detalles");
                                                                                } finally {
                                                                                    setLoadingDetails(false);
                                                                                }
                                                                            });
                                                                        }}
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Ver Detalles</p></TooltipContent>
                                                            </Tooltip>

                                                            {!isGoogleOnly && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                                                                            onClick={() => {
                                                                                setUserToResetPassword(user);
                                                                                setCustomResetPassword("");
                                                                                setResetPasswordDialogOpen(true);
                                                                            }}
                                                                            disabled={isPending}
                                                                        >
                                                                            <KeyRound className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>Restablecer contraseña (por defecto cédula)</p></TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                        onClick={() => {
                                                                            setUserToDelete(user);
                                                                            setDeleteDialogOpen(true);
                                                                        }}
                                                                        disabled={isPending}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Eliminar Usuario</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                        Mostrando <span className="font-semibold text-foreground">{((currentPage - 1) * usersPerPage) + 1}</span> - <span className="font-semibold text-foreground">{Math.min(currentPage * usersPerPage, currentTotal)}</span> de <span className="font-semibold text-foreground">{currentTotal}</span> usuarios
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoadingPage}
                            className="rounded-lg h-8 px-3"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            <span>Anterior</span>
                        </Button>
                        <div className="text-xs sm:text-sm font-medium px-2 whitespace-nowrap">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || isLoadingPage}
                            className="rounded-lg h-8 px-3"
                        >
                            <span>Siguiente</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
                            {userToDelete && ` "${userToDelete.name || userToDelete.email}"`} y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            disabled={isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isPending ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Role Change Confirmation Dialog */}
            <Dialog open={roleChangeDialogOpen} onOpenChange={(open) => {
                setRoleChangeDialogOpen(open);
                if (!open) {
                    setPendingRoleChange(null);
                    setRoleChangeConfirmation("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Cambiar rol de usuario?</DialogTitle>
                        <DialogDescription>
                            Estás a punto de cambiar el rol de <strong>{pendingRoleChange?.userName}</strong> a{" "}
                            <strong>{pendingRoleChange?.newRole === "admin" ? "Administrador" : pendingRoleChange?.newRole === "teacher" ? "Profesor" : "Estudiante"}</strong>.
                            <br /><br />
                            Esta acción puede afectar los permisos y accesos del usuario en el sistema.
                            <br /><br />
                            Escribe <strong>cambiar</strong> para confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Escribe cambiar"
                            value={roleChangeConfirmation}
                            onChange={(e) => setRoleChangeConfirmation(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRoleChangeDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmRoleChange}
                            disabled={isPending || roleChangeConfirmation !== "cambiar"}
                        >
                            {isPending ? "Cambiando..." : "Cambiar Rol"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Details Sheet */}
            <Sheet open={detailsSheetOpen} onOpenChange={(open) => {
                setDetailsSheetOpen(open);
                if (!open) setFullUserDetails(null);
            }}>
                <SheetContent className="w-full! max-w-none! h-full p-0 overflow-hidden" side="right">
                    <SheetTitle className="sr-only">Detalles del Usuario</SheetTitle>
                    {selectedUser && (
                        <div className="flex flex-col h-full bg-background">
                            {/* Sheet Header - Minimalist */}
                            <div className="absolute top-4 right-4 z-50">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 bg-white/50 backdrop-blur hover:bg-white/80 rounded-full"
                                    onClick={() => setDetailsSheetOpen(false)}
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            {/* Scrollable Content */}
                            <ScrollArea className="flex-1">
                                <div className="w-full max-w-7xl mx-auto p-6 md:p-10 space-y-8">

                                    {/* User Header Info - Moved here */}
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b">
                                        <div className="flex items-center gap-6">
                                            <UserAvatar
                                                src={selectedUser.image}
                                                alt={formatName(selectedUser.name, selectedUser.profile)}
                                                fallbackText={formatName(selectedUser.name, selectedUser.profile)}
                                                className="h-24 w-24 text-2xl"
                                            />
                                            <div>
                                                <h1 className="text-3xl font-bold">{formatName(selectedUser.name, selectedUser.profile)}</h1>
                                                <p className="text-muted-foreground text-lg">{selectedUser.email}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="px-3 py-1 text-sm">
                                                        {getRoleLabel(selectedUser.role)}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground ml-2">
                                                        Registrado: {format(new Date(selectedUser.createdAt), "PPP")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUser && (!selectedUser.accounts || selectedUser.accounts.length === 0 || !selectedUser.accounts.every((a: any) => a.providerId === 'google')) && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setUserToResetPassword(selectedUser);
                                                        setCustomResetPassword("");
                                                        setResetPasswordDialogOpen(true);
                                                    }}
                                                    disabled={loadingDetails}
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                                                >
                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                    Restablecer Contraseña
                                                </Button>
                                            )}
                                            <Button variant="outline" onClick={handleExportPDF} disabled={loadingDetails}>
                                                <FileIcon className="mr-2 h-4 w-4 text-red-500" />
                                                PDF
                                            </Button>
                                            <Button variant="outline" onClick={handleExportExcel} disabled={loadingDetails}>
                                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                                Excel
                                            </Button>
                                        </div>
                                    </div>

                                    <Tabs defaultValue="overview" className="w-full space-y-6">
                                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/30">
                                            <TabsTrigger value="overview" className="py-3">Vista General</TabsTrigger>

                                            {(selectedUser.role === 'teacher' || selectedUser.role === 'admin') && (
                                                <TabsTrigger value="courses-created" className="py-2">Clases</TabsTrigger>
                                            )}

                                            {selectedUser.role === 'student' && (
                                                <>
                                                    <TabsTrigger value="courses" className="py-2">Cursos</TabsTrigger>
                                                    <TabsTrigger value="attendance" className="py-2">Asistencia</TabsTrigger>
                                                    <TabsTrigger value="submissions" className="py-2">Entregas</TabsTrigger>
                                                    <TabsTrigger value="remarks" className="py-2">Observaciones</TabsTrigger>
                                                </>
                                            )}
                                        </TabsList>

                                        <TabsContent value="overview" className="space-y-6">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <UserCog className="h-5 w-5" />
                                                            Información Personal
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {selectedUser.profile ? (
                                                            <div className="grid gap-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-muted-foreground">Identificación</div>
                                                                        <div>{selectedUser.profile.identificacion || "No registrada"}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-muted-foreground">Teléfono</div>
                                                                        <div>{selectedUser.profile.telefono || "No registrado"}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-muted-foreground">Nombres</div>
                                                                        <div>{selectedUser.profile.nombres || "-"}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-muted-foreground">Apellidos</div>
                                                                        <div>{selectedUser.profile.apellido || "-"}</div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-muted-foreground mb-1">Habeas Data</div>
                                                                    {selectedUser.profile.dataProcessingConsent ? (
                                                                        <Badge variant="default" className="bg-green-600">Aceptado</Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-orange-500 border-orange-500">Pendiente</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-muted-foreground py-4">
                                                                Perfil no completado
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <CheckCircle2 className="h-5 w-5" />
                                                            Estado del Sistema
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                                                            <span className="text-sm font-medium">Cuenta Activa</span>
                                                            <Switch
                                                                checked={!selectedUser.banned}
                                                                onCheckedChange={() => handleToggleBan(selectedUser.id, selectedUser.banned || false)}
                                                                disabled={isPending}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                                                            <span className="text-sm font-medium">Fecha de Registro</span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {format(new Date(selectedUser.createdAt), "PPP")}
                                                            </span>
                                                        </div>
                                                        {selectedUser._count && (
                                                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                                                <div className="bg-primary/5 p-2 rounded-md">
                                                                    <div className="text-2xl font-bold">{selectedUser._count.enrollments || 0}</div>
                                                                    <div className="text-xs text-muted-foreground">Cursos</div>
                                                                </div>
                                                                <div className="bg-primary/5 p-2 rounded-md">
                                                                    <div className="text-2xl font-bold">{selectedUser._count.submissions || 0}</div>
                                                                    <div className="text-xs text-muted-foreground">Entregas</div>
                                                                </div>
                                                                <div className="bg-primary/5 p-2 rounded-md">
                                                                    <div className="text-2xl font-bold">{selectedUser._count.coursesCreated || 0}</div>
                                                                    <div className="text-xs text-muted-foreground">Clases</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </TabsContent>

                                        {/* Teachers/Admins: Courses Created Tab */}
                                        {(selectedUser.role === 'teacher' || selectedUser.role === 'admin') && (
                                            <TabsContent value="courses-created">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <BookOpen className="h-5 w-5" />
                                                            Clases Creadas
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {loadingDetails ? (
                                                            <div className="py-8 text-center text-muted-foreground">Cargando clases...</div>
                                                        ) : fullUserDetails?.coursesCreated?.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Curso</TableHead>
                                                                        <TableHead>Estudiantes</TableHead>
                                                                        <TableHead>Actividades</TableHead>
                                                                        <TableHead>Creado</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {fullUserDetails.coursesCreated.map((course: any) => (
                                                                        <TableRow key={course.id}>
                                                                            <TableCell className="font-medium">
                                                                                {course.title}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {course.teacher?.name || course.teacher?.email || "Sin asignar"}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Badge variant="secondary">
                                                                                    {course._count?.enrollments || 0}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Badge variant="outline">
                                                                                    {course._count?.activities || 0}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {format(new Date(course.createdAt), "PPP")}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <div className="py-8 text-center text-muted-foreground">No hay clases creadas</div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                        )}

                                        {/* Students: Enrollment Tabs */}
                                        {selectedUser.role === 'student' && (
                                            <>
                                                <TabsContent value="courses">
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <BookOpen className="h-5 w-5" />
                                                                Cursos Inscritos
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {loadingDetails ? (
                                                                <div className="py-8 text-center text-muted-foreground">Cargando cursos...</div>
                                                            ) : fullUserDetails?.enrollments?.length > 0 ? (
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Curso</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs">Profesor</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Fecha Inscripción</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.enrollments.map((enrollment: any) => (
                                                                            <TableRow key={enrollment.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                                <TableCell className="font-medium pl-4">
                                                                                    {enrollment.course.title}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {enrollment.course.teacher?.name || enrollment.course.teacher?.email || "Sin asignar"}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {format(new Date(enrollment.createdAt), "PPP")}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge variant={enrollment.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                                                        {enrollment.status === 'APPROVED' ? 'Activo' : enrollment.status}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            ) : (
                                                                <div className="py-8 text-center text-muted-foreground">No hay cursos inscritos</div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                <TabsContent value="attendance">
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <Calendar className="h-5 w-5" />
                                                                Historial de Asistencia
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {loadingDetails ? (
                                                                <div className="py-8 text-center text-muted-foreground">Cargando asistencia...</div>
                                                            ) : fullUserDetails?.attendances?.length > 0 ? (
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Fecha</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs">Curso</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Estado</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs">Notas</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.attendances.map((record: any) => (
                                                                            <TableRow key={record.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                                <TableCell>
                                                                                    {format(new Date(record.date), "PPP - HH:mm")}
                                                                                </TableCell>
                                                                                <TableCell className="font-medium">
                                                                                    {record.course?.title || "Curso eliminado"}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge className={
                                                                                        record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                                                                                            record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                                                                                                record.status === 'EXCUSED' ? 'bg-blue-100 text-blue-800' :
                                                                                                    'bg-red-100 text-red-800'
                                                                                    }>
                                                                                        {record.status === 'PRESENT' ? 'Presente' :
                                                                                            record.status === 'LATE' ? 'Tarde' :
                                                                                                record.status === 'EXCUSED' ? 'Excusado' : 'Ausente'}
                                                                                    </Badge>
                                                                                </TableCell>
                                                                                <TableCell className="text-sm text-muted-foreground italic">
                                                                                    {record.justification || "-"}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            ) : (
                                                                <div className="py-8 text-center text-muted-foreground">No hay registros de asistencia</div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                <TabsContent value="submissions">
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <FileText className="h-5 w-5" />
                                                                Entregas Recientes
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {loadingDetails ? (
                                                                <div className="py-8 text-center text-muted-foreground">Cargando entregas...</div>
                                                            ) : fullUserDetails?.submissions?.length > 0 ? (
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs pl-4">Actividad</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs">Curso</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Fecha Entrega</TableHead>
                                                                            <TableHead className="font-bold uppercase tracking-wider text-xs text-center">Calificación</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.submissions.map((sub: any) => (
                                                                            <TableRow key={sub.id} className="group hover:bg-muted/20 transition-colors border-border/30">
                                                                                <TableCell className="font-medium">
                                                                                    {sub.activity.title}
                                                                                    {sub.url && (
                                                                                        <a href={sub.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-block">
                                                                                            <Badge variant="outline" className="text-xs hover:bg-slate-100">Ver</Badge>
                                                                                        </a>
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell>{sub.activity.course.title}</TableCell>
                                                                                <TableCell>
                                                                                    {format(new Date(sub.createdAt), "PPP HH:mm")}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {sub.grade !== null ? (
                                                                                        <Badge variant={sub.grade >= 3 ? 'default' : 'destructive'}>
                                                                                            {sub.grade.toFixed(1)}
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge variant="secondary">Pendiente</Badge>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            ) : (
                                                                <div className="py-8 text-center text-muted-foreground">No hay entregas registradas</div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>

                                                <TabsContent value="remarks">
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <MessageSquare className="h-5 w-5" />
                                                                Observador del Estudiante
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {loadingDetails ? (
                                                                <div className="py-8 text-center text-muted-foreground">Cargando observaciones...</div>
                                                            ) : fullUserDetails?.remarks?.length > 0 ? (
                                                                <div className="space-y-4">
                                                                    {fullUserDetails.remarks.map((remark: any) => (
                                                                        <div key={remark.id} className="border rounded-lg p-4 bg-card/50">
                                                                            <div className="flex items-start justify-between mb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    {remark.type === 'COMMENDATION' ? (
                                                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                                    ) : (
                                                                                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                                                                                    )}
                                                                                    <h4 className="font-semibold">{remark.title}</h4>
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {format(new Date(remark.date), "PPP")}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                                                {remark.description}
                                                                            </p>
                                                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                                                                <span>Curso: {remark.course.title}</span>
                                                                                <span>Por: {remark.teacher.name || "Profesor"}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="py-8 text-center text-muted-foreground">No hay observaciones registradas</div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>
                                            </>
                                        )}
                                    </Tabs>
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </SheetContent >
            </Sheet >

            {/* Create User Dialog */}
            < Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                            Crea un nuevo profesor o administrador. Los estudiantes no pueden ser creados desde aquí.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                placeholder="Juan Pérez"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="juan@ejemplo.com"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as "teacher" | "admin")} disabled={isPending}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">Profesor</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateUser}
                            disabled={isPending}
                        >
                            {isPending ? "Creando..." : "Crear Usuario"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <KeyRound className="h-5 w-5" />
                            <DialogTitle>Restablecer Contraseña</DialogTitle>
                        </div>
                        <DialogDescription>
                            Esta acción asignará la contraseña de acceso para{" "}
                            <strong>{userToResetPassword ? formatName(userToResetPassword.name, userToResetPassword.profile) : ""}</strong>{" "}
                            ({userToResetPassword?.email}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3 space-y-3 text-sm">
                        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-2">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                Contraseña predeterminada asignada:
                            </p>
                            {userToResetPassword?.profile?.identificacion ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Documento de Identidad:</span>
                                    <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-background text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                        {userToResetPassword.profile.identificacion}
                                    </Badge>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>El usuario no tiene número de identificación registrado en su perfil.</span>
                                    </div>
                                    <div>
                                        <Label htmlFor="custom-reset-pwd" className="text-xs font-medium">
                                            Ingresa una contraseña temporal:
                                        </Label>
                                        <Input
                                            id="custom-reset-pwd"
                                            type="text"
                                            placeholder="Ingresa la nueva contraseña..."
                                            value={customResetPassword}
                                            onChange={(e) => setCustomResetPassword(e.target.value)}
                                            className="mt-1 h-8 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            El usuario podrá iniciar sesión con su correo electrónico y su nueva contraseña inmediatamente.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResetPasswordDialogOpen(false)}
                            disabled={isResettingPassword}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleResetPasswordConfirm}
                            disabled={
                                isResettingPassword ||
                                (!userToResetPassword?.profile?.identificacion && !customResetPassword.trim())
                            }
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                        >
                            {isResettingPassword ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Restableciendo...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="h-4 w-4" />
                                    Restablecer Contraseña
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

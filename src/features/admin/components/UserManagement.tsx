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
    Search, Trash2, Eye, UserCog, Users as UsersIcon, UserPlus, ChevronLeft, ChevronRight,
    BookOpen, Calendar, MessageSquare, FileText, CheckCircle2, AlertCircle, X, GraduationCap,
    Download, FileSpreadsheet, File as FileIcon
} from "lucide-react";
import { toast } from "sonner";
import { updateUserRoleAction, deleteUserAction, createUserAction, toggleUserBanAction, getAllUsersAction, getUserDetailsAction } from "@/app/admin-actions";
import { pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { UserReportDocument } from "./UserReportDocument";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatName } from "@/lib/utils";

interface User {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    image: string | null;
    createdAt: Date;
    banned?: boolean | null;
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

interface UserManagementProps {
    initialUsers: User[];
    totalCount: number;
}

export function UserManagement({ initialUsers, totalCount }: UserManagementProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const [coursesList, setCoursesList] = useState<{ id: string, title: string }[]>([]);
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
    const usersPerPage = 20;
    const totalPages = Math.ceil(currentTotal / usersPerPage);

    // Role change dialog state
    const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
    const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; newRole: "teacher" | "student" | "admin"; userName: string } | null>(null);
    const [roleChangeConfirmation, setRoleChangeConfirmation] = useState("");

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

    const refreshUsers = async (page = 1, overrides?: { role?: string, course?: string, search?: string }) => {
        setIsLoadingPage(true);
        try {
            const offset = (page - 1) * usersPerPage;
            // Use overrides if provided, otherwise current state
            const roleIdx = overrides?.role !== undefined ? overrides.role : roleFilter;
            const courseIdx = overrides?.course !== undefined ? overrides.course : courseFilter;
            const searchIdx = overrides?.search !== undefined ? overrides.search : searchQuery;

            const { users: newUsers, total } = await getAllUsersAction({
                limit: usersPerPage,
                offset,
                role: roleIdx !== "all" ? roleIdx as any : undefined,
                courseId: courseIdx !== "all" ? courseIdx : undefined,
                search: searchIdx || undefined
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

    const onFilterChange = (type: 'role' | 'course' | 'search', value: string) => {
        if (type === 'role') setRoleFilter(value);
        if (type === 'course') setCourseFilter(value);
        if (type === 'search') setSearchQuery(value);

        startTransition(() => {
            refreshUsers(1, {
                role: type === 'role' ? value : undefined,
                course: type === 'course' ? value : undefined,
                search: type === 'search' ? value : undefined
            });
        });
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

    const handleToggleBan = async (userId: string, currentBanned: boolean) => {
        startTransition(async () => {
            try {
                await toggleUserBanAction(userId, !currentBanned);

                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, banned: !currentBanned } : u
                ));

                toast.success(!currentBanned ? "Usuario baneado" : "Usuario desbaneado", {
                    description: `El usuario ha sido ${!currentBanned ? 'baneado' : 'desbaneado'} exitosamente`
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

    const handleExportExcel = () => {
        if (!selectedUser || !fullUserDetails) return;

        const wb = XLSX.utils.book_new();

        // Sheet 1: General Info
        const infoData = [
            ["ID", selectedUser.id],
            ["Nombre", formatName(selectedUser.name, selectedUser.profile)],
            ["Email", selectedUser.email],
            ["Rol", selectedUser.role],
            ["Fecha Registro", format(new Date(selectedUser.createdAt), "dd/MM/yyyy")]
        ];
        // Add profile info if exists
        if (selectedUser.profile) {
            infoData.push(["Identificación", selectedUser.profile.identificacion || "-"]);
            infoData.push(["Teléfono", selectedUser.profile.telefono || "-"]);
        }

        const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, wsInfo, "Información General");

        // Sheet 2: Cursos
        if (fullUserDetails.enrollments?.length > 0) {
            const courseData = fullUserDetails.enrollments.map((e: any) => ({
                Curso: e.course.title,
                FechaInscripcion: format(new Date(e.createdAt), "dd/MM/yyyy"),
                Estado: e.status
            }));
            const wsCourses = XLSX.utils.json_to_sheet(courseData);
            XLSX.utils.book_append_sheet(wb, wsCourses, "Cursos");
        }

        // Sheet 3: Asistencia
        if (fullUserDetails.attendances?.length > 0) {
            const attendanceData = fullUserDetails.attendances.map((a: any) => ({
                Fecha: format(new Date(a.date), "dd/MM/yyyy HH:mm"),
                Curso: a.course?.title || "N/A",
                Estado: a.status,
                Justificacion: a.justification || "-"
            }));
            const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
            XLSX.utils.book_append_sheet(wb, wsAttendance, "Asistencia");
        }

        XLSX.writeFile(wb, `reporte_${formatName(selectedUser.name, selectedUser.profile).replace(/\s+/g, '_')}.xlsx`);
        toast.success("Excel generado correctamente");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-muted-foreground">
                        Administra todos los usuarios del sistema
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <Badge variant="outline" className="text-sm">
                        <UsersIcon className="mr-2 h-3 w-3" />
                        {currentTotal} usuarios totales
                    </Badge>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Crear Usuario
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>Busca y filtra usuarios</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o email..."
                                value={searchQuery}
                                onChange={(e) => onFilterChange('search', e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={(val) => onFilterChange('role', val)}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los roles</SelectItem>
                                <SelectItem value="admin">Administradores</SelectItem>
                                <SelectItem value="teacher">Profesores</SelectItem>
                                <SelectItem value="student">Estudiantes</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={courseFilter} onValueChange={(val) => onFilterChange('course', val)}>
                            <SelectTrigger className="w-full md:w-[250px]">
                                <SelectValue placeholder="Filtrar por curso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los cursos</SelectItem>
                                {coursesList.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios ({users.length})</CardTitle>
                    <CardDescription>
                        Lista de todos los usuarios registrados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full overflow-x-auto rounded-md border">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead className="hidden lg:table-cell">Estado</TableHead>
                                    <TableHead className="hidden xl:table-cell">Estadísticas</TableHead>
                                    <TableHead className="hidden sm:table-cell">Fecha Registro</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No se encontraron usuarios
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        src={user.image}
                                                        alt={formatName(user.name, user.profile)}
                                                        fallbackText={formatName(user.name, user.profile)}
                                                        size="sm"
                                                    />
                                                    <div>
                                                        <div className="font-medium">{formatName(user.name, user.profile)}</div>
                                                        {user.profile && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {user.profile.identificacion}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={user.role || "student"}
                                                    onValueChange={(value) => handleRoleChange(user.id, value as any)}
                                                    disabled={isPending}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <Badge variant={getRoleBadgeVariant(user.role)}>
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
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={!user.banned}
                                                        onCheckedChange={() => handleToggleBan(user.id, user.banned || false)}
                                                        disabled={isPending}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {user.banned ? "Baneado" : "Activo"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                {user._count && (
                                                    <div className="text-xs space-y-1">
                                                        {user.role === "teacher" && (
                                                            <div>{user._count.coursesCreated} cursos</div>
                                                        )}
                                                        {user.role === "student" && (
                                                            <>
                                                                <div>{user._count.enrollments} inscripciones</div>
                                                                <div>{user._count.submissions} entregas</div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                                {format(new Date(user.createdAt), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        disabled={isPending}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                Mostrando {((currentPage - 1) * usersPerPage) + 1} - {Math.min(currentPage * usersPerPage, currentTotal)} de {currentTotal} usuarios
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || isLoadingPage}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Anterior</span>
                                </Button>
                                <div className="text-xs sm:text-sm whitespace-nowrap">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || isLoadingPage}
                                >
                                    <span className="hidden sm:inline">Siguiente</span>
                                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                        <div className="flex gap-2">
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
                                                                        <TableRow>
                                                                            <TableHead>Curso</TableHead>
                                                                            <TableHead>Profesor</TableHead>
                                                                            <TableHead>Fecha Inscripción</TableHead>
                                                                            <TableHead>Estado</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.enrollments.map((enrollment: any) => (
                                                                            <TableRow key={enrollment.id}>
                                                                                <TableCell className="font-medium">
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
                                                                        <TableRow>
                                                                            <TableHead>Fecha</TableHead>
                                                                            <TableHead>Curso</TableHead>
                                                                            <TableHead>Estado</TableHead>
                                                                            <TableHead>Notas</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.attendances.map((record: any) => (
                                                                            <TableRow key={record.id}>
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
                                                                        <TableRow>
                                                                            <TableHead>Actividad</TableHead>
                                                                            <TableHead>Curso</TableHead>
                                                                            <TableHead>Fecha Entrega</TableHead>
                                                                            <TableHead>Calificación</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {fullUserDetails.submissions.map((sub: any) => (
                                                                            <TableRow key={sub.id}>
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
            </Dialog >
        </div >
    );
}

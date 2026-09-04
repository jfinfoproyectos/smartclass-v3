"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function verifyTeacherOrAdmin(courseId?: string) {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;

    if (!session || (role !== "teacher" && role !== "admin")) {
        throw new Error("No autorizado");
    }

    if (courseId && role !== "admin") {
        const course = await prisma.course.findFirst({
            where: { id: courseId, teacherId: session.user.id }
        });
        if (!course) {
            throw new Error("No tienes permisos sobre este curso");
        }
    }

    return { session, user, role };
}

export async function getCourseStudentGroupsAction(courseId: string) {
    await verifyTeacherOrAdmin(courseId);

    const groups = await prisma.studentGroup.findMany({
        where: { 
            courseId,
            activityId: null 
        },
        orderBy: { createdAt: "asc" },
        include: {
            leader: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    profile: {
                        select: {
                            identificacion: true,
                            nombres: true,
                            apellido: true,
                            telefono: true,
                        }
                    }
                }
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            profile: {
                                select: {
                                    identificacion: true,
                                    nombres: true,
                                    apellido: true,
                                    telefono: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "asc"
                }
            }
        }
    });

    return groups;
}

export async function createStudentGroupAction({
    courseId,
    name,
    description,
    memberIds,
    leaderId
}: {
    courseId: string;
    name: string;
    description?: string;
    memberIds: string[];
    leaderId?: string | null;
}) {
    await verifyTeacherOrAdmin(courseId);

    if (!name || name.trim().length === 0) {
        throw new Error("El nombre del grupo es requerido");
    }

    // Asegurar que el líder esté dentro de memberIds si se seleccionó uno
    const finalMemberIds = Array.from(new Set(memberIds));
    if (leaderId && !finalMemberIds.includes(leaderId)) {
        finalMemberIds.push(leaderId);
    }

    const group = await prisma.studentGroup.create({
        data: {
            courseId,
            name: name.trim(),
            description: description?.trim() || null,
            leaderId: leaderId || null,
            members: {
                create: finalMemberIds.map(userId => ({
                    userId,
                    isLeader: userId === leaderId
                }))
            }
        },
        include: {
            leader: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    profile: {
                        select: {
                            identificacion: true,
                            nombres: true,
                            apellido: true,
                            telefono: true,
                        }
                    }
                }
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            profile: {
                                select: {
                                    identificacion: true,
                                    nombres: true,
                                    apellido: true,
                                    telefono: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true, group };
}

export async function updateStudentGroupAction({
    groupId,
    courseId,
    name,
    description,
    memberIds,
    leaderId
}: {
    groupId: string;
    courseId: string;
    name: string;
    description?: string;
    memberIds: string[];
    leaderId?: string | null;
}) {
    await verifyTeacherOrAdmin(courseId);

    if (!name || name.trim().length === 0) {
        throw new Error("El nombre del grupo es requerido");
    }

    const finalMemberIds = Array.from(new Set(memberIds));
    if (leaderId && !finalMemberIds.includes(leaderId)) {
        finalMemberIds.push(leaderId);
    }

    // Ejecutar actualización en transacción
    const updated = await prisma.$transaction(async (tx) => {
        // 1. Eliminar miembros que ya no estén en finalMemberIds
        await tx.studentGroupMember.deleteMany({
            where: {
                groupId,
                userId: { notIn: finalMemberIds }
            }
        });

        // 2. Insertar o actualizar miembros
        for (const userId of finalMemberIds) {
            await tx.studentGroupMember.upsert({
                where: {
                    groupId_userId: { groupId, userId }
                },
                update: {
                    isLeader: userId === leaderId
                },
                create: {
                    groupId,
                    userId,
                    isLeader: userId === leaderId
                }
            });
        }

        // 3. Actualizar datos base del grupo
        return await tx.studentGroup.update({
            where: { id: groupId },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                leaderId: leaderId || null
            },
            include: {
                leader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        profile: {
                            select: {
                                identificacion: true,
                                nombres: true,
                                apellido: true,
                                telefono: true,
                            }
                        }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                profile: {
                                    select: {
                                        identificacion: true,
                                        nombres: true,
                                        apellido: true,
                                        telefono: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true, group: updated };
}

export async function deleteStudentGroupAction(groupId: string, courseId: string) {
    await verifyTeacherOrAdmin(courseId);

    await prisma.studentGroup.delete({
        where: { id: groupId }
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true };
}

export async function setGroupLeaderAction(groupId: string, courseId: string, leaderId: string | null) {
    await verifyTeacherOrAdmin(courseId);

    await prisma.$transaction(async (tx) => {
        await tx.studentGroup.update({
            where: { id: groupId },
            data: { leaderId }
        });

        await tx.studentGroupMember.updateMany({
            where: { groupId },
            data: { isLeader: false }
        });

        if (leaderId) {
            await tx.studentGroupMember.updateMany({
                where: { groupId, userId: leaderId },
                data: { isLeader: true }
            });
        }
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true };
}

export async function saveCourseStudentGroupsAction({
    courseId,
    groups
}: {
    courseId: string;
    groups: {
        id?: string;
        name: string;
        leaderId?: string | null;
        memberIds: string[];
    }[];
}) {
    await verifyTeacherOrAdmin(courseId);

    await prisma.$transaction(async (tx) => {
        // 1. Eliminar grupos del curso que ya no existen en la lista guardada
        const keepGroupIds = groups
            .filter(g => g.id && !g.id.startsWith("temp-") && !g.id.startsWith("group-"))
            .map(g => g.id as string);

        await tx.studentGroup.deleteMany({
            where: {
                courseId,
                activityId: null,
                id: { notIn: keepGroupIds }
            }
        });

        // 2. Crear o actualizar cada grupo
        for (const g of groups) {
            const isTemp = !g.id || g.id.startsWith("temp-") || g.id.startsWith("group-");
            const cleanName = g.name.trim() || "Grupo de Trabajo";
            const memberIds = Array.from(new Set(g.memberIds));
            const leaderId = g.leaderId && memberIds.includes(g.leaderId) ? g.leaderId : (memberIds.length > 0 ? (g.leaderId || null) : null);

            if (isTemp) {
                await tx.studentGroup.create({
                    data: {
                        courseId,
                        activityId: null,
                        name: cleanName,
                        leaderId,
                        members: {
                            create: memberIds.map(uid => ({
                                userId: uid,
                                isLeader: uid === leaderId
                            }))
                        }
                    }
                });
            } else {
                await tx.studentGroup.update({
                    where: { id: g.id },
                    data: {
                        name: cleanName,
                        leaderId
                    }
                });

                await tx.studentGroupMember.deleteMany({
                    where: { groupId: g.id }
                });

                if (memberIds.length > 0) {
                    await tx.studentGroupMember.createMany({
                        data: memberIds.map(uid => ({
                            groupId: g.id!,
                            userId: uid,
                            isLeader: uid === leaderId
                        }))
                    });
                }
            }
        }
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return { success: true };
}

export async function getActivityStudentGroupsAction(activityId: string, courseId: string) {
    await verifyTeacherOrAdmin(courseId);

    const groups = await prisma.studentGroup.findMany({
        where: { activityId },
        orderBy: { createdAt: "asc" },
        include: {
            leader: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    profile: {
                        select: {
                            identificacion: true,
                            nombres: true,
                            apellido: true,
                            telefono: true,
                        }
                    }
                }
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            profile: {
                                select: {
                                    identificacion: true,
                                    nombres: true,
                                    apellido: true,
                                    telefono: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "asc"
                }
            }
        }
    });

    return groups;
}

export async function saveActivityStudentGroupsAction({
    activityId,
    courseId,
    groups
}: {
    activityId: string;
    courseId: string;
    groups: {
        id?: string;
        name: string;
        leaderId?: string | null;
        memberIds: string[];
    }[];
}) {
    await verifyTeacherOrAdmin(courseId);

    await prisma.$transaction(async (tx) => {
        // 1. Eliminar grupos de esta actividad que ya no existen en la lista guardada
        const keepGroupIds = groups
            .filter(g => g.id && !g.id.startsWith("temp-") && !g.id.startsWith("group-"))
            .map(g => g.id as string);

        await tx.studentGroup.deleteMany({
            where: {
                activityId,
                id: { notIn: keepGroupIds }
            }
        });

        // 2. Crear o actualizar cada grupo específico de la actividad
        for (const g of groups) {
            const isTemp = !g.id || g.id.startsWith("temp-") || g.id.startsWith("group-");
            const cleanName = g.name.trim() || "Equipo de Actividad";
            const memberIds = Array.from(new Set(g.memberIds));
            const leaderId = g.leaderId && memberIds.includes(g.leaderId) ? g.leaderId : (memberIds.length > 0 ? (g.leaderId || null) : null);

            if (isTemp) {
                await tx.studentGroup.create({
                    data: {
                        courseId,
                        activityId,
                        name: cleanName,
                        leaderId,
                        members: {
                            create: memberIds.map(uid => ({
                                userId: uid,
                                isLeader: uid === leaderId
                            }))
                        }
                    }
                });
            } else {
                await tx.studentGroup.update({
                    where: { id: g.id },
                    data: {
                        name: cleanName,
                        leaderId
                    }
                });

                await tx.studentGroupMember.deleteMany({
                    where: { groupId: g.id }
                });

                if (memberIds.length > 0) {
                    await tx.studentGroupMember.createMany({
                        data: memberIds.map(uid => ({
                            groupId: g.id!,
                            userId: uid,
                            isLeader: uid === leaderId
                        }))
                    });
                }
            }
        }

        // Asegurar que la actividad tenga isGroupActivity = true y groupScope = "ACTIVITY"
        await tx.activity.update({
            where: { id: activityId },
            data: {
                isGroupActivity: true,
                groupScope: "ACTIVITY",
            }
        });
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    return { success: true };
}

export async function copyCourseGroupsToActivityAction({
    activityId,
    courseId,
}: {
    activityId: string;
    courseId: string;
}) {
    await verifyTeacherOrAdmin(courseId);

    const courseGroups = await prisma.studentGroup.findMany({
        where: { courseId, activityId: null },
        include: {
            members: true,
        }
    });

    await prisma.$transaction(async (tx) => {
        // Eliminar grupos previos de la actividad
        await tx.studentGroup.deleteMany({
            where: { activityId }
        });

        // Copiar cada grupo del curso asignando activityId
        for (const cg of courseGroups) {
            await tx.studentGroup.create({
                data: {
                    courseId,
                    activityId,
                    name: cg.name,
                    description: cg.description,
                    leaderId: cg.leaderId,
                    members: {
                        create: cg.members.map(m => ({
                            userId: m.userId,
                            isLeader: m.isLeader,
                        }))
                    }
                }
            });
        }

        await tx.activity.update({
            where: { id: activityId },
            data: {
                isGroupActivity: true,
                groupScope: "ACTIVITY",
            }
        });
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}/activities/${activityId}`);
    return { success: true };
}



"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { gradeService } from "@/features/teacher/services/gradeService";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

export async function createGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    const category = await gradeService.createGradeCategory({ name, weight, courseId });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: category.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación creada: ${name}`,
        metadata: { name, weight, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return category;
}

export async function updateGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string | undefined;
    const weightStr = formData.get("weight") as string | undefined;
    const courseId = formData.get("courseId") as string;

    const category = await gradeService.updateGradeCategory(id, {
        name: name || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: category.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación actualizada: ${category.name}`,
        metadata: { name, weight: weightStr, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return category;
}

export async function deleteGradeCategoryAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.deleteGradeCategory(id);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Categoría de calificación eliminada`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function createGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;
    const categoryId = formData.get("categoryId") as string || undefined;

    const group = await gradeService.createGradeGroup({ name, weight, courseId, categoryId });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "CREATE",
        entity: "OTHER",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación creado: ${name}`,
        metadata: { name, weight, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return group;
}

export async function updateGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string | undefined;
    const weightStr = formData.get("weight") as string | undefined;
    const courseId = formData.get("courseId") as string;

    const group = await gradeService.updateGradeGroup(id, {
        name: name || undefined,
        weight: weightStr ? parseFloat(weightStr) : undefined,
    });

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "UPDATE",
        entity: "OTHER",
        entityId: group.id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación actualizado: ${group.name}`,
        metadata: { name, weight: weightStr, courseId },
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return group;
}

export async function deleteGradeGroupAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("id") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.deleteGradeGroup(id);

    // 🎯 AUDIT LOG
    const { auditLogger } = await import("@/features/admin/services/auditLogger");
    await auditLogger.log({
        action: "DELETE",
        entity: "OTHER",
        entityId: id,
        userId: session.user.id,
        userName: session.user.name || "Profesor",
        userRole: session.user.role,
        description: `Grupo de calificación eliminado`,
        success: true,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function addGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const groupId = formData.get("groupId") as string;
    const activityId = formData.get("activityId") as string | undefined;
    const evaluationAttemptId = formData.get("evaluationAttemptId") as string | undefined;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    const item = await gradeService.addItemToGradeGroup({
        groupId,
        activityId: activityId || undefined,
        evaluationAttemptId: evaluationAttemptId || undefined,
        weight,
    });

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
    return item;
}

export async function removeGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("itemId") as string;
    const courseId = formData.get("courseId") as string;

    await gradeService.removeItemFromGradeGroup(id);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function updateGradeGroupItemAction(formData: FormData) {
    const session = await getSession();
    if (!session || session.user.role !== "teacher") {
        throw new Error("Unauthorized");
    }

    const id = formData.get("itemId") as string;
    const weight = parseFloat(formData.get("weight") as string);
    const courseId = formData.get("courseId") as string;

    await gradeService.updateGradeGroupItem(id, weight);

    revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

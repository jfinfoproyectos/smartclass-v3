"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { generateText } from "ai";
import { getAIModel } from "@/features/teacher/services/ai/client";

/**
 * Consulta al Tutor IA sobre el contenido de la documentación.
 */
export async function askAiTutorAction(projectId: string, pageId: string, question: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Debes iniciar sesión para usar el Tutor IA.");

  // 1. Obtener configuración del proyecto y página
  const project = await prisma.docProject.findFirst({
    where: { OR: [{ id: projectId }, { slug: projectId }] },
    select: {
      id: true,
      name: true,
      description: true,
      teacherId: true,
      isPublic: true
    }
  });

  if (!project) throw new Error("Proyecto no encontrado.");

  const currentPage = await prisma.docPage.findUnique({
    where: { id: pageId },
    select: { title: true, content: true }
  });

  if (!currentPage) throw new Error("No se pudo identificar la página actual de la documentación.");

  console.log(`[AI Tutor] Query for project: ${project.name}, page: ${currentPage.title}`);

  // 1.5 Obtener curso activo del estudiante para este proyecto
  let course = await prisma.course.findFirst({
    where: {
      docLinks: { some: { docProjectId: project.id } },
      enrollments: { some: { userId: session.user.id, status: "APPROVED" } }
    }
  });

  const isAdmin = session.user.role === "admin" || session.user.role === "teacher";

  // Check course association
  const linkedCoursesCount = await prisma.courseDocProject.count({
    where: { docProjectId: project.id }
  });

  if (linkedCoursesCount > 0) {
    if (!isAdmin && !course) {
      throw new Error("No tienes acceso a esta documentación.");
    }
  } else if (!project.isPublic && !isAdmin) {
    throw new Error("No tienes acceso a esta documentación.");
  }

  // Fallback al primer curso si no hay inscripción activa
  if (!course) {
    course = await prisma.course.findFirst({
      where: { docLinks: { some: { docProjectId: project.id } } }
    });
  }

  if (!course) throw new Error("No hay un curso vinculado a este proyecto.");
  // El Tutor IA está activo de forma permanente sin límites de consultas por hora.

  // 3. Preparar contexto mejorado
  const context = `
INFORMACIÓN DEL PROYECTO:
Nombre: ${project.name}
Descripción: ${project.description || "N/A"}

PÁGINA QUE EL ESTUDIANTE ESTÁ LEYENDO AHORA:
Título: ${currentPage.title}
CONTENIDO DEL DOCUMENTO:
---
${currentPage.content || "El documento está vacío."}
---
`;

  // 4. Generar respuesta
  const model = await getAIModel(project.teacherId || session.user.id);

  const systemPrompt = `Eres el "Tutor SmartClass", un asistente experto integrado en la documentación técnica de "${project.name}".
Tu misión es resolver las dudas del estudiante basándote EXCLUSIVAMENTE en el "CONTENIDO DEL DOCUMENTO" proporcionado abajo.

INSTRUCCIONES CRÍTICAS:
1. Tu respuesta debe provenir directamente de la información del documento actual.
2. Si el estudiante pregunta algo que no está en el contenido proporcionado, responde: "Lo siento, esa información no se encuentra en esta sección de la documentación. Te recomiendo consultarlo con tu profesor."
3. Usa Markdown para que la respuesta sea legible (negritas, listas, bloques de código).
4. Mantén un tono profesional, amable y pedagógico.
5. No menciones que eres una IA o que tienes un "contexto"; simplemente actúa como el tutor de la plataforma.

CONOCIMIENTO ACTUAL (CONTENIDO DEL DOCUMENTO):
${context}`;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `CONOCIMIENTO ACTUAL (DOCUMENTO):
---
${currentPage.content || "Vacio"}
---

PREGUNTA DEL ESTUDIANTE:
${question}`,
    });

    // 5. Registrar la consulta
    await prisma.docAiChat.create({
      data: {
        userId: session.user.id,
        docProjectId: project.id,
        question: question,
        answer: text,
      }
    });

    return { success: true, answer: text };
  } catch (error) {
    console.error("Error in AI Tutor:", error);
    throw new Error("Lo siento, hubo un error al procesar tu pregunta con la IA.");
  }
}

/**
 * Obtiene la cantidad de preguntas realizadas por el usuario en la última hora.
 */
export async function getAiUsageAction(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { used: 0 };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const used = await prisma.docAiChat.count({
    where: {
      userId: session.user.id,
      docProjectId: projectId,
      createdAt: { gte: oneHourAgo }
    }
  });

  return { used };
}


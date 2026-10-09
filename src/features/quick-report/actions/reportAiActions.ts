"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateAiReport } from "../services/reportAiService";
import type { GenerateReportPayload, GeneratedReport } from "../types";

export async function generateReportAction(
  payload: GenerateReportPayload
): Promise<{ success: boolean; data?: GeneratedReport; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, error: "No autorizado. Inicia sesión como docente." };
    }

    const user = session.user as any;
    const role = Array.isArray(user?.roles) ? user?.roles[0] : user?.role;
    if (role !== "teacher" && role !== "admin") {
      return { success: false, error: "Esta herramienta está reservada para profesores y administradores." };
    }

    if (!payload.quickNotes?.trim() && !payload.audioBase64 && !payload.audioUrl) {
      return {
        success: false,
        error: "Por favor proporciona algunas notas rápidas, dicta por voz o sube un archivo de audio.",
      };
    }

    const report = await generateAiReport(payload, session.user.id);
    return { success: true, data: report };
  } catch (error: any) {
    console.error("[reportAiActions] Error generating report:", error);
    return {
      success: false,
      error: error?.message || "Ocurrió un error inesperado al generar el informe con IA.",
    };
  }
}

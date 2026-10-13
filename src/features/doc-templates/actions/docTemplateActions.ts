"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { 
    docxTemplateService, 
    TemplateVariable 
} from "../services/docxTemplateService";

async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

/**
 * OPCIÓN A: Analiza con IA el texto de un documento Word y detecta automáticamente
 * las variables editables recomendadas, sus tipos y ocurrencias.
 */
export async function analyzeDocxVariablesAction(
    plainText: string,
    documentTypeHint?: string
): Promise<TemplateVariable[]> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    if (!plainText || !plainText.trim()) {
        throw new Error("El documento no contiene texto legible para analizar.");
    }

    return await docxTemplateService.analyzeDocumentForVariables(
        plainText,
        documentTypeHint,
        session.user.id
    );
}

/**
 * COPILOTO IA: Diligencia automáticamente los valores de las variables a partir de un relato
 * o resumen libre del nuevo caso específico.
 */
export async function fillVariablesFromCaseAction(
    caseDescription: string,
    variables: TemplateVariable[]
): Promise<Record<string, string>> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    if (!caseDescription || !caseDescription.trim()) {
        throw new Error("Ingresa la descripción o relato del caso para diligenciar el formato.");
    }

    if (!variables || variables.length === 0) {
        throw new Error("No hay variables definidas en la plantilla para diligenciar.");
    }

    return await docxTemplateService.fillVariablesFromCaseDescription(
        caseDescription,
        variables,
        session.user.id
    );
}

/**
 * CORRECCIÓN Y REDACCIÓN CON IA: Pule o redacta un párrafo narrativo
 * según el estilo o prompt seleccionado (jurídico, administrativo, etc.).
 */
export async function refineNarrativeParagraphAction(params: {
    rawText: string;
    systemInstruction?: string;
    customGuideline?: string;
    variableLabel?: string;
    originalSampleText?: string;
}): Promise<string> {
    const session = await getSession();
    if (!session) {
        throw new Error("Sesión requerida.");
    }
    const userRole = (session.user as any)?.role;
    if (userRole !== "teacher" && userRole !== "admin") {
        throw new Error("Acceso no autorizado.");
    }

    if (!params.rawText || !params.rawText.trim()) {
        throw new Error("Escribe algún borrador, hechos o notas para que la IA pueda redactar el párrafo.");
    }

    return await docxTemplateService.refineNarrativeParagraph({
        ...params,
        userId: session.user.id
    });
}


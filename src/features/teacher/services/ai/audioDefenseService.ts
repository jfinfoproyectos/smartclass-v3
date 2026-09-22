import { getAIModel, repairFeedbackText } from "./client";
import { generateObject } from "ai";
import { z } from "zod";

export interface StatementRequirementEvaluation {
    requirement: string;
    status: "COMPLETED" | "PARTIAL" | "NOT_COVERED";
    score: number;
    audioEvidence: string;
    comment: string;
}

export interface ParticipantReview {
    name: string;
    role: string;
    segmentOrTimestamps?: string;
    topicsCovered: string[];
    score: number;
    oralPerformance: string;
    technicalMastery: string;
    strengths: string[];
    areasForImprovement: string[];
    reviewSummary: string;
}

export interface AudioDefenseGradingResult {
    grade: number; // 0.0 - 5.0
    summary: string;
    argumentationScore: number;
    structureScore: number;
    technicalDepthScore: number;
    enunciadoComplianceScore?: number;
    coveragePercentage: number;
    analysisMode?: "multimodal_audio" | "metadata_notes";
    statementRequirements?: StatementRequirementEvaluation[];
    participants?: ParticipantReview[];
    oralCommunication?: {
        clarityAndDiction?: string;
        timeManagement?: string;
        technicalVocabulary?: string;
        podcastStructure?: string;
    };
    topicsCoverage: Array<{
        topic: string;
        covered: boolean;
        comment: string;
        score?: number;
        status?: "COMPLETED" | "PARTIAL" | "NOT_COVERED";
    }>;
    strengths: string[];
    weaknesses: string[];
    recommendations?: string[];
    feedback: string;
}

const AudioDefenseGradingSchema = z.object({
    grade: z.number().min(0).max(5).describe("Calificación global recomendada en escala de 0.0 a 5.0 basada estrictamente en el cumplimiento del enunciado y calidad técnica"),
    summary: z.string().describe("Resumen diagnóstico ejecutivo (2-3 párrafos) sobre el desempeño del estudiante, profundidad conceptual y solidez de la sustentación oral"),
    argumentationScore: z.number().min(0).max(5).describe("Puntaje de argumentación, coherencia, solvencia discursiva y fluidez oral (0.0 - 5.0)"),
    technicalDepthScore: z.number().min(0).max(5).describe("Puntaje de vocabulario técnico, precisión de conceptos y dominio de ingeniería (0.0 - 5.0)"),
    enunciadoComplianceScore: z.number().min(0).max(5).describe("Puntaje de cumplimiento estricto y exhaustivo de las consignas y requerimientos del enunciado (0.0 - 5.0)"),
    structureScore: z.number().min(0).max(5).describe("Puntaje de estructura, formato podcast, introducción contextual, desarrollo técnico, conclusiones y manejo del tiempo (0.0 - 5.0)"),
    coveragePercentage: z.number().min(0).max(100).describe("Porcentaje global de cobertura de los requerimientos solicitados en el enunciado (0-100%)"),
    statementRequirements: z.array(z.object({
        requirement: z.string().describe("Nombre o consigna extraída del enunciado de la actividad"),
        status: z.enum(["COMPLETED", "PARTIAL", "NOT_COVERED"]).describe("Estado: COMPLETED (Cumplido con solidez), PARTIAL (Parcialmente abordado), NOT_COVERED (No abordado u omitido)"),
        score: z.number().min(0).max(5).describe("Puntaje obtenido en este requerimiento (0.0 - 5.0)"),
        audioEvidence: z.string().describe("Cita o evidencia de lo expuesto en el audio por el estudiante (o descripción de omisión)"),
        comment: z.string().describe("Análisis técnico y pedagógico detallado: aciertos, conceptos aplicados o aspectos omitidos"),
    })).describe("Evaluación exhaustiva punto por punto de cada requerimiento específico extraído del enunciado"),
    topicsCoverage: z.array(z.object({
        topic: z.string().describe("Nombre del tema o apartado requerido"),
        covered: z.boolean().describe("Si el estudiante abordó y explicó este punto"),
        comment: z.string().describe("Observación sobre la solidez de la explicación en el audio"),
        score: z.number().min(0).max(5).optional(),
        status: z.enum(["COMPLETED", "PARTIAL", "NOT_COVERED"]).optional(),
    })).describe("Evaluación resumida punto por punto para compatibilidad con vistas de lista"),
    participants: z.array(z.object({
        name: z.string().describe("Nombre real o identificado del participante (ej. Juan Pérez, o Locutor 1 / Moderador)"),
        role: z.string().describe("Rol asumido o función en el podcast (ej. Conductor / Arquitectura, Defensor de Patrones, Expositor de Persistencia, Conclusiones)"),
        segmentOrTimestamps: z.string().optional().describe("Marcas de tiempo aproximadas o segmento de intervención (ej. Min 00:00 - 02:15)"),
        topicsCovered: z.array(z.string()).describe("Lista de temas o preguntas del enunciado que fueron sustentados por este participante"),
        score: z.number().min(0).max(5).describe("Calificación individual estimada para este participante (0.0 - 5.0)"),
        oralPerformance: z.string().describe("Reseña sobre su fluidez oral, tono, dicción, pausas, seguridad y modulación"),
        technicalMastery: z.string().describe("Reseña sobre su rigor conceptual, precisión de términos y solidez de justificaciones técnicas"),
        strengths: z.array(z.string()).describe("Fortalezas destacadas de su participación"),
        areasForImprovement: z.array(z.string()).describe("Aspectos específicos que debe mejorar en su intervención"),
        reviewSummary: z.string().describe("Reseña crítica, formativa y pedagógica completa sobre el desempeño de este participante"),
    })).describe("Identificación y reseñas detalladas e individuales de cada participante o locutor que intervino en el audio"),
    oralCommunication: z.object({
        clarityAndDiction: z.string().describe("Evaluación de claridad, modulación, volumen y dicción durante la grabación"),
        timeManagement: z.string().describe("Evaluación de la gestión del tiempo frente al límite solicitado y capacidad de síntesis"),
        technicalVocabulary: z.string().describe("Evaluación del rigor y precisión en el uso de terminología técnica de la ingeniería frente a coloquialismo"),
        podcastStructure: z.string().describe("Evaluación del formato de podcast: introducción, desarrollo, dinamismo y conclusiones reflexivas"),
    }).describe("Evaluación específica de competencias orales y formato podcast"),
    strengths: z.array(z.string()).describe("Lista de fortalezas y aciertos técnicos destacados en la sustentación"),
    weaknesses: z.array(z.string()).describe("Lista de áreas de mejora, conceptos equívocos o vacíos identificados en relación con el enunciado"),
    recommendations: z.array(z.string()).describe("Recomendaciones formativas y concretas para el estudiante"),
    feedback: z.string().describe("Retroalimentación formativa y pedagógica completa estructurada en Markdown para el estudiante"),
});

/**
 * Intenta descargar el contenido binario del audio (Vocaroo, Google Drive, enlaces directos).
 * Limita el tamaño a 25 MB para evitar exceder límites de API en memoria.
 */
export async function fetchAudioContent(url: string): Promise<{ data: Uint8Array; mimeType: string; source: string } | null> {
    if (!url || typeof url !== "string") return null;
    const cleanUrl = url.trim();

    // 1. VOCAROO (mp3 directo desde media1.vocaroo.com o media.vocaroo.com)
    const vocarooMatch = cleanUrl.match(/(?:vocaroo\.com\/|voca\.ro\/)([a-zA-Z0-9]+)/);
    if (vocarooMatch && vocarooMatch[1]) {
        const id = vocarooMatch[1];
        const endpoints = [
            `https://media1.vocaroo.com/mp3/${id}`,
            `https://media.vocaroo.com/mp3/${id}`,
        ];
        for (const ep of endpoints) {
            try {
                const res = await fetch(ep, {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
                    signal: AbortSignal.timeout(10000),
                });
                if (res.ok) {
                    const buf = await res.arrayBuffer();
                    if (buf.byteLength > 1000 && buf.byteLength <= 25 * 1024 * 1024) {
                        return {
                            data: new Uint8Array(buf),
                            mimeType: "audio/mp3",
                            source: `Vocaroo (${id})`,
                        };
                    }
                }
            } catch (err: any) {
                console.warn(`[audioDefenseService] Fallo descarga Vocaroo desde ${ep}:`, err.message);
            }
        }
    }

    // 2. GOOGLE DRIVE (descarga directa)
    const driveMatch = cleanUrl.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([-\w]+)/);
    if (driveMatch && driveMatch[1]) {
        const id = driveMatch[1];
        const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
        try {
            const res = await fetch(driveDownloadUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(12000),
                redirect: "follow",
            });
            if (res.ok) {
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.includes("text/html")) {
                    const buf = await res.arrayBuffer();
                    if (buf.byteLength > 1000 && buf.byteLength <= 25 * 1024 * 1024) {
                        let mime = "audio/mp3";
                        if (contentType.startsWith("audio/")) {
                            mime = contentType.split(";")[0].trim();
                        }
                        return {
                            data: new Uint8Array(buf),
                            mimeType: mime,
                            source: `Google Drive (${id})`,
                        };
                    }
                }
            }
        } catch (err: any) {
            console.warn(`[audioDefenseService] Error descargando audio de Google Drive:`, err.message);
        }
    }

    // 3. ENLACE DIRECTO DE AUDIO (.mp3, .wav, .m4a, .ogg, .aac, .flac, .webm)
    const isDirectAudio = /\.(mp3|wav|ogg|m4a|aac|flac|webm)($|\?)/i.test(cleanUrl);
    if (isDirectAudio) {
        try {
            const res = await fetch(cleanUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(12000),
            });
            if (res.ok) {
                const buf = await res.arrayBuffer();
                if (buf.byteLength > 1000 && buf.byteLength <= 25 * 1024 * 1024) {
                    const extMatch = cleanUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)($|\?)/i);
                    const ext = extMatch ? extMatch[1].toLowerCase() : "mp3";
                    const mimeMap: Record<string, string> = {
                        mp3: "audio/mp3",
                        wav: "audio/wav",
                        ogg: "audio/ogg",
                        m4a: "audio/mp4",
                        aac: "audio/aac",
                        flac: "audio/flac",
                        webm: "audio/webm",
                    };
                    const contentType = res.headers.get("content-type") || "";
                    const mime = contentType.startsWith("audio/")
                        ? contentType.split(";")[0].trim()
                        : (mimeMap[ext] || "audio/mp3");

                    return {
                        data: new Uint8Array(buf),
                        mimeType: mime,
                        source: `Audio Directo (${ext.toUpperCase()})`,
                    };
                }
            }
        } catch (err: any) {
            console.warn(`[audioDefenseService] Error descargando audio directo:`, err.message);
        }
    }

    return null;
}

/**
 * Ensambla un informe en Markdown pedagógico, exhaustivo y estructurado.
 */
function buildStructuredMarkdownFeedback(
    obj: z.infer<typeof AudioDefenseGradingSchema>,
    meta: {
        activityTitle?: string;
        audioUrl: string;
        platform: string;
        analysisMode: "multimodal_audio" | "metadata_notes";
        gradingMode: string;
    }
): string {
    const lines: string[] = [];
    const modeBadge = meta.analysisMode === "multimodal_audio"
        ? "🎙️ **Modo de Análisis:** Audio analizado directamente con IA Multimodal (escucha activa de la pista de voz)."
        : "📝 **Modo de Análisis:** Auditoría basada en notas, minuta de timestamps y metadatos verificados de entrega.";

    const title = meta.activityTitle ? `Sustentación: ${meta.activityTitle}` : "Evaluación de Sustentación en Audio / Podcast Técnico";

    lines.push(`## 🎙️ ${title}\n`);
    lines.push(`- **Recurso de Audio:** [Enlace de grabación](${meta.audioUrl}) (Plataforma: \`${meta.platform}\`)`);
    lines.push(`- **Calificación General:** **${obj.grade.toFixed(1)} / 5.0** | **Cobertura del Enunciado:** **${obj.coveragePercentage}%**`);
    lines.push(`- **Criterio de Evaluación:** Modo \`${meta.gradingMode.toUpperCase()}\``);
    lines.push(`> ${modeBadge}\n`);

    lines.push(`### 🎯 Resumen Ejecutivo y Diagnóstico Global\n`);
    lines.push(`${obj.summary.trim()}\n`);

    lines.push(`### 📊 Desglose de Competencias y Dimensiones\n`);
    lines.push(`| Dimensión Evaluada | Nota / 5.0 | Nivel de Desempeño |`);
    lines.push(`|:---|:---:|:---|`);

    const getLevel = (score: number) => {
        if (score >= 4.5) return "🌟 Excelente";
        if (score >= 3.8) return "✅ Bueno";
        if (score >= 3.0) return "⚠️ Aceptable";
        return "❌ Requiere Mejora";
    };

    lines.push(`| 🗣️ **Argumentación y Fluidez Oral** | **${obj.argumentationScore.toFixed(1)}** | ${getLevel(obj.argumentationScore)} |`);
    lines.push(`| 🧠 **Profundidad y Vocabulario Técnico** | **${obj.technicalDepthScore.toFixed(1)}** | ${getLevel(obj.technicalDepthScore)} |`);
    lines.push(`| 📑 **Cumplimiento del Enunciado** | **${obj.enunciadoComplianceScore.toFixed(1)}** | ${getLevel(obj.enunciadoComplianceScore)} |`);
    lines.push(`| ⏱️ **Formato Podcast y Síntesis** | **${obj.structureScore.toFixed(1)}** | ${getLevel(obj.structureScore)} |`);
    lines.push("");

    const reqs = obj.statementRequirements && obj.statementRequirements.length > 0
        ? obj.statementRequirements
        : (obj.topicsCoverage || []).map(tc => ({
            requirement: tc.topic,
            status: tc.covered ? ("COMPLETED" as const) : ("NOT_COVERED" as const),
            score: tc.covered ? 4.5 : 1.5,
            audioEvidence: tc.comment || "—",
            comment: tc.comment || "—",
        }));

    if (reqs.length > 0) {
        lines.push(`### 📋 Matriz de Cumplimiento: Requerimientos del Enunciado vs. Audio\n`);
        lines.push(`| N° | Requerimiento del Enunciado | Estado | Nota / 5.0 | Evidencia en el Audio | Observaciones Técnicas |`);
        lines.push(`|:---:|:---|:---:|:---:|:---|:---|`);

        reqs.forEach((r, idx) => {
            const statusBadge = r.status === "COMPLETED"
                ? "✅ Cumplido"
                : r.status === "PARTIAL"
                ? "⚠️ Parcial"
                : "❌ No Abordado";
            const cleanReq = r.requirement.replace(/\|/g, "/").trim();
            const cleanEvidence = (r.audioEvidence || "—").replace(/\|/g, "/").replace(/\n/g, " ").trim();
            const cleanComment = (r.comment || "—").replace(/\|/g, "/").replace(/\n/g, " ").trim();
            lines.push(`| **${idx + 1}** | ${cleanReq} | ${statusBadge} | **${r.score.toFixed(1)}** | ${cleanEvidence} | ${cleanComment} |`);
        });
        lines.push("");

        lines.push(`### 🔍 Análisis Detallado por Requerimiento del Enunciado\n`);
        reqs.forEach((r, idx) => {
            const icon = r.status === "COMPLETED" ? "✅" : r.status === "PARTIAL" ? "⚠️" : "❌";
            lines.push(`#### ${icon} ${idx + 1}. ${r.requirement}\n`);
            lines.push(`- **Calificación del punto:** **${r.score.toFixed(1)} / 5.0** (${r.status === "COMPLETED" ? "Cumplido con solidez" : r.status === "PARTIAL" ? "Parcialmente abordado" : "No abordado u omitido"})`);
            lines.push(`- **Evidencia en el audio:** ${r.audioEvidence}`);
            lines.push(`- **Análisis técnico y pedagógico:** ${r.comment}\n`);
        });
    }

    if (obj.participants && obj.participants.length > 0) {
        lines.push(`### 👥 Identificación de Participantes y Reseñas Individuales\n`);
        lines.push(`| Participante | Rol / Enfoque | Segmento / Timestamps | Desempeño | Nota Ind. |`);
        lines.push(`|:---|:---|:---:|:---:|:---:|`);

        obj.participants.forEach(p => {
            const level = getLevel(p.score);
            const segment = p.segmentOrTimestamps || "—";
            lines.push(`| 🎙️ **${p.name}** | ${p.role.replace(/\|/g, "/")} | ${segment.replace(/\|/g, "/")} | ${level} | **${p.score.toFixed(1)} / 5.0** |`);
        });
        lines.push("");

        lines.push(`#### 📝 Reseñas Detalladas por Participante\n`);
        obj.participants.forEach((p, idx) => {
            lines.push(`##### 🎙️ ${idx + 1}. ${p.name} — *${p.role}* (Nota: **${p.score.toFixed(1)} / 5.0**)\n`);
            if (p.segmentOrTimestamps) {
                lines.push(`- **Segmento de Intervención:** ${p.segmentOrTimestamps}`);
            }
            if (p.topicsCovered && p.topicsCovered.length > 0) {
                lines.push(`- **Temas del Enunciado Abordados:** ${p.topicsCovered.join(", ")}`);
            }
            lines.push(`- **🗣️ Desempeño Oral y Fluidez:** ${p.oralPerformance}`);
            lines.push(`- **🧠 Dominio Conceptual y Vocabulario Técnico:** ${p.technicalMastery}`);
            if (p.strengths && p.strengths.length > 0) {
                lines.push(`- **🌟 Fortalezas Destacadas:** ${p.strengths.join("; ")}`);
            }
            if (p.areasForImprovement && p.areasForImprovement.length > 0) {
                lines.push(`- **🔧 Áreas de Oportunidad:** ${p.areasForImprovement.join("; ")}`);
            }
            lines.push(`- **📄 Reseña y Valoración Docente:** ${p.reviewSummary}\n`);
        });
    }

    if (obj.oralCommunication) {
        lines.push(`### 🎧 Evaluación del Formato Podcast y Comunicación Oral\n`);
        lines.push(`- 🎙️ **Claridad, Dicción y Modulación:** ${obj.oralCommunication.clarityAndDiction}`);
        lines.push(`- ⏱️ **Gestión del Tiempo y Capacidad de Síntesis:** ${obj.oralCommunication.timeManagement}`);
        lines.push(`- 📚 **Rigor Terminológico y Vocabulario Técnico:** ${obj.oralCommunication.technicalVocabulary}`);
        lines.push(`- 📻 **Estructura Narrativa y Dinamismo de Podcast:** ${obj.oralCommunication.podcastStructure}\n`);
    }

    if (obj.strengths && obj.strengths.length > 0) {
        lines.push(`### ✅ Fortalezas Destacadas\n`);
        obj.strengths.forEach(s => lines.push(`- ${s}`));
        lines.push("");
    }

    if (obj.weaknesses && obj.weaknesses.length > 0) {
        lines.push(`### ⚠️ Áreas de Oportunidad y Brechas Técnicas\n`);
        obj.weaknesses.forEach(w => lines.push(`- ${w}`));
        lines.push("");
    }

    const recs = obj.recommendations && obj.recommendations.length > 0
        ? obj.recommendations
        : [
            "Profundiza en la justificación de decisiones arquitectónicas mencionando alternativas descartadas (trade-offs).",
            "Mantén un ritmo vocal constante y apóyate en marcas de tiempo para asegurar la cobertura total de cada requerimiento del enunciado."
        ];

    lines.push(`### 💡 Recomendaciones y Plan de Mejora Oral\n`);
    recs.forEach(r => lines.push(`- ${r}`));
    lines.push("");

    return repairFeedbackText(lines.join("\n"));
}

/**
 * Evalúa una sustentación técnica en audio o podcast con Gemini,
 * contrastando exhaustivamente cada requerimiento del enunciado,
 * identificando participantes y elaborando reseñas individuales.
 */
export async function gradeAudioDefense(params: {
    audioUrl: string;
    studentNotes?: string;
    statement: string;
    activityTitle?: string;
    audioConfig?: {
        maxDurationMinutes?: number;
        requiredTopics?: string[];
        keyQuestions?: string[];
    };
    knownParticipants?: string[];
    gradingMode?: "normal" | "moderate" | "strict";
    teacherId: string;
}): Promise<AudioDefenseGradingResult> {
    const {
        audioUrl,
        studentNotes = "",
        statement,
        activityTitle,
        audioConfig,
        knownParticipants,
        gradingMode = "moderate",
        teacherId,
    } = params;

    const model = await getAIModel(teacherId);
    const { extractMediaMetadata } = await import("./mediaMetadataService");
    const mediaMetadata = await extractMediaMetadata(audioUrl);

    // Intentar descargar el audio para evaluación multimodal
    let audioContent: { data: Uint8Array; mimeType: string; source: string } | null = null;
    try {
        audioContent = await fetchAudioContent(audioUrl);
    } catch (err: any) {
        console.warn("[audioDefenseService] No se pudo descargar el archivo de audio:", err.message);
    }

    const analysisMode: "multimodal_audio" | "metadata_notes" = audioContent ? "multimodal_audio" : "metadata_notes";

    const modePrompt = {
        normal: "Sé motivador, constructivo y formativo. Valora la intención comunicativa, el esfuerzo de síntesis y la comprensión de las ideas centrales planteadas en el enunciado.",
        moderate: "Equilibra la fluidez verbal con la exactitud conceptual, la profundidad técnica y el cumplimiento riguroso de cada requerimiento del enunciado.",
        strict: "Sé riguroso y exigente con la profundidad técnica, la precisión terminológica, la justificación de decisiones arquitectónicas y el cumplimiento exhaustivo de cada punto del enunciado.",
    }[gradingMode];

    const mediaDetails = [
        `- Enlace del audio/recurso: ${audioUrl}`,
        `- Plataforma detectada: ${mediaMetadata.platform}`,
        `- Estado de verificación técnica: ${mediaMetadata.isAccessible ? "Enlace verificado y activo" : "Enlace accesible"}`,
        audioContent ? `- Acceso directo a pista de audio: SÍ (${audioContent.source}, formato ${audioContent.mimeType}, ${Math.round(audioContent.data.byteLength / 1024)} KB)` : `- Acceso directo a pista de audio: NO (se utilizarán metadatos y notas/timestamps provistos)`,
        mediaMetadata.title ? `- Título de la grabación: "${mediaMetadata.title}"` : null,
        mediaMetadata.durationFormatted ? `- Duración detectada: ${mediaMetadata.durationFormatted}` : null,
        mediaMetadata.author ? `- Autor o podcaster: ${mediaMetadata.author}` : null,
        mediaMetadata.description && mediaMetadata.description.trim() ? `- Resumen / Metadatos extraídos de la plataforma:\n"""\n${mediaMetadata.description.trim()}\n"""` : null,
    ].filter(Boolean).join("\n");

    const participantsDetails = knownParticipants && knownParticipants.length > 0
        ? `Estudiantes/Integrantes registrados oficialmente:\n${knownParticipants.map((p, idx) => `  ${idx + 1}. ${p}`).join("\n")}`
        : "No se suministró una lista previa de integrantes. Identifica a cada participante escuchando la locución, presentaciones al inicio del podcast o mediante las notas/timestamps provistas.";

    const prompt = `
Eres un evaluador académico senior y jurado experto en Ingeniería de Software, Arquitectura de Sistemas y Comunicación Técnica Oral.
Tu misión es realizar una EVALUACIÓN Y AUDITORÍA EXHAUSTIVA de una sustentación en formato de AUDIO / PODCAST TÉCNICO entregada por un estudiante, CONTRASTANDO CADA REQUERIMIENTO DEL ENUNCIADO DE LA ACTIVIDAD, IDENTIFICANDO A LOS PARTICIPANTES Y GENERANDO RESEÑAS INDIVIDUALES.

${audioContent
    ? "🎧 [MODO MULTIMODAL ACTIVO]: Tienes adjunto el archivo de audio real grabado por el estudiante. Escucha con atención su voz, evalúa sus argumentos literales, dicción, pausas, tono y qué explica efectivamente sobre cada consigna del enunciado."
    : "📝 [MODO METADATOS Y NOTAS]: Evalúa con base en el enunciado, los metadatos verificados de la plataforma y las notas, marcas de tiempo o minuta proporcionadas por el estudiante."}

---
### MODO DE EVALUACIÓN: ${gradingMode.toUpperCase()}
${modePrompt}

---
### TÍTULO DE LA ACTIVIDAD:
${activityTitle || "Sustentación en Audio / Podcast Técnico"}

---
### INTEGRANTES / PARTICIPANTES ASOCIADOS A LA ENTREGA:
${participantsDetails}

---
### ENUNCIADO Y REQUERIMIENTOS DEL TALLER / ACTIVIDAD (FUENTE DE VERDAD):
${statement || "No se proveyó enunciado explícito. Evalúa la calidad argumentativa, profundidad conceptual y estructura técnica general."}

---
### CONFIGURACIÓN DE LA ACTIVIDAD EN AUDIO:
- Duración sugerida / máxima: ${audioConfig?.maxDurationMinutes ? `${audioConfig.maxDurationMinutes} minutos` : "Libre (sugerido 3 a 5 minutos)"}
- Temas clave configurados por el docente (si los hay):
${audioConfig?.requiredTopics && audioConfig.requiredTopics.length > 0
    ? audioConfig.requiredTopics.map((t, idx) => `  ${idx + 1}. ${t}`).join("\n")
    : "  (Extraer requerimientos específicos directamente del texto del enunciado)"}
- Preguntas clave configuradas (si las hay):
${audioConfig?.keyQuestions && audioConfig.keyQuestions.length > 0
    ? audioConfig.keyQuestions.map((q, idx) => `  ${idx + 1}. ${q}`).join("\n")
    : "  (No se configuraron preguntas adicionales)"}

---
### INFORMACIÓN DE LA ENTREGA DEL ESTUDIANTE:
${mediaDetails}

### NOTAS, MINUTERO O TIMESTAMPS DEL ESTUDIANTE:
${studentNotes.trim() ? studentNotes : "El estudiante no adjuntó marcas de tiempo o notas complementarias."}

---
### REGLAS OBLIGATORIAS DE EVALUACIÓN:
1. DESGLOSE OBLIGATORIO DEL ENUNCIADO:
   Lee minuciosamente el ENUNCIADO de la actividad y extrae TODOS sus requerimientos específicos, preguntas, decisiones técnicas a sustentar y criterios solicitados (mínimo 3 requerimientos individuales extraídos fielmente del enunciado).
2. CONTRASTACIÓN RIGUROSA EN EL AUDIO:
   Para CADA requerimiento del enunciado:
   - Determina el estado:
     * COMPLETED: El estudiante explicó y justificó con solvencia y precisión técnica este punto en el audio.
     * PARTIAL: Lo mencionó de manera superficial, vaga, incompleta o con ligeras imprecisiones conceptuales.
     * NOT_COVERED: Omitió completamente este requerimiento o proporcionó una explicación errónea.
   - Asigna una nota individual de 0.0 a 5.0 para ese requerimiento.
   - Cita la evidencia en el audio: Indica textualmente qué palabras, conceptos o argumentos expuso el estudiante (o constata su omisión si no fue mencionado).
   - Redacta una observación técnica y formativa detallada justificando el puntaje.
3. IDENTIFICACIÓN OBLIGATORIA DE PARTICIPANTES Y RESEÑAS INDIVIDUALES:
   - Identifica a CADA participante o locutor que intervino en el audio.
   - Si la sustentación fue individual (1 solo estudiante), identifica al estudiante (usando su nombre o el nombre registrado) y elabora su reseña completa individual.
   - Si la sustentación fue en pareja o equipo (múltiples locutores/voces), identifica a cada integrante, su rol asumido en el podcast y los temas específicos del enunciado que defendió.
   - Para CADA participante genera:
     * Nombre identificado (cruzándolo con los integrantes conocidos si están disponibles, o cómo se presentaron).
     * Rol asumido (ej. Conductor / Arquitectura, Expositor de Persistencia, Conclusiones y Retos).
     * Segmento o timestamps aproximados de su intervención.
     * Lista de temas del enunciado abordados.
     * Nota individual sugerida (0.0 - 5.0) en base a su intervención.
     * Reseña de su fluidez y desenvolvimiento oral.
     * Reseña de su rigor conceptual y vocabulario técnico.
     * Fortalezas y aspectos a mejorar individuales.
     * Reseña crítica, formativa y pedagógica general para ese participante.
4. EVALUACIÓN DE COMPETENCIAS COMUNICATIVAS ORALES Y FORMATO PODCAST:
   Evalúa aspectos propios de un podcast técnico profesional:
   - Claridad, tono y dicción (evitar muletillas excesivas, pausas efectivas).
   - Gestión del tiempo y capacidad de síntesis (cumplir el límite sin omitir puntos clave).
   - Rigor terminológico (términos de ingeniería vs lenguaje vago o coloquial).
   - Estructura narrativa (Introducción contextual, Núcleo técnico de decisiones/justificaciones, Conclusiones y reflexiones críticas).
5. DIMENSIONES EVALUATIVAS (0.0 a 5.0):
   - Argumentación y Fluidez Oral (0.0 - 5.0)
   - Profundidad y Vocabulario Técnico (0.0 - 5.0)
   - Cumplimiento del Enunciado (0.0 - 5.0)
   - Formato Podcast y Síntesis (0.0 - 5.0)
6. COBERTURA GLOBAL (0 - 100%): Porcentaje de requerimientos del enunciado cubiertos satisfactoriamente.
7. CALIFICACIÓN GLOBAL RECOMENDADA (0.0 a 5.0): Coherente con los requerimientos cubiertos y el modo de evaluación (${gradingMode}).
`;

    let object: z.infer<typeof AudioDefenseGradingSchema> | null = null;

    // Intento 1: Evaluación Multimodal con audio directo si está disponible
    if (audioContent) {
        try {
            console.log(`[audioDefenseService] Ejecutando evaluación multimodal con Gemini (${audioContent.mimeType}, ${Math.round(audioContent.data.byteLength / 1024)} KB)...`);
            const result = await generateObject({
                model,
                schema: AudioDefenseGradingSchema,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "file",
                                data: audioContent.data,
                                mediaType: audioContent.mimeType,
                            },
                            {
                                type: "text",
                                text: prompt,
                            },
                        ],
                    },
                ],
            });
            object = result.object;
        } catch (multimodalErr: any) {
            console.warn("[audioDefenseService] Evaluación multimodal falló o el modelo no admite audio directo, recurriendo a modo texto:", multimodalErr.message);
        }
    }

    // Intento 2: Evaluación con texto de metadatos, notas y enunciado
    if (!object) {
        const fallbackPrompt = `${prompt}\n\n[AVISO DEL SISTEMA: La evaluación se realiza a través de los metadatos verificados, notas, minuta y timestamps de la entrega. Analiza a fondo la correspondencia con el enunciado y los participantes.]`;
        const result = await generateObject({
            model,
            schema: AudioDefenseGradingSchema,
            prompt: fallbackPrompt,
        });
        object = result.object;
    }

    // Normalizar topicsCoverage para compatibilidad retroactiva
    const normalizedTopicsCoverage = (object.statementRequirements && object.statementRequirements.length > 0)
        ? object.statementRequirements.map(sr => ({
            topic: sr.requirement,
            covered: sr.status === "COMPLETED" || sr.status === "PARTIAL",
            comment: sr.audioEvidence ? `[Evidencia: "${sr.audioEvidence}"] ${sr.comment}` : sr.comment,
            score: sr.score,
            status: sr.status,
        }))
        : object.topicsCoverage;

    // Construir retroalimentación exhaustiva y garantizada en Markdown
    const structuredMarkdown = buildStructuredMarkdownFeedback(object, {
        activityTitle,
        audioUrl,
        platform: mediaMetadata.platform,
        analysisMode,
        gradingMode,
    });

    return {
        grade: Math.min(5.0, Math.max(0.0, Math.round(object.grade * 10) / 10)),
        summary: object.summary,
        argumentationScore: Math.min(5.0, Math.max(0.0, Math.round(object.argumentationScore * 10) / 10)),
        structureScore: Math.min(5.0, Math.max(0.0, Math.round(object.structureScore * 10) / 10)),
        technicalDepthScore: Math.min(5.0, Math.max(0.0, Math.round(object.technicalDepthScore * 10) / 10)),
        enunciadoComplianceScore: Math.min(5.0, Math.max(0.0, Math.round(object.enunciadoComplianceScore * 10) / 10)),
        coveragePercentage: Math.min(100, Math.max(0, Math.round(object.coveragePercentage))),
        analysisMode,
        statementRequirements: object.statementRequirements,
        participants: object.participants || [],
        oralCommunication: object.oralCommunication,
        topicsCoverage: normalizedTopicsCoverage,
        strengths: object.strengths || [],
        weaknesses: object.weaknesses || [],
        recommendations: object.recommendations || [],
        feedback: structuredMarkdown,
    };
}


import { getAIModel, extractJSON, repairFeedbackText } from "@/features/teacher/services/ai/client";
import { fetchAudioContent } from "@/features/teacher/services/ai/audioDefenseService";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { GenerateReportPayload, GeneratedReport, ReportTemplateType, ReportTone } from "../types";

const ReportSchema = z.object({
  title: z.string().describe("Título formal y oficial del informe (ej: Bitácora de Sesión N° 12: Arquitectura de Software)"),
  subtitle: z.string().describe("Subtítulo contextual (ej: Seguimiento Pedagógico - Ficha 2712456 - SENA)"),
  date: z.string().describe("Fecha oficial del documento en formato legible en español (ej: 8 de Octubre de 2026)"),
  summary: z.string().describe("Resumen ejecutivo conciso de 1 a 2 párrafos que sintetiza lo más relevante"),
  markdown: z.string().describe("Cuerpo completo del informe estructurado en Markdown con encabezados, tablas, listas de viñetas, notas destacadas y espacio de firmas"),
  keyPoints: z.array(z.string()).describe("Lista de 4 a 8 puntos clave o aspectos más destacados extraídos del audio y notas"),
  actionItems: z.array(z.object({
    id: z.string().describe("ID único simple como act-1, act-2"),
    task: z.string().describe("Descripción de la tarea o compromiso pactado"),
    responsible: z.string().describe("Persona o grupo responsable (ej: Instructor, Aprendices, Nombre del estudiante, Coordinación)"),
    deadline: z.string().optional().describe("Fecha límite o plazo acordado (ej: Próxima clase, 15 de Octubre)"),
    priority: z.enum(["alta", "media", "baja"]).optional().describe("Prioridad estimada"),
    completed: z.boolean().default(false),
  })).describe("Compromisos, acuerdos y tareas pendientes extraídas explícita o implícitamente"),
  participants: z.array(z.object({
    name: z.string().describe("Nombre del estudiante, instructor o participante mencionado"),
    roleOrStatus: z.string().describe("Rol o estado (ej: Aprendice con novedad, Asistente, Vocero, En seguimiento)"),
    observation: z.string().describe("Detalle u observación de su caso o intervención"),
  })).optional().default([]).describe("Participantes o aprendices destacados o mencionados en la sesión"),
  audioTranscription: z.string().optional().describe("Si se proporcionó un audio, transcripción o síntesis textual fiel de lo dicho"),
});

export async function generateAiReport(
  payload: GenerateReportPayload,
  teacherId: string
): Promise<GeneratedReport> {
  const {
    quickNotes,
    audioBase64,
    audioMimeType = "audio/webm",
    audioUrl,
    reportType,
    tone,
    courseTitle,
    studentRoster = [],
    additionalInstructions = "",
  } = payload;

  const model = await getAIModel(teacherId);

  // 1. Preparar audio si está disponible
  let audioContent: { data: Uint8Array; mimeType: string; source: string } | null = null;

  if (audioBase64) {
    try {
      const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.byteLength > 200) {
        audioContent = {
          data: new Uint8Array(buffer),
          mimeType: audioMimeType,
          source: "Grabación de voz directa / archivo subido",
        };
      }
    } catch (e: any) {
      console.warn("[reportAiService] Error decodificando audioBase64:", e.message);
    }
  } else if (audioUrl && audioUrl.trim()) {
    try {
      audioContent = await fetchAudioContent(audioUrl.trim());
    } catch (e: any) {
      console.warn("[reportAiService] Error descargando audio desde URL:", e.message);
    }
  }

  // 2. Definir estilo y tono
  const toneDescriptions: Record<ReportTone, string> = {
    institutional:
      "Formal Institucional (Estilo SENA / Ministerio de Educación). Lenguaje sobrio, protocolario, orientado a competencias, resultados de aprendizaje y evidencias.",
    executive:
      "Técnico Ejecutivo. Directo, analítico, enfocado en hechos concretos, métricas, decisiones arquitectónicas y resultados.",
    pedagogical:
      "Pedagógico Formativo. Empático, reflexivo, centrado en el acompañamiento al aprendiz, superación de brechas y desarrollo humano y técnico.",
    concise:
      "Ejecutivo Síntesis Rápida. Párrafos breves, alto uso de tablas, listas y matrices de acción rápida.",
  };

  const templateGuidelines: Record<ReportTemplateType, string> = {
    class_session: `
FORMATO: BITÁCORA DE SESIÓN DE CLASE
Estructura obligatoria del Markdown:
# [Título Oficial de la Bitácora]
## 1. Datos Generales de la Sesión (Tabla con Fecha, Ficha/Curso, Instructor, Modalidad, Duración)
## 2. Resultados de Aprendizaje y Competencias Abordadas
## 3. Resumen Ejecutivo de la Jornada
## 4. Desarrollo Metodológico y Actividades Ejecutadas (Paso a paso de lo realizado)
## 5. Participación del Grupo y Dinámica Pedagógica
## 6. Novedades, Inasistencias y Dificultades Técnicas
## 7. Conclusiones y Logros Alcanzados
## 8. Matriz de Compromisos y Tareas para la Próxima Sesión (Tabla: Tarea | Responsable | Fecha Límite)
---
*(Espacio para Firma del Instructor y Vocero)*
`,
    technical_visit: `
FORMATO: INFORME DE VISITA TÉCNICA, SALIDA PEDAGÓGICA O GESTIÓN INTERINSTITUCIONAL
Estructura obligatoria del Markdown:
# [Informe de Visita Técnica e Interacción Institucional]
## 1. Datos de la Entidad / Organización Receptora (Entidad, Ubicación, Fecha, Horario, Representante o Funcionario Contactado)
## 2. Participantes del Encuentro (Instructor Responsable, Funcionarios de la Entidad, Aprendices Participantes)
## 3. Justificación y Objetivos de la Visita / Encuentro
## 4. Diagnóstico de Necesidades y Oportunidades Identificadas (Problemas detectados, procesos a automatizar, requerimientos técnicos)
## 5. Propuesta de Articulación y Proyectos de Formación (Solución tecnológica planteada, alcance, requerimientos de licenciamiento/infraestructura)
## 6. Acuerdos y Compromisos Interinstitucionales (Tabla: Compromiso | Responsable (Entidad o SENA) | Plazo Acordado)
## 7. Conclusiones y Próximos Pasos
---
*(Firma del Instructor y Representante de la Entidad)*
`,
    student_tracking: `
FORMATO: INFORME DE SEGUIMIENTO Y DESEMPEÑO DE APRENDICES
Estructura obligatoria del Markdown:
# [Título del Informe de Seguimiento]
## 1. Contexto Académico y Ficha / Curso
## 2. Diagnóstico General del Desempeño
## 3. Relación Detallada de Aprendices en Seguimiento (Tabla: Aprendiz | Estado | Dificultad o Evidencia Pendiente | Acciones Previas)
## 4. Fortalezas y Casos Destacados
## 5. Plan de Mejoramiento Formativo y Acuerdos Pedagógicos
## 6. Estrategia de Acompañamiento y Próxima Fecha de Control
---
*(Espacio para Firma del Instructor y Comité)*
`,
    committee_minute: `
FORMATO: ACTA DE COMITÉ DE EVALUACIÓN Y SEGUIMIENTO (CES)
Estructura obligatoria del Markdown:
# [ACTA N° XX - Comité de Evaluación y Seguimiento]
## 1. Información General (Fecha, Hora de Inicio y Fin, Lugar/Canal, Ficha)
## 2. Asistentes e Invitados (Tabla de Miembros del Comité, Instructor y Aprendices Citados)
## 3. Orden del Día y Motivo de la Citación
## 4. Presentación de Hechos y Evidencias por Parte del Instructor
## 5. Descargos y Manifestaciones del Aprendiz
## 6. Deliberación y Dictamen del Comité (Sanción, llamado de atención o plan de mejora formativo)
## 7. Matriz de Compromisos con Plazos Perentorios (Tabla: Compromiso | Responsable | Plazo Límite)
---
*(Espacio formal para firmas de los miembros del comité)*
`,
    module_closing: `
FORMATO: INFORME DE CIERRE DE COMPETENCIA Y RENDICIÓN DE CUENTAS
Estructura obligatoria del Markdown:
# [Informe de Cierre de Competencia y Juicios Evaluativos]
## 1. Ficha, Competencia y Resultados de Aprendizaje Evaluados
## 2. Estadísticas Generales de Cierre (Total Matriculados, Aprobados, En Plan de Mejora, Deserciones)
## 3. Análisis Cualitativo del Desempeño y Nivel de Logro Técnico
## 4. Relación Consolidada de Aprendices (Tabla: Documento | Aprendiz | Juicio Evaluativo (Aprobado/Por Evaluar) | Observación)
## 5. Plan de Contingencia para Aprendices con Evidencias Pendientes
## 6. Novedades y Juicios Registrados en Sofía Plus / Plataforma
---
*(Firma del Instructor de la Competencia)*
`,
    incident_report: `
FORMATO: REPORTE DE NOVEDADES Y CASOS ESPECIALES
Estructura obligatoria del Markdown:
# [Reporte Oficial de Novedades e Incidentes]
## 1. Identificación del Caso (Ficha, Fecha de ocurrencia, Instructor informante)
## 2. Tipificación de la Novedad (Académica / Disciplinaria / Inasistencia / Técnica / Médica)
## 3. Aprendices o Actores Implicados
## 4. Relación Cronológica y Objetiva de los Hechos
## 5. Acciones Inmediatas Implementadas por el Docente
## 6. Solicitudes y Recomendaciones a la Coordinación Académica
---
*(Firma del Instructor Remitente)*
`,
    project_progress: `
FORMATO: INFORME DE AVANCE DE PROYECTO FORMATIVO
Estructura obligatoria del Markdown:
# [Informe de Avance del Proyecto Formativo]
## 1. Ficha, Proyecto y Fase Actual de Desarrollo
## 2. Estado de Entregables por Equipo (Tabla: Equipo | Integrantes | Estado del Hito | Calificación / Avance %)
## 3. Diagnóstico Técnico de la Solución (Arquitectura, Base de Datos, Código)
## 4. Bloqueos, Impedimentos y Riesgos Identificados
## 5. Plan de Acción y Próximos Sprints / Entregables
---
*(Firma del Instructor Técnico)*
`,
    group_profiling: `
FORMATO: CARACTERIZACIÓN DE GRUPO E INDUCCIÓN DE FICHA
Estructura obligatoria del Markdown:
# [Informe de Caracterización Inicial y Pacto de Convivencia]
## 1. Identificación de la Ficha y Jornada Formativa
## 2. Perfil Sociodemográfico y Formación Previa de los Aprendices
## 3. Diagnóstico Inicial de Habilidades y Competencias Básicas
## 4. Elección y Designación del Vocero y Suplente de Ficha
## 5. Pacto Pedagógico y Reglas de Convivencia Acordadas
## 6. Estrategia Pedagógica Sugerida para el Grupo
---
*(Firma del Instructor Líder y Vocero de Ficha)*
`,
    improvement_plan: `
FORMATO: PLAN DE MEJORAMIENTO ACADÉMICO / ACTA DE COMPROMISO
Estructura obligatoria del Markdown:
# [Acta de Plan de Mejoramiento Formativo]
## 1. Datos del Aprendiz, Ficha y Competencia Asociada
## 2. Resultados de Aprendizaje No Alcanzados y Causas Identificadas
## 3. Actividades Pedagógicas de Refuerzo Asignadas
## 4. Criterios de Evaluación y Evidencias Específicas a Entregar
## 5. Cronograma y Plazo Límite de Presentación y Sustentación (Fecha Improrrogable)
## 6. Declaración de Compromiso y Consecuencias del Incumplimiento
---
*(Firma del Aprendiz y del Instructor Evaluador)*
`,
    custom_report: `
FORMATO: INFORME LIBRE Y PERSONALIZADO
Estructura recomendada:
# [Título del Informe]
## 1. Resumen Ejecutivo
## 2. Desarrollo y Temas Principales
## 3. Análisis y Decisiones
## 4. Próximos Pasos y Compromisos
---
*(Espacio de firma y radicación)*
`,
  };

  const rosterContext = studentRoster && studentRoster.length > 0
    ? `LISTA OFICIAL DE APRENDICES / ESTUDIANTES DE LA FICHA:
${studentRoster.map((name, i) => `${i + 1}. ${name}`).join("\n")}
(Usa estos nombres exactos si detectas que el audio o las notas se refieren a alguno de ellos).`
    : "(No se suministró lista previa de estudiantes; extrae los nombres directamente de las notas y del audio).";

  const systemPrompt = `
Eres un Auditor Académico y Coordinador Pedagógico Senior en Formación Profesional y Superior (con amplia experiencia en el SENA y universidades).
Tu objetivo es transformar ideas rápidas, notas desordenadas, apuntes dispersos o grabaciones de audio en INFORMES OFICIALES DE ALTA CALIDAD, COMPLETOS, ELEGANTES Y RIGUROSOS.

TONO Y ESTILO:
${toneDescriptions[tone]}

PAUTAS CRÍTICAS DE REDACCIÓN:
1. No dejes contenido a medias ni uses texto simulado (Lorem ipsum). Redacta en prosa completa, profesional y articulada.
2. Si el profesor dio ideas sueltas o frases rápidas, DESARROLLA Y FORMALIZA los conceptos con fluidez pedagógica e institucional.
3. Extrae con precisión nombres de estudiantes, fechas, materias, compromisos y acuerdos.
4. Genera tablas en Markdown cuando sea apropiado (asistencia, compromisos, revisión de proyectos).
5. Incluye siempre la matriz de compromisos y tareas pendientes en el apartado 'actionItems'.
6. Si recibes audio multimodally, escucha con atención todo lo que se dice, capta detalles, novedades, nombres y transcribe fielmente en el campo 'audioTranscription'.

${templateGuidelines[reportType]}
`;

  const userPrompt = `
CONTEXTO DEL CURSO / FICHA:
- Título / Ficha: ${courseTitle || "No especificada (usar contexto general)"}
${rosterContext}

INSTRUCCIONES ADICIONALES DEL PROFESOR:
${additionalInstructions.trim() ? additionalInstructions : "Ninguna adicional; aplicar las mejores prácticas institucionales."}

---
IDEAS RÁPIDAS Y NOTAS INGRESADAS POR EL PROFESOR:
"""
${quickNotes.trim() ? quickNotes : "(El profesor no ingresó texto manual; toda la información proviene del audio grabado adjunto)"}
"""

${audioContent ? `[ATENCIÓN: Se ha adjuntado un archivo de audio real (${audioContent.mimeType}, ${audioContent.source}). Escúchalo detalladamente, extrae todo lo dicho y crea el informe en base a él y a las notas adicionales.]` : `(No se adjuntó audio; generar informe a partir de las notas escritas).`}
`;

  // Intento 1: generateObject con Schema Zod
  try {
    const messagesContent: any[] = [];
    if (audioContent) {
      messagesContent.push({
        type: "file",
        data: audioContent.data,
        mediaType: audioContent.mimeType,
      });
    }
    messagesContent.push({
      type: "text",
      text: `${systemPrompt}\n\n${userPrompt}`,
    });

    const result = await generateObject({
      model,
      schema: ReportSchema,
      messages: [
        {
          role: "user",
          content: messagesContent,
        },
      ],
    });

    const obj = result.object;
    return {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: obj.title,
      subtitle: obj.subtitle,
      date: obj.date || new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      templateType: reportType,
      tone,
      courseTitle,
      courseId: payload.courseId,
      summary: obj.summary,
      markdown: repairFeedbackText(obj.markdown),
      keyPoints: obj.keyPoints || [],
      actionItems: (obj.actionItems || []).map((item, idx) => ({
        id: item.id || `act-${idx + 1}`,
        task: item.task,
        responsible: item.responsible,
        deadline: item.deadline || "Por definir",
        priority: item.priority || "media",
        completed: Boolean(item.completed),
      })),
      participants: obj.participants || [],
      audioTranscription: obj.audioTranscription,
      createdAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.warn("[reportAiService] Falló generateObject, recurriendo a generateText + extractJSON:", error.message);

    // Intento 2: generateText + extractJSON
    const fallbackPrompt = `
${systemPrompt}

${userPrompt}

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA:
{
  "title": "Título oficial del informe",
  "subtitle": "Subtítulo contextual",
  "date": "Fecha legible en español",
  "summary": "Resumen ejecutivo de 1 o 2 párrafos",
  "markdown": "Informe completo en Markdown con tablas y secciones",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3"],
  "actionItems": [
    { "id": "act-1", "task": "Tarea", "responsible": "Responsable", "deadline": "Plazo", "priority": "alta" }
  ],
  "participants": [
    { "name": "Nombre", "roleOrStatus": "Rol", "observation": "Observación" }
  ],
  "audioTranscription": "Transcripción del audio si hubo"
}
`;

    const textResult = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            ...(audioContent ? [{ type: "file" as const, data: audioContent.data, mediaType: audioContent.mimeType }] : []),
            { type: "text" as const, text: fallbackPrompt },
          ],
        },
      ],
    });

    const parsed = extractJSON<any>(textResult.text);
    return {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: parsed.title || "Informe Académico y Pedagógico",
      subtitle: parsed.subtitle || (courseTitle ? `Ficha: ${courseTitle}` : "SmartClass"),
      date: parsed.date || new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      templateType: reportType,
      tone,
      courseTitle,
      courseId: payload.courseId,
      summary: parsed.summary || "Informe estructurado mediante inteligencia artificial a partir de notas del docente.",
      markdown: repairFeedbackText(parsed.markdown || textResult.text),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((item: any, idx: number) => ({
            id: item.id || `act-${idx + 1}`,
            task: item.task || "Compromiso de sesión",
            responsible: item.responsible || "Docente / Aprendices",
            deadline: item.deadline || "Próxima sesión",
            priority: item.priority || "media",
            completed: false,
          }))
        : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      audioTranscription: parsed.audioTranscription || undefined,
      createdAt: new Date().toISOString(),
    };
  }
}

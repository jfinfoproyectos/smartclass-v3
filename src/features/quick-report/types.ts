export type ReportTemplateType =
  | "class_session"
  | "technical_visit"
  | "student_tracking"
  | "committee_minute"
  | "module_closing"
  | "incident_report"
  | "project_progress"
  | "group_profiling"
  | "improvement_plan"
  | "custom_report";

export type ReportTone =
  | "institutional"
  | "executive"
  | "pedagogical"
  | "concise";

export interface ActionItem {
  id: string;
  task: string;
  responsible: string;
  deadline?: string;
  priority?: "alta" | "media" | "baja";
  completed?: boolean;
}

export interface MentionedParticipant {
  name: string;
  roleOrStatus: string;
  observation: string;
}

export interface GeneratedReport {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  templateType: ReportTemplateType;
  tone: ReportTone;
  courseTitle?: string;
  courseId?: string;
  summary: string;
  markdown: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  participants: MentionedParticipant[];
  audioTranscription?: string;
  createdAt: string;
}

export interface GenerateReportPayload {
  quickNotes: string;
  audioBase64?: string;
  audioMimeType?: string;
  audioUrl?: string;
  audioFileName?: string;
  reportType: ReportTemplateType;
  tone: ReportTone;
  courseTitle?: string;
  courseId?: string;
  studentRoster?: string[];
  additionalInstructions?: string;
}

export interface TemplateDefinition {
  id: ReportTemplateType;
  name: string;
  shortDescription: string;
  iconName: string;
  badge: string;
  category: "formacion" | "gestion" | "seguimiento" | "cierre";
  defaultStructure: string[];
  examplePrompt: string;
}

export const REPORT_TEMPLATES: TemplateDefinition[] = [
  {
    id: "class_session",
    name: "Bitácora de Sesión de Clase",
    shortDescription: "Resumen oficial de jornada formativa, objetivos, metodología y compromisos.",
    iconName: "BookOpen",
    badge: "Formación Diaria",
    category: "formacion",
    defaultStructure: [
      "Encabezado Institucional y Metadatos de la Sesión",
      "Resultados de Aprendizaje y Objetivos Abordados",
      "Desarrollo Metodológico y Actividades Ejecutadas",
      "Participación y Rendimiento del Grupo",
      "Novedades, Inasistencias y Dificultades Técnicas",
      "Conclusiones y Tareas para la Siguiente Clase",
    ],
    examplePrompt: "Hoy vimos arquitectura cliente-servidor y APIs REST. Faltaron 3 aprendices por problemas de internet. Hicimos taller práctico con Postman y dejamos de compromiso la entrega de la colección para el viernes.",
  },
  {
    id: "technical_visit",
    name: "Visita Técnica & Salida Pedagógica",
    shortDescription: "Gestión interinstitucional, reuniones con entidades, empresas, juzgados o convenios.",
    iconName: "Building2",
    badge: "Gestión Externa",
    category: "gestion",
    defaultStructure: [
      "Datos de la Entidad / Organización Visitada y Fecha",
      "Participantes (Docente, Funcionarios y Aprendices)",
      "Objetivo y Alcance del Encuentro o Visita",
      "Diagnóstico y Necesidades Identificadas",
      "Oportunidades de Proyecto / Convenio / Articulación",
      "Acuerdos Institucionales y Próximas Fechas de Control",
    ],
    examplePrompt: "Se asiste a reunión con el Dr. Juan Pablo Velásquez en el Juzgado de Familia 4 ubicado en Niquía para identificar necesidades de automatización de software. Se acordó desarrollo de prototipo para tutelas y se requiere clarificar licencias de Office.",
  },
  {
    id: "student_tracking",
    name: "Seguimiento y Desempeño de Aprendices",
    shortDescription: "Evaluación individual o por equipos de competencias, bloqueos y planes de mejora.",
    iconName: "UserCheck",
    badge: "Acompañamiento",
    category: "seguimiento",
    defaultStructure: [
      "Diagnóstico Académico General de la Ficha",
      "Relación de Aprendices en Seguimiento / Casos Destacados",
      "Evidencias Pendientes de Entrega",
      "Plan de Mejoramiento y Acuerdos Pedagógicos",
      "Estrategia de Refuerzo y Seguimiento",
    ],
    examplePrompt: "Seguimiento a estudiantes rezagados en el módulo de TypeScript. Juan y Carlos tienen pendiente el taller 3 y 4. Se pacta sesión de asesoría y entrega máxima el próximo lunes.",
  },
  {
    id: "committee_minute",
    name: "Acta de Comité de Evaluación y Seguimiento (CES)",
    shortDescription: "Acta formal de comité académico/disciplinario, citaciones, descargos y resoluciones.",
    iconName: "FileSpreadsheet",
    badge: "Institucional",
    category: "seguimiento",
    defaultStructure: [
      "Número de Acta, Fecha, Horario y Lugar/Enlace",
      "Miembros del Comité Asistentes y Aprendices Citados",
      "Orden del Día y Motivo de Citación",
      "Presentación de Hechos y Descargos del Aprendiz",
      "Deliberación y Dictamen / Sanción o Recomendación Aprobada",
      "Matriz de Compromisos con Plazos de Cumplimiento",
      "Espacio de Firmas Formales",
    ],
    examplePrompt: "Comité de evaluación de la ficha de ADSO. Se evaluó caso disciplinario de inasistencia reiterada de 3 aprendices. Se aprueba llamado de atención por escrito y plan de contingencia con plazo perentorio de 5 días hábiles.",
  },
  {
    id: "module_closing",
    name: "Cierre de Competencia & Rendición de Cuentas",
    shortDescription: "Consolidado final de fin de módulo, juicios evaluativos Sofia Plus y estadísticas.",
    iconName: "CheckCircle2",
    badge: "Cierre & Evaluación",
    category: "cierre",
    defaultStructure: [
      "Identificación de la Competencia y Ficha Formativa",
      "Estadísticas de Aprobación (% Aprobados, No Aprobados, Deserciones)",
      "Resultados de Aprendizaje Evaluados y Evidencias Finales",
      "Relación de Aprendices con Juicio Aprobado y Pendiente",
      "Informe de Novedades y Juicios Registrados en Plataforma",
      "Observaciones de Cierre y Recomendaciones a Etapa Productiva",
    ],
    examplePrompt: "Cierre de la competencia 'Desarrollo de Software Web'. De 32 aprendices, 28 aprobaron satisfactoriamente el proyecto final, 2 desertaron y 2 quedan con plan de mejoramiento antes de subir juicios a Sofia Plus.",
  },
  {
    id: "incident_report",
    name: "Reporte de Novedades, Inasistencias y Casos",
    shortDescription: "Documentación de incidentes académicos, de conducta, ausencias prolongadas o contingencias.",
    iconName: "AlertTriangle",
    badge: "Novedades & Casos",
    category: "seguimiento",
    defaultStructure: [
      "Tipificación de la Novedad (Académica / Disciplinaria / Médica / Técnica)",
      "Aprendices o Actores Involucrados",
      "Relación Cronológica y Objetiva de los Hechos",
      "Acciones Inmediatas Implementadas por el Docente",
      "Solicitud o Recomendación a Coordinación Académica",
    ],
    examplePrompt: "Novedad por caída eléctrica general en el laboratorio durante la evaluación final. Se pausó la prueba y se reprograma la entrega sin penalización para el próximo martes.",
  },
  {
    id: "project_progress",
    name: "Avance de Proyecto Formativo / Sprint Técnico",
    shortDescription: "Estado de hitos del proyecto, arquitectura de software, bloqueos técnicos y hoja de ruta.",
    iconName: "Layers",
    badge: "Proyectos & Código",
    category: "formacion",
    defaultStructure: [
      "Fase del Proyecto y Hito Evaluado",
      "Revisión de Entregables por Equipo de Trabajo",
      "Auditoría Técnica (Arquitectura, Base de Datos, Frontend)",
      "Bloqueos e Impedimentos Identificados",
      "Próximos Sprints y Entregas Obligatorias",
    ],
    examplePrompt: "Revisión del sprint 2 del proyecto de software. El grupo 1 completó el esquema relacional en PostgreSQL pero tiene dudas con Prisma. El grupo 3 no presentó mockups.",
  },
  {
    id: "group_profiling",
    name: "Caracterización de Grupo & Inducción",
    shortDescription: "Diagnóstico inicial de la ficha, perfil de ingreso, estilos y acuerdos de convivencia.",
    iconName: "Users",
    badge: "Diagnóstico Inicial",
    category: "formacion",
    defaultStructure: [
      "Datos de la Ficha y Jornada Formativa",
      "Perfil Sociodemográfico y Formación Previa de los Aprendices",
      "Diagnóstico de Conocimientos Previos y Brechas Detectadas",
      "Elección de Vocero y Representantes de Ficha",
      "Pacto de Convivencia y Reglas de Juego Acordadas",
    ],
    examplePrompt: "Inducción y caracterización inicial de la ficha 2890123. Se aplicó encuesta diagnóstica: el 60% tiene conocimientos básicos de programación y el 40% entra desde cero. Se eligió a Camilo como vocero.",
  },
  {
    id: "improvement_plan",
    name: "Plan de Mejoramiento Académico",
    shortDescription: "Acta oficial de actividades de refuerzo, evidencias a subsanar y fechas límite de entrega.",
    iconName: "ClipboardCheck",
    badge: "Plan de Mejora",
    category: "seguimiento",
    defaultStructure: [
      "Datos del Aprendiz y Competencia a Subsanar",
      "Resultados de Aprendizaje No Alcanzados",
      "Actividades Pedagógicas Complementarias Asignadas",
      "Criterios de Evaluación y Entregables Específicos",
      "Cronograma y Plazo Máximo de Sustentación",
      "Compromiso Formal del Aprendiz e Instructor",
    ],
    examplePrompt: "Plan de mejoramiento para la aprendiz Daniela Ruiz por no alcanzar el resultado de aprendizaje de Bases de Datos relacionales. Se le asigna diseño de diagrama ER y script SQL en PostgreSQL para entregar el 20 de octubre.",
  },
  {
    id: "custom_report",
    name: "Informe Libre / Estructura Personalizada",
    shortDescription: "Estructuración libre e inteligente adaptada 100% a tus instrucciones e ideas.",
    iconName: "Sparkles",
    badge: "Personalizado",
    category: "gestion",
    defaultStructure: [
      "Resumen Ejecutivo",
      "Contenido y Desarrollo Principal",
      "Puntos Clave y Decisiones",
      "Próximos Pasos y Compromisos",
    ],
    examplePrompt: "Crea un informe ejecutivo de la reunión informativa con los voceros de las 4 fichas sobre el calendario de pruebas Saber TyT y las jornadas de inducción a etapa productiva.",
  },
];

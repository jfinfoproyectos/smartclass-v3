import { MarkdownTemplate } from "../types";

export const MARKDOWN_TEMPLATES: MarkdownTemplate[] = [
  {
    id: "executive-report",
    name: "Informe Ejecutivo & Auditoría",
    category: "Corporativo",
    description: "Estructura formal con KPIs, hallazgos clave, tabla de criticidad y plan de acción de alto impacto.",
    iconName: "ShieldCheck",
    defaultMetadata: {
      title: "Informe Ejecutivo de Auditoría de Sistemas y Calidad de Código",
      subtitle: "Diagnóstico integral de arquitectura, rendimiento y vulnerabilidades de seguridad",
      category: "Auditoría Técnica",
      version: "2.4.0",
      folioCode: "AUD-2026-098",
      status: "OFFICIAL",
    },
    defaultStyle: {
      colorScheme: "teal",
      coverStyle: "hero",
    },
    content: `# Resumen Ejecutivo

El presente dictamen técnico consolida los resultados obtenidos durante la auditoría integral de la infraestructura de software y los repositorios base correspondientes al ciclo operativo actual. Se evaluaron criterios de mantenibilidad, adherencia a estándares de codificación, seguridad en dependencias y rendimiento en tiempo de respuesta bajo alta concurrencia.

> [!NOTE]
> La infraestructura auditada procesa actualmente más de **1.2 millones de peticiones diarias** con una disponibilidad acumulada del **99.98%**.

---

## Métricas Clave de Rendimiento (KPIs)

:::kpi 99.98% | Disponibilidad SLA | Últimos 90 días operativos :::
:::kpi 42ms | Latencia Media p95 | Reducción de 18ms vs anterior :::
:::kpi 0 | Brechas Críticas | OWASP Top 10 superado al 100% :::
:::kpi 94.6% | Cobertura Tests | Pruebas unitarias e integración :::

---

## Matriz de Hallazgos y Clasificación de Riesgo

A continuación se detalla la matriz de priorización basada en impacto sobre el negocio y complejidad de mitigación:

| Componente | Vulnerabilidad / Hallazgo | Nivel de Riesgo | Estado | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Gateway** | Rotación de llaves JWT cada 24h | **Bajo** | Resuelto | Implementar job automático en cron |
| **Database Pool** | Límite de conexiones en picos | **Medio** | En Proceso | Escalar pooler PgBouncer a 200 conexiones |
| **API Endpoints** | Falta de rate-limiting en /login | **Medio** | Resuelto | Integrar middleware Redis Token Bucket |
| **Core Storage** | Respaldos automáticos en frío S3 | **Bajo** | Validado | Configurar ciclo de vida a Glacier 30d |

> [!IMPORTANT]
> Se recomienda desplegar la actualización del **Database Pooler** antes del cierre del sprint en curso para garantizar estabilidad en horas pico.

---

## Arquitectura de Mitigación

El siguiente snippet describe la configuración de seguridad aplicada al gateway principal:

\`\`\`typescript
import { rateLimiter } from "@/lib/security/rateLimiter";
import { verifyJwtSession } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  // 1. Verificación de firma y tiempo de expiración
  const session = await verifyJwtSession(req);
  if (!session.isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Control de flujo distribuido (Max 120 req/min por IP)
  const isAllowed = await rateLimiter.check(req.ip, { limit: 120, windowMs: 60000 });
  if (!isAllowed) {
    return new Response("Too Many Requests", { status: 429 });
  }

  return NextResponse.next();
}
\`\`\`

---

## Plan de Trabajo y Cronograma

- [x] Ejecución de escaneo automatizado SAST/DAST en repositorios.
- [x] Corrección de dependencias vulnerables identificadas en \`package.json\`.
- [ ] Optimización de índices compuestos en tablas transaccionales de alto tráfico.
- [ ] Implementación de alertas proactivas en Datadog y Slack corporativo.

> [!TIP]
> La implementación de índices parciales en Postgres reducirá el consumo de memoria un estimado del **32%**.

---pagebreak---

## Conclusiones y Dictamen de Aprobación

La arquitectura evaluada cumple satisfactoriamente con los estándares corporativos de calidad, resiliencia y seguridad de la información exigidos por el comité de ingeniería.

:::signatures
Elaborado por | Ing. Carlos Mendoza | Lead Security Auditor | SmartClass Enterprise
Revisado por | Dra. Valeria Ortiz | VP of Engineering | Dirección de Tecnología
Aprobado por | Msc. Roberto Gómez | Chief Technology Officer (CTO) | Comité de Dirección
:::
`,
  },
  {
    id: "pedagogical-guide",
    name: "Guía Pedagógica & Taller Técnico",
    category: "Educación",
    description: "Estructura didáctica con objetivos, prerrequisitos, explicaciones de código paso a paso y ejercicios.",
    iconName: "GraduationCap",
    defaultMetadata: {
      title: "Guía Práctica de Aprendizaje: Arquitectura de Microservicios con Node.js & Docker",
      subtitle: "Taller técnico de implementación, persistencia distribuida y comunicación por eventos",
      category: "Material Didáctico",
      version: "1.0.0",
      folioCode: "GUIA-NODE-2026",
      status: "APPROVED",
    },
    defaultStyle: {
      colorScheme: "navy",
      coverStyle: "hero",
    },
    content: `# Objetivos de Aprendizaje

Al finalizar la presente sesión técnica, el aprendiz u oficial técnico estará en capacidad de:

1. Diseñar y orquestar contenedores Docker independientes para microservicios desacoplados.
2. Implementar una capa de comunicación asíncrona mediante colas de mensajería (RabbitMQ/Redis).
3. Aplicar principios de resiliencia y reintentos exponenciales con circuit breakers.

> [!IMPORTANT]
> **Prerrequisitos:** Tener instalado Node.js v20 LTS, Docker Desktop y conocimientos sólidos de TypeScript y arquitectura REST.

---

## Estructura del Entorno de Desarrollo

Asegúrate de estructurar el proyecto respetando el principio de segregación de responsabilidades:

\`\`\`bash
mkdir microservices-workshop && cd microservices-workshop
npm init -y
npm install typescript @types/node tsx prisma @prisma/client
npx tsc --init
\`\`\`

---

## Paso 1: Configuración del Servicio de Catálogo

Crea el archivo \`src/services/catalogService.ts\` con la lógica de recuperación de datos:

\`\`\`typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export class CatalogService {
  async getProductById(id: string): Promise<Product | null> {
    // Consulta optimizada a base de datos con cache local
    return await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, price: true, stock: true }
    });
  }
}
\`\`\`

> [!WARNING]
> Nunca expongas directamente credenciales o secretos en variables del código fuente; utiliza siempre variables de entorno cargadas vía \`.env\`.

---

## Comparativa de Protocolos de Comunicación

| Protocolo | Tipo | Latencia Media | Caso de Uso Recomendado |
| :--- | :--- | :--- | :--- |
| **REST (HTTP/2)** | Síncrono | 25 - 45ms | Consultas directas y CRUD estándar |
| **gRPC (Protobuf)** | Síncrono | 5 - 12ms | Comunicación inter-servicios interna de alto rendimiento |
| **RabbitMQ** | Asíncrono | 2 - 8ms | Eventos desacoplados y procesamiento por lotes |
| **WebSocket** | Bidireccional | < 5ms | Telemetría en vivo y notificaciones push |

---

## Actividad Práctica Evaluativa

- [ ] Clonar el repositorio base del taller y ejecutar \`npm run build\`.
- [ ] Implementar el endpoint \`POST /api/orders\` asegurando transaccionalidad ACID.
- [ ] Escribir 3 pruebas unitarias con Jest cubriendo el caso de stock insuficiente.
- [ ] Enviar el enlace del commit final en GitHub al panel de SmartClass.

> [!TIP]
> Utiliza \`docker compose up -d\` para levantar la base de datos PostgreSQL y Redis en segundo plano de manera instantánea.
`,
  },
  {
    id: "technical-proposal",
    name: "Propuesta Técnico-Comercial",
    category: "Proyectos",
    description: "Formato corporativo para licitaciones, alcance, presupuesto y acuerdos de nivel de servicio (SLA).",
    iconName: "Briefcase",
    defaultMetadata: {
      title: "Propuesta de Transformación Digital y Modernización de Plataforma",
      subtitle: "Solución integral de nube, analítica predictiva con IA y automatización de procesos",
      category: "Propuesta Comercial",
      version: "3.1.0",
      folioCode: "PROP-CORP-2026-88",
      status: "CONFIDENTIAL",
    },
    defaultStyle: {
      colorScheme: "indigo",
      coverStyle: "cover-page",
    },
    content: `# Alcance del Proyecto

La presente propuesta técnica describe la hoja de ruta integral para la modernización de los sistemas centrales de gestión académica y operativa de la institución, migrando hacia una arquitectura Cloud-Native escalable en AWS.

> [!NOTE]
> El proyecto contempla la modernización de **3 módulos principales**: Plataforma Web React/Next.js, Motor de Evaluación Inteligente y Sistema de Analítica de Rendimiento Estudiantil.

---

## Hitos y Cronograma de Entregables

| Fase | Entregable Clave | Duración Estimada | Hito de Validación |
| :--- | :--- | :--- | :--- |
| **Fase 1: Descubrimiento** | Arquitectura objetivo y diseño UX/UI | Semanas 1 a 4 | Aprobación de Mockups Interactivos |
| **Fase 2: Backend Core** | Microservicios, Auth y Base de Datos | Semanas 5 a 10 | Pruebas de Carga 5,000 usuarios concurrentes |
| **Fase 3: Módulo IA** | Generador de reportes y analítica LLM | Semanas 11 a 14 | Precisión diagnóstica > 95% |
| **Fase 4: Go-Live** | Migración de datos y capacitación docente | Semanas 15 a 18 | Despliegue en Producción sin downtime |

---

## Desglose Económico de la Inversión

:::kpi $48,500 USD | Inversión Total | Descuento institucional 15% aplicado :::
:::kpi 18 Semanas | Tiempo de Entrega | Garantía de soporte 12 meses :::
:::kpi 99.95% | SLA Garantizado | Respuesta a incidentes < 15 min :::

| Concepto | Horas Especializadas | Tarifa / Hora | Total (USD) |
| :--- | :--- | :--- | :--- |
| Ingeniería de Software Fullstack | 480 hrs | $45.00 | $21,600.00 |
| Arquitectura Cloud & DevOps AWS | 240 hrs | $65.00 | $15,600.00 |
| Especialista en Modelos LLM & NLP | 160 hrs | $70.00 | $11,200.00 |
| Aseguramiento de Calidad (QA) | 180 hrs | $35.00 | $6,300.00 |
| **Subtotal General** | | | **$54,700.00** |
| **Descuento Institucional Fidelización (15%)** | | | **-$8,205.00** |
| **Total Propuesta de Servicios** | | | **$46,495.00** |

> [!IMPORTANT]
> Esta propuesta económica tiene una vigencia de **30 días calendario** a partir de su emisión.

---pagebreak---

## Aceptación de Términos y Condiciones

Las partes declaran su total conformidad con los términos técnicos y económicos descritos en el presente documento de alcance.

:::signatures
Por el Proveedor | Ing. Juan Pablo Reyes | Director de Proyectos Cloud | SmartClass Technologies
Por el Cliente | Dra. Claudia Ramírez | Directora de Tecnología y Operaciones | Institución Educativa
:::
`,
  },
  {
    id: "api-reference",
    name: "Manual de Arquitectura & API",
    category: "Ingeniería",
    description: "Documentación de endpoints, modelos de datos JSON, códigos de respuesta y especificaciones técnicas.",
    iconName: "FileCode",
    defaultMetadata: {
      title: "Especificación Técnica de API REST: SmartClass Core v3",
      subtitle: "Guía oficial de integración para desarrolladores, esquemas de payload y autenticación",
      category: "Documentación Técnica",
      version: "3.2.0",
      folioCode: "API-SPEC-2026",
      status: "OFFICIAL",
    },
    defaultStyle: {
      colorScheme: "cyber",
      coverStyle: "hero",
    },
    content: `# Autenticación y Seguridad

Todas las peticiones a la API deben incluir el encabezado HTTP \`Authorization\` con el esquema Bearer Token:

\`\`\`http
Authorization: Bearer sc_live_9f83a84b12c98d7e0123
Content-Type: application/json
\`\`\`

> [!WARNING]
> No compartas tus credenciales de API en repositorios públicos. Los tokens revocados no podrán emitir solicitudes.

---

## Endpoint: Crear Actividad Evaluativa

\`POST /api/v1/courses/{courseId}/activities\`

### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| \`courseId\` | UUID | **Sí** | Identificador único de la ficha o curso activo |

### Cuerpo de la Solicitud (JSON Request)

\`\`\`json
{
  "title": "Taller de Programación Asíncrona",
  "description": "Implementación de Promises y Async/Await en TypeScript",
  "activityType": "WORKSHOP",
  "maxScore": 5.0,
  "dueDate": "2026-10-15T23:59:59Z",
  "allowLateSubmissions": false
}
\`\`\`

### Respuesta Exitosa (\`201 Created\`)

\`\`\`json
{
  "success": true,
  "data": {
    "id": "act_88291a8f",
    "courseId": "crs_120491",
    "title": "Taller de Programación Asíncrona",
    "status": "PUBLISHED",
    "createdAt": "2026-09-28T14:30:00Z"
  }
}
\`\`\`

---

## Códigos de Estado HTTP

| Código | Significado | Explicación |
| :--- | :--- | :--- |
| \`200 OK\` | Éxito | La solicitud fue procesada correctamente. |
| \`201 Created\` | Recurso Creado | La entidad fue persistida en la base de datos. |
| \`400 Bad Request\` | Error de Validación | El JSON enviado no cumple con el esquema requerido. |
| \`401 Unauthorized\` | No Autenticado | Token ausente, inválido o expirado. |
| \`403 Forbidden\` | Sin Permisos | El usuario no posee el rol necesario para esta acción. |
| \`429 Rate Limit\` | Cuota Excedida | Se ha superado el límite de 1,000 peticiones por minuto. |
`,
  },
  {
    id: "meeting-minutes",
    name: "Acta de Comité & Minuta",
    category: "Gobernanza",
    description: "Registro formal de sesiones de trabajo, acuerdos institucionales y matriz de compromisos.",
    iconName: "FileText",
    defaultMetadata: {
      title: "Acta No. 14: Comité Técnico de Currículo y Evaluación Pedagógica",
      subtitle: "Revisión trimestral de indicadores académicos y adopción de herramientas de IA",
      category: "Acta Oficial",
      version: "1.0",
      folioCode: "ACTA-2026-014",
      status: "APPROVED",
    },
    defaultStyle: {
      colorScheme: "slate",
      coverStyle: "hero",
    },
    content: `# Información General de la Sesión

- **Fecha:** 28 de Septiembre de 2026
- **Hora de Inicio:** 09:00 AM | **Hora de Cierre:** 11:30 AM
- **Lugar:** Sala Virtual de Conferencias / Auditorio Principal
- **Presidente de la Sesión:** Dr. Mauricio Salcedo (Decano de Facultad)
- **Secretaria Técnica:** Msc. Andrea Morales (Coordinadora Académica)

---

## Asistentes y Quórum

| Nombre Completo | Rol Institucional | Estado |
| :--- | :--- | :--- |
| Dr. Mauricio Salcedo | Decano de Facultad | **Presente** |
| Msc. Andrea Morales | Coordinadora Académica | **Presente** |
| Ing. Diego Hernández | Líder de Área Técnica | **Presente** |
| Lic. Martha Castro | Representante Docente | **Presente** |
| Juan Camilo Torres | Representante Estudiantil | **Presente** |

---

## Orden del Día

1. Verificación del quórum reglamentario y lectura del orden del día.
2. Balance de rendimiento estudiantil del segundo trimestre formativo.
3. Propuesta de integración de herramientas interactivas de IA en el aula.
4. Compromisos y proposiciones varias.

---

## Acuerdos Adoptados

> [!NOTE]
> Por unanimidad de los miembros presentes, se aprueba la incorporación de la plataforma **SmartClass v3** como estándar institucional para la gestión y evaluación de actividades prácticas.

---

## Matriz de Compromisos y Tareas

- [x] Publicar el cronograma oficial de evaluaciones finales en el portal.
- [ ] Dictar taller de inducción a docentes sobre rúbricas analíticas el próximo viernes.
- [ ] Enviar circular informativa a padres de familia y aprendices sobre las fechas de cierre.
- [ ] Consolidar informe estadístico de retención estudiantil para el consejo superior.

---

:::signatures
Presidente de Sesión | Dr. Mauricio Salcedo | Decano de Facultad | Consejo Académico
Secretaria Técnica | Msc. Andrea Morales | Coordinadora de Programa | Dirección Académica
:::
`,
  }
];

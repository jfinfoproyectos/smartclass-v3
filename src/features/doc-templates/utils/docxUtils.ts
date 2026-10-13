import JSZip from "jszip";

export type TemplateVariableType = 
    | "text" 
    | "paragraph" 
    | "date" 
    | "number" 
    | "select"
    | "currency_words"    // Moneda con Conversión a Letras
    | "signature"         // Firma Digitalizada / Imagen
    | "conditional"       // Cláusula Condicional (Sí/No)
    | "dynamic_table"     // Tabla Repetitiva de Filas
    | "date_range"        // Rango de Fechas / Período
    | "legal_citation"    // Cita Jurídica / Jurisprudencia IA
    | "ai_summary"        // Resumen Ejecutivo / Sinopsis IA
    | "ai_analysis"       // Consideraciones / Análisis Crítico IA
    | "ai_risk"           // Evaluación de Riesgos / Matriz IA
    | "ai_conclusion"     // Dictamen Técnico / Conclusión IA
    | "ai_translation";   // Traducción Oficial / Resumen Bilingüe IA

export interface PromptPreset {
    id: string;
    name: string;
    description: string;
    systemInstruction: string;
    isBuiltIn?: boolean;
}

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
    {
        id: "juridico",
        name: "⚖️ Lenguaje Jurídico / Procesal",
        description: "Estilo técnico-legal formal, argumentativo, con terminología de derecho procesal y rigor sustantivo",
        systemInstruction: "Actúa como un experto redactor jurídico y procesal de alto nivel. Transforma el borrador o notas suministradas en un texto formal, riguroso y técnicamente impecable para documentos legales (tutelas, demandas, contratos, conceptos, memoriales o alegatos). Emplea terminología jurídica precisa (ej. 'el suscrito', 'vulneración flagrante', 'nexo causal', 'ordenamiento jurídico vigente', 'deber constitucional'), mantén una estructura coherente y persuasiva, y preserva escrupulosamente todos los hechos, fechas, nombres y pretensiones clave sin inventar datos que no hayan sido suministrados.",
        isBuiltIn: true
    },
    {
        id: "administrativo",
        name: "📋 Administrativo & Contractual",
        description: "Redacción formal corporativa e institucional para informes de supervisión, actas y resoluciones",
        systemInstruction: "Actúa como un redactor institucional y de gestión contractual del sector público y privado. Transforma el texto en una redacción formal, institucional, objetiva y neutral adecuada para informes de ejecución contractual, actas de comité, certificaciones y resoluciones administrativas. Emplea un tono corporativo, verificable y con precisión en fechas, entregables y obligaciones.",
        isBuiltIn: true
    },
    {
        id: "academico",
        name: "🎓 Académico & Pedagógico",
        description: "Enfoque metodológico, conceptual y formativo para sílabos, rúbricas y proyectos educativos",
        systemInstruction: "Actúa como un redactor académico e investigador pedagógico universitario. Estructura el párrafo con rigor conceptual, claridad expositiva, vocabulario especializado y un tono didáctico y formal para manuales, talleres, propuestas académicas y reportes de evaluación por competencias.",
        isBuiltIn: true
    },
    {
        id: "ejecutivo",
        name: "💼 Ejecutivo & Conciso",
        description: "Directo, asertivo y de alto impacto, enfocado en resultados sin rodeos ni redundancias",
        systemInstruction: "Actúa como un consultor y asesor de alta dirección. Transforma el borrador en un texto conciso, asertivo, orientado a impacto y decisiones clave. Elimina redundancias y rodeos innecesarios manteniendo un tono profesional, claro y concluyente.",
        isBuiltIn: true
    },
    {
        id: "didactico",
        name: "✍️ Didáctico & Ciudadano",
        description: "Lenguaje claro y comprensible para personas sin formación técnica o jurídica",
        systemInstruction: "Actúa como un comunicador experto en derecho accesible y pedagogía ciudadana. Redacta el texto de forma clara, directa y empática, manteniendo la validez y seriedad técnica pero haciéndolo fácilmente comprensible para ciudadanos o usuarios sin formación jurídica especializada.",
        isBuiltIn: true
    }
];

export interface DigitalSignatureData {
    variableId: string;
    signatureDataUrl: string; // PNG base64
    signerName: string;
    signerId?: string; // Cédula o ID del firmante
    signerRole?: string; // Cargo institucional
    signedAt: string; // ISO string
    verificationCode: string; // Hash único de verificación
}

export interface TemplateVariable {
    id: string; // e.g. "nombre_accionante"
    label: string; // e.g. "Nombre del Accionante"
    originalText: string; // text in the document that will be replaced, e.g. "JUAN CARLOS PÉREZ GÓMEZ"
    type: TemplateVariableType;
    description?: string;
    aiPromptGuideline?: string; // instruction for AI when generating narrative, e.g. "Redacta los hechos cronológicamente"
    promptPresetId?: string; // Preset de estilo de prompt seleccionado (ej: "juridico", "administrativo", etc.)
    options?: string[]; // if type is 'select'
    occurrencesCount?: number;
    // Campos opcionales para tipos avanzados
    conditionalTextIfFalse?: string; // para "conditional": qué colocar si es falso (por defecto se elimina)
    tableColumns?: string[]; // para "dynamic_table": nombres de columnas
    required?: boolean; // Validación de integridad: si es obligatorio (por defecto true)
}

/**
 * Convierte un número o monto a su representación en letras en español (moneda legal)
 * Ej: 49743719 -> "CUARENTA Y NUEVE MILLONES SETECIENTOS CUARENTA Y TRES MIL SETECIENTOS DIECINUEVE PESOS M/CTE"
 */
export function numberToSpanishWords(num: number): string {
    if (isNaN(num)) return "";
    const n = Math.floor(Math.abs(num));
    if (n === 0) return "CERO PESOS M/CTE";

    const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas1 = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    function leerGrupo3(val: number): string {
        if (val === 0) return "";
        if (val === 100) return "CIEN";
        let str = "";
        const c = Math.floor(val / 100);
        const d = Math.floor((val % 100) / 10);
        const u = val % 10;

        if (c > 0) str += centenas[c] + " ";

        if (d === 1) {
            str += decenas1[u] + " ";
        } else if (d === 2 && u > 0) {
            str += "VEINTI" + unidades[u].toLowerCase() + " ";
        } else {
            if (d > 0) str += decenas[d] + (u > 0 ? " Y " : " ");
            if (u > 0) str += unidades[u] + " ";
        }

        return str.trim();
    }

    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;

    let resultado = "";

    if (millones > 0) {
        if (millones === 1) resultado += "UN MILLÓN ";
        else resultado += leerGrupo3(millones) + " MILLONES ";
    }

    if (miles > 0) {
        if (miles === 1) resultado += "MIL ";
        else resultado += leerGrupo3(miles) + " MIL ";
    }

    if (resto > 0) {
        resultado += leerGrupo3(resto) + " ";
    }

    return (resultado.trim() + " PESOS M/CTE").toUpperCase();
}

/**
 * Formatea valor en pesos colombianos: ej 49743719 -> "$ 49.743.719"
 */
export function formatCurrencyCOP(num: number): string {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(num);
}

export interface ParsedDocxResult {
    fileName: string;
    plainText: string;
    paragraphs: Array<{
        index: number;
        text: string;
    }>;
    detectedPlaceholders: string[]; // existing {{vars}} found in the doc
}

/**
 * Extrae texto y párrafos de un archivo .docx usando JSZip y parsing XML nativo
 * Seguro para ejecutarse tanto en el cliente (Browser) como en el servidor
 */
export async function parseDocxBuffer(fileBuffer: ArrayBuffer, fileName: string = "documento.docx"): Promise<ParsedDocxResult> {
    const zip = await JSZip.loadAsync(fileBuffer);
    const documentXmlFile = zip.file("word/document.xml");

    if (!documentXmlFile) {
        throw new Error("El archivo seleccionado no es un documento Word (.docx) válido o está dañado.");
    }

    const xmlContent = await documentXmlFile.async("string");

    // Parsear párrafos <w:p>
    const paragraphRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
    const textRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

    const paragraphs: Array<{ index: number; text: string }> = [];
    let pMatch: RegExpExecArray | null;
    let pIndex = 0;

    while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
        const pContent = pMatch[1];
        let pText = "";
        let tMatch: RegExpExecArray | null;

        while ((tMatch = textRegex.exec(pContent)) !== null) {
            pText += tMatch[1];
        }

        // Normalizar entidades XML
        const cleanText = pText
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();

        if (cleanText.length > 0) {
            paragraphs.push({
                index: pIndex++,
                text: cleanText
            });
        }
    }

    const fullPlainText = paragraphs.map(p => p.text).join("\n\n");

    // Buscar si ya existen placeholders de tipo {{variable}} o [VARIABLE]
    const placeholderRegex = /\{\{([a-zA-Z0-9_\-]+)\}\}/g;
    const detectedPlaceholdersSet = new Set<string>();
    let phMatch: RegExpExecArray | null;
    while ((phMatch = placeholderRegex.exec(fullPlainText)) !== null) {
        detectedPlaceholdersSet.add(phMatch[1]);
    }

    return {
        fileName,
        plainText: fullPlainText,
        paragraphs,
        detectedPlaceholders: Array.from(detectedPlaceholdersSet)
    };
}

/**
 * Genera el documento final en formato .docx conservando 100% de la estructura y estilos originales
 */
export async function generateFilledDocx(
    originalZipBuffer: ArrayBuffer,
    replacements: Array<{ search: string; replaceWith: string }>
): Promise<Blob> {
    const zip = await JSZip.loadAsync(originalZipBuffer);
    const documentXmlFile = zip.file("word/document.xml");

    if (!documentXmlFile) {
        throw new Error("Estructura de documento Word no válida.");
    }

    let xmlContent = await documentXmlFile.async("string");

    // Realizar sustitución en word/document.xml
    for (const { search, replaceWith } of replacements) {
        if (!search || !search.trim()) continue;

        const escapedReplace = (replaceWith || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

        // 1. Reemplazo directo en texto XML
        if (xmlContent.includes(search)) {
            xmlContent = xmlContent.replaceAll(search, escapedReplace);
        } else {
            // 2. Si el texto original tenía entidades XML escapadas
            const searchXmlEscaped = search
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            if (xmlContent.includes(searchXmlEscaped)) {
                xmlContent = xmlContent.replaceAll(searchXmlEscaped, escapedReplace);
            }
        }
    }

    // Actualizar el archivo dentro del zip
    zip.file("word/document.xml", xmlContent);

    // Generar el blob .docx
    return await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
}

/**
 * Crea un documento .docx básico de ejemplo (Tutela en Salud) si el usuario no tiene archivo a la mano
 */
export async function createDemoTutelaDocx(): Promise<Blob> {
    const zip = new JSZip();

    // [Content_Types].xml
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // _rels/.rels
    zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // word/document.xml con estructura jurídica estándar
    const sampleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>ACCIÓN DE TUTELA PARA LA PROTECCIÓN DEL DERECHO FUNDAMENTAL A LA SALUD</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>SEÑOR:</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>JUEZ MUNICIPAL O DE CIRCUITO (REPARTO)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Ciudad: BOGOTÁ D.C.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>REFERENCIA:</w:t></w:r>
      <w:r><w:t> Acción de Tutela interpuesta por </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>JUAN CARLOS PÉREZ GÓMEZ</w:t></w:r>
      <w:r><w:t>, identificado con cédula </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>1.098.765.432</w:t></w:r>
      <w:r><w:t>, contra </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>EPS SANITAS</w:t></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>I. HECHOS Y ANTECEDENTES</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>1. El suscrito accionante se encuentra afiliado a la entidad promotora de salud en calidad de cotizante.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>2. El médico tratante ordenó con carácter prioritario el procedimiento quirúrgico de reemplazo articular de rodilla izquierda debido a un dolor incapacitante y pérdida progresiva de movilidad.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>3. A la fecha de radicación de la presente acción, la entidad accionada no ha emitido la debida autorización ni agendado la intervención, vulnerando el principio de continuidad e integralidad en la atención médica.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>II. PRETENSIONES</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Primero: Tutelar el derecho fundamental a la salud, a la vida digna y a la integridad personal a favor de </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>JUAN CARLOS PÉREZ GÓMEZ</w:t></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Segundo: Ordenar a </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>EPS SANITAS</w:t></w:r>
      <w:r><w:t> que dentro de las 48 horas siguientes proceda a la autorización y programación integral del procedimiento requerido.</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>III. NOTIFICACIONES</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>El accionante recibirá notificaciones en el correo electrónico: juan.perez.example@gmail.com o al teléfono 3105559876.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    zip.folder("word")?.file("document.xml", sampleXml);

    return await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
}

export interface SmartClassDocxProject {
    app: "smartclass-docx-template";
    version: "1.0";
    exportedAt: string;
    projectName?: string;
    fileName: string;
    fileBase64?: string; // Archivo original .docx codificado en base64
    variables: TemplateVariable[];
    formValues?: Record<string, string>;
    signatures?: Record<string, DigitalSignatureData>;
    caseStory?: string;
    promptPresets?: PromptPreset[]; // Prompts de redacción personalizados
    metadata?: {
        paragraphsCount?: number;
        variablesCount?: number;
    };
}

/**
 * Convierte un ArrayBuffer a string en base64 de manera segura sin desbordamiento de pila
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // Bloques de 32KB
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, Math.min(i + chunkSize, len)) as unknown as number[]
        );
    }
    return btoa(binary);
}

/**
 * Convierte un string en base64 a ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Serializa y descarga el proyecto completo de SmartClass en un archivo JSON
 */
export function exportSmartClassProject(params: {
    fileName: string;
    rawZipBuffer?: ArrayBuffer | null;
    variables: TemplateVariable[];
    formValues?: Record<string, string>;
    signatures?: Record<string, DigitalSignatureData>;
    caseStory?: string;
    promptPresets?: PromptPreset[];
    paragraphsCount?: number;
}): void {
    const projectData: SmartClassDocxProject = {
        app: "smartclass-docx-template",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        projectName: params.fileName.replace(/\.docx$/i, ""),
        fileName: params.fileName,
        fileBase64: params.rawZipBuffer ? arrayBufferToBase64(params.rawZipBuffer) : undefined,
        variables: params.variables,
        formValues: params.formValues,
        signatures: params.signatures,
        caseStory: params.caseStory,
        promptPresets: params.promptPresets,
        metadata: {
            paragraphsCount: params.paragraphsCount,
            variablesCount: params.variables.length
        }
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const downloadName = (params.fileName.replace(/\.docx$/i, "") || "proyecto") + "_plantilla.smartclass.json";
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parsea y valida el contenido de un archivo JSON de proyecto SmartClass
 */
export function parseSmartClassProject(jsonText: string): SmartClassDocxProject {
    const data = JSON.parse(jsonText);
    if (!data || typeof data !== "object") {
        throw new Error("El archivo JSON no tiene un formato válido.");
    }
    if (!Array.isArray(data.variables)) {
        throw new Error("El archivo no contiene un arreglo de variables válido.");
    }
    return data as SmartClassDocxProject;
}

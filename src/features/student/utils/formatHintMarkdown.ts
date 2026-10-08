/**
 * Normaliza y formatea el texto de una pista de IA para garantizar que
 * los encabezados (###), listas numeradas y saltos de párrafo se rendericen
 * de manera espaciosa, estructurada y fácil de leer en Markdown.
 */
export function formatHintMarkdown(rawHint: string): string {
    if (!rawHint) return "";
    let text = rawHint.trim();

    // Normalizar saltos de línea Windows / Unix
    text = text.replace(/\r\n/g, "\n");

    // Insertar salto de línea doble antes de cualquier encabezado '###' no precedido por salto
    text = text.replace(/([^\n])\s*(###+)/g, "$1\n\n$2");

    // Asegurar espacio después de '###'
    text = text.replace(/^(###+)([^\s#])/gm, "$1 $2");

    // Si el texto inicia con un emoji o título sin '###', agregar '### '
    if (!text.startsWith("#")) {
        text = "### " + text;
    }

    // Separar título del encabezado del texto posterior si usa dos puntos
    // Ej: "### 💡 Enfoque clave: Imagina..." -> "### 💡 Enfoque clave\n\nImagina..."
    text = text.replace(/^(###\s+[^:\n]+):\s+/gm, "$1\n\n");

    // Separar elementos de lista numerada cuando vienen en una sola línea continua
    // Ej: "...paradigma. 2. Explica..." -> "...paradigma.\n\n2. Explica..."
    text = text.replace(/([.!?])\s+(\d+\.\s+)/g, "$1\n\n$2");

    return text.trim();
}

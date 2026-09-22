/**
 * Utilidad de formateo y embellecimiento de código fuente para múltiples lenguajes.
 * Restaura saltos de línea, sangrías e indentación cuando el código es minificado
 * o devuelto en una sola línea por modelos de IA o esquemas JSON.
 */

export function formatCodeString(code: string, fileNameOrLang: string = ''): string {
    if (!code || typeof code !== 'string') return '';
    const text = code.replace(/\r\n/g, '\n');
    const trimmed = text.trim();
    if (!trimmed) return '';

    const safeTarget = fileNameOrLang || '';
    const ext = safeTarget.includes('.') 
        ? safeTarget.split('.').pop()?.toLowerCase() || ''
        : safeTarget.toLowerCase();

    // 1. Lenguajes de la familia C (Java, TypeScript, JavaScript, C#, C++, PHP, Go, etc.)
    if (['java', 'js', 'jsx', 'ts', 'tsx', 'cs', 'cpp', 'c', 'h', 'hpp', 'php', 'kt', 'scala', 'go'].includes(ext)) {
        return formatCStyleCode(trimmed);
    }

    // 2. XML / HTML / POM.xml
    if (['xml', 'html', 'xhtml', 'svg', 'pom'].includes(ext)) {
        return formatXmlCode(trimmed);
    }

    // 3. JSON
    if (ext === 'json') {
        try {
            return JSON.stringify(JSON.parse(trimmed), null, 2);
        } catch {
            return trimmed;
        }
    }

    // 4. SQL
    if (ext === 'sql') {
        return formatSqlCode(trimmed);
    }

    return trimmed;
}

export function formatCStyleCode(code: string): string {
    let text = code;

    const initialLines = text.split('\n');
    const isSingleOrMinified = initialLines.length <= 4 && text.length > 60;

    // Solo transformar si está minificado o tiene palabras/declaraciones pegadas sin saltos de línea
    if (isSingleOrMinified || text.includes(';import') || text.includes(';@') || text.includes(';}') || text.includes(';public') || text.includes(';private')) {
        // 1. Despegar anotaciones pegadas a modificadores o keywords
        // Ej: @Servicepublic -> @Service\npublic, @Transactional(readOnly = true)public -> @Transactional(...)\npublic
        text = text.replace(/(@[a-zA-Z0-9_]+?(?:\([^)]*\))?)\s*(public|private|protected|class|interface|enum|record|void|int|long|boolean|String|final|static|abstract|@)/g, '$1\n$2');

        // 2. Separar punto y coma seguidos de cualquier statement, import, package o keyword
        text = text.replace(/;\s*([a-zA-Z0-9_@])/g, ';\n$1');

        // 3. Separar llaves de apertura { y cierre }
        text = text.replace(/{\s*([^}\s])/g, '{\n$1');
        text = text.replace(/;\s*}/g, ';\n}');
        // Separar llaves de cierre consecutivas: }} -> }\n}
        text = text.replace(/}+/g, (match) => match.split('').join('\n'));
        text = text.replace(/([^{;\s\n])\s*}/g, '$1;\n}');
        text = text.replace(/}\s*([a-zA-Z0-9_@])/g, '}\n$1');
        text = text.replace(/}\s*(else|catch|finally)/g, '}\n$1');
        text = text.replace(/(else|catch\s*\([^)]*\)|finally)\s*([^\{\s])/g, '$1\n$2');
        text = text.replace(/}\s*;/g, '}'); // Limpiar punto y coma espurios tras llaves de método o bloque
    }

    // 4. Formatear sangrías e indentación línea por línea
    const rawLines = text.split('\n');
    const formattedLines: string[] = [];
    let indent = 0;
    const tab = '    '; // 4 espacios estándar

    for (let rawLine of rawLines) {
        let line = rawLine.trim();
        if (!line) {
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
                formattedLines.push('');
            }
            continue;
        }

        // Si la línea comienza con llave de cierre, descontar indentación antes de agregarla
        const leadingCloses = (line.match(/^}+/g) || [''])[0].length;
        if (leadingCloses > 0) {
            indent = Math.max(0, indent - leadingCloses);
        }

        formattedLines.push(tab.repeat(indent) + line);

        // Calcular indentación para la siguiente línea
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        indent = Math.max(0, indent + opens - (closes - leadingCloses));
    }

    let result = formattedLines.join('\n');
    // Separar paquete e imports con líneas en blanco
    result = result.replace(/(package\s+[^;]+;)\n(?!\n)/g, '$1\n\n');
    result = result.replace(/((?:import\s+[^;]+;\n)+)(?!\n)/g, '$1\n');

    return result.trim() + '\n';
}

export function formatXmlCode(xml: string): string {
    let formatted = '';
    let indent = 0;
    const tab = '    ';
    const clean = xml.replace(/>\s*</g, '><').trim();
    const nodes = clean.split(/(<[^>]+>)/g).filter(Boolean);

    for (let node of nodes) {
        node = node.trim();
        if (!node) continue;

        if (node.startsWith('<?') || node.startsWith('<!')) {
            formatted += node + '\n';
        } else if (node.startsWith('</')) {
            indent = Math.max(0, indent - 1);
            formatted += tab.repeat(indent) + node + '\n';
        } else if (node.startsWith('<') && !node.endsWith('/>') && !node.includes('</')) {
            formatted += tab.repeat(indent) + node + '\n';
            indent++;
        } else if (node.startsWith('<') && node.endsWith('/>')) {
            formatted += tab.repeat(indent) + node + '\n';
        } else {
            if (formatted.endsWith('\n')) {
                formatted = formatted.slice(0, -1);
            }
            formatted += node;
        }
    }

    return formatted.trim() + '\n';
}

export function formatSqlCode(sql: string): string {
    const isSingle = sql.split('\n').length <= 2;
    if (!isSingle) return sql;

    let text = sql;
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'];
    
    for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        text = text.replace(regex, `\n${kw}`);
    }

    return text.split('\n').map(l => l.trim()).filter(Boolean).join('\n') + '\n';
}

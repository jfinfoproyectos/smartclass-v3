import { githubService } from "./githubService";
import { getAIModel, extractJSON } from "@/features/teacher/services/ai/client";
import { generateText } from "ai";
import os from "os";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface RepoAnalysisResult {
    owner: string;
    repo: string;
    branch: string;
    fullName: string;
    description: string;
    stars: number;
    forks: number;
    primaryLanguage: string;
    detectedStacks: string[];
    frameworks: string[];
    databases: string[];
    uiLibraries: string[];
    tools: string[];
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    envVars: string[];
    keyDirectories: string[];
    fileStructureSnippet: string;
    hasDocker: boolean;
    hasTests: boolean;
    hasCiCd: boolean;
}

export type ReadmeSectionKey = 
    | "badges"
    | "description"
    | "features"
    | "architecture"
    | "techStack"
    | "projectStructure"
    | "prerequisites"
    | "installation"
    | "environmentVariables"
    | "scripts"
    | "apiEndpoints"
    | "testing"
    | "troubleshooting"
    | "roadmap"
    | "contributing"
    | "license";

export type MermaidDiagramType = "flowchart" | "sequence" | "erDiagram" | "c4";
export type DocumentationTone = "professional" | "educational" | "minimal" | "enterprise";

export interface ManualProjectInput {
    name: string;
    description: string;
    primaryLanguage?: string;
    stacks: string[];
    frameworks?: string[];
    databases?: string[];
    tools?: string[];
    envVars?: string[];
    keyDirectories?: string[];
    author?: string;
}

export interface DocsGenerationOptions {
    language: "es" | "en";
    licenseType: "MIT" | "Apache-2.0" | "GPL-3.0" | "BSD-3-Clause" | "ISC" | "Unlicense";
    authorName: string;
    includeMermaid: boolean;
    mermaidType?: MermaidDiagramType;
    documentationStyle?: DocumentationTone;
    readmeSections?: Partial<Record<ReadmeSectionKey, boolean>>;
    projectScope?: string;
    targetFiles: {
        readme: boolean;
        license: boolean;
        gitignore: boolean;
        envExample: boolean;
        contributing: boolean;
        codeOfConduct: boolean;
        architecture?: boolean;
        apiDocs?: boolean;
        deployment?: boolean;
        security?: boolean;
        changelog?: boolean;
    };
}

export interface GeneratedDocsResult {
    readme?: string;
    license?: string;
    gitignore?: string;
    envExample?: string;
    contributing?: string;
    codeOfConduct?: string;
    architecture?: string;
    apiDocs?: string;
    deployment?: string;
    security?: string;
    changelog?: string;
    mermaidDiagram?: string;
}

// Licencias Abiertas Estándar
export function getStandardLicense(licenseType: DocsGenerationOptions["licenseType"], author: string, year: number = new Date().getFullYear()): string {
    const cleanAuthor = author.trim() || "Contributors";
    switch (licenseType) {
        case "MIT":
            return `MIT License

Copyright (c) ${year} ${cleanAuthor}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

        case "Apache-2.0":
            return `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Copyright ${year} ${cleanAuthor}

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.`;

        case "GPL-3.0":
            return `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) ${year} ${cleanAuthor}

Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`;

        case "BSD-3-Clause":
            return `BSD 3-Clause License

Copyright (c) ${year}, ${cleanAuthor}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

        case "ISC":
            return `ISC License

Copyright (c) ${year} ${cleanAuthor}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

        case "Unlicense":
            return `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>`;

        default:
            return `MIT License\n\nCopyright (c) ${year} ${cleanAuthor}\n\nPermission is hereby granted, free of charge...`;
    }
}

// Generador de .gitignore Adaptado Inteligente
export function getTailoredGitIgnore(analysis: RepoAnalysisResult): string {
    const sections: string[] = [
        `# =========================================================================`,
        `# .gitignore compilado automáticamente para: ${analysis.fullName}`,
        `# Generado con SmartClass AI Git Docs Suite`,
        `# =========================================================================\n`
    ];

    // Variables de entorno y secretos
    sections.push(`# Archivos de Entorno y Credenciales`);
    sections.push(`.env`);
    sections.push(`.env.local`);
    sections.push(`.env.development.local`);
    sections.push(`.env.test.local`);
    sections.push(`.env.production.local`);
    sections.push(`*.pem`);
    sections.push(`*.key\n`);

    // Logs & Debugging
    sections.push(`# Logs y Registros`);
    sections.push(`logs`);
    sections.push(`*.log`);
    sections.push(`npm-debug.log*`);
    sections.push(`yarn-debug.log*`);
    sections.push(`yarn-error.log*`);
    sections.push(`pnpm-debug.log*\n`);

    // Node.js & Javascript/TypeScript
    if (analysis.detectedStacks.includes("JavaScript") || analysis.detectedStacks.includes("TypeScript") || analysis.frameworks.some(f => ["Next.js", "React", "Vue", "Express", "NestJS"].includes(f))) {
        sections.push(`# Node.js y Gestores de Paquetes`);
        sections.push(`node_modules/`);
        sections.push(`jspm_packages/`);
        sections.push(`.npm`);
        sections.push(`.pnpm-store`);
        sections.push(`.yarn/cache`);
        sections.push(`.yarn/unplugged\n`);

        if (analysis.frameworks.includes("Next.js")) {
            sections.push(`# Next.js Build`);
            sections.push(`.next/`);
            sections.push(`out/\n`);
        }

        sections.push(`# Compilaciones y Salidas`);
        sections.push(`dist/`);
        sections.push(`build/`);
        sections.push(`.tsbuildinfo\n`);
    }

    // Python
    if (analysis.detectedStacks.includes("Python") || analysis.frameworks.some(f => ["Django", "FastAPI", "Flask"].includes(f))) {
        sections.push(`# Python y Entornos Virtuales`);
        sections.push(`__pycache__/`);
        sections.push(`*.py[cod]`);
        sections.push(`*$py.class`);
        sections.push(`.Python`);
        sections.push(`build/`);
        sections.push(`develop-eggs/`);
        sections.push(`dist/`);
        sections.push(`downloads/`);
        sections.push(`eggs/`);
        sections.push(`.eggs/`);
        sections.push(`lib/`);
        sections.push(`lib64/`);
        sections.push(`parts/`);
        sections.push(`sdist/`);
        sections.push(`var/`);
        sections.push(`wheels/`);
        sections.push(`*.egg-info/`);
        sections.push(`.installed.cfg`);
        sections.push(`*.egg`);
        sections.push(`.env`);
        sections.push(`.venv`);
        sections.push(`env/`);
        sections.push(`venv/`);
        sections.push(`ENV/\n`);
    }

    // Java / Maven / Gradle
    if (analysis.detectedStacks.includes("Java") || analysis.frameworks.includes("Spring Boot")) {
        sections.push(`# Java, Maven y Gradle`);
        sections.push(`*.class`);
        sections.push(`target/`);
        sections.push(`.gradle/`);
        sections.push(`build/`);
        sections.push(`!gradle/wrapper/gradle-wrapper.jar\n`);
    }

    // Docker
    if (analysis.hasDocker) {
        sections.push(`# Docker`);
        sections.push(`.dockerignore.bak`);
        sections.push(`docker-compose.override.yml\n`);
    }

    // IDEs y Sistemas Operativos
    sections.push(`# Editores y Sistema Operativo`);
    sections.push(`.DS_Store`);
    sections.push(`Thumbs.db`);
    sections.push(`.idea/`);
    sections.push(`.vscode/*`);
    sections.push(`!.vscode/settings.json`);
    sections.push(`!.vscode/tasks.json`);
    sections.push(`!.vscode/launch.json`);
    sections.push(`!.vscode/extensions.json`);
    sections.push(`*.swp`);
    sections.push(`*.swo`);

    return sections.join("\n");
}

// Generador de Código de Conducta
export function getCodeOfConduct(author: string = "SmartClass Community"): string {
    return `# Código de Conducta de la Comunidad

## Nuestro Compromiso

Nosotros, como miembros, contribuyentes y líderes de este proyecto, nos comprometemos a hacer que la participación en nuestra comunidad sea una experiencia libre de acoso para todos, independientemente de la edad, tamaño corporal, discapacidad visible o invisible, etnicidad, características sexuales, identidad y expresión de género, nivel de experiencia, educación, nivel socioeconómico, nacionalidad, apariencia personal, raza, casta, color, religión o identidad y orientación sexual.

Nos comprometemos a actuar e interactuar de maneras que contribuyan a una comunidad abierta, acogedora, diversa, inclusiva y saludable.

## Nuestros Estándares

Ejemplos de comportamientos que contribuyen a un ambiente positivo:
* Demostrar empatía y amabilidad hacia otras personas.
* Respetar las opiniones, puntos de vista y experiencias contrarias.
* Dar y aceptar adecuadamente retroalimentación constructiva.
* Aceptar la responsabilidad y disculparse con los afectados por nuestros errores, aprendiendo de la experiencia.
* Centrarse en lo que es mejor no solo para nosotros como individuos, sino para la comunidad en general.

Ejemplos de comportamientos inaceptables:
* El uso de lenguaje o imágenes sexualizadas, y atención o avances sexuales no deseados.
* Comentarios despectivos, ataques personales o políticos (*trolling*).
* Acoso público o privado.
* Publicar información privada de otros, como direcciones físicas o electrónicas, sin su permiso explícito.
* Otras conductas que razonablemente puedan considerarse inapropiadas en un entorno profesional.

## Cumplimiento y Reportes

Los casos de comportamiento abusivo, acosador o de otra manera inaceptable pueden ser reportados a los líderes del proyecto responsables del cumplimiento de este código de conducta. Todas las quejas serán revisadas e investigadas de manera justa y oportuna.

## Atribución

Este Código de Conducta es una adaptación del [Contributor Covenant](https://www.contributor-covenant.org), versión 2.1.`;
}

// Generador de Política de Seguridad Oficial
export function getSecurityPolicy(
    author: string = "SmartClass Team", 
    repoName: string = "Proyecto",
    contactEmail: string = "security@smartclass.edu.co"
): string {
    return `# Política de Seguridad y Reporte de Vulnerabilidades

## Versiones Soportadas

Actualmente proporcionamos actualizaciones de seguridad y parches críticos para las siguientes versiones:

| Versión | Soportada | Estado de Mantenimiento |
| :--- | :--- | :--- |
| **v1.x / Main** | :white_check_mark: | Soporte Activo |
| < v1.0 | :x: | Sin soporte / Obsoleta |

## Reportar una Vulnerabilidad

Nos tomamos muy en serio la seguridad de nuestros usuarios y del software. Si descubres una vulnerabilidad potencial de seguridad en **${repoName}**, por favor repórtala de forma responsable y coordinada.

### Proceso de Reporte
1. **NO abras un Issue público** en GitHub para reportar vulnerabilidades críticas de seguridad o exposición de credenciales.
2. Envía un correo electrónico detallado a: **${contactEmail}** (o al responsable: **${author}**).
3. Incluye en tu reporte:
   - Descripción clara de la vulnerabilidad y su impacto potencial.
   - Pasos reproducibles detallados o prueba de concepto (PoC).
   - Componentes o endpoints afectados.
   - Si es posible, sugerencias de mitigación o parche.

### Tiempo de Respuesta y Compromiso
- Acusaremos recibo de tu reporte en un plazo máximo de **48 horas hábiles**.
- Evaluaremos la severidad y mantendremos al reportador informado del avance de la mitigación.
- Una vez desplegado el parche, se otorgará el debido crédito al investigador en las notas de lanzamiento si así lo desea.

¡Agradecemos tu colaboración para mantener el ecosistema de software seguro!`;
}

// Generador de Plantilla Estándar de CHANGELOG (Keep a Changelog)
export function getChangelogTemplate(projectName: string = "Proyecto", version: string = "1.0.0"): string {
    const today = new Date().toISOString().split("T")[0];
    return `# Registro de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Sin Publicar] - Unreleased
### Añadido
- Mejoras de rendimiento en consultas y optimización de carga.
- Documentación técnica expandida y cobertura de pruebas.

## [${version}] - ${today}
### Añadido
- Versión inicial de producción de **${projectName}**.
- Arquitectura modular desacoplada con buenas prácticas de ingeniería.
- Integración de suite de gobernanza (.env.example, .gitignore, licencias).
- Diagramas de arquitectura y especificación de flujos del sistema.

### Seguridad
- Configuración de variables de entorno protegidas y políticas de acceso.`;
}

/**
 * Convierte datos de un proyecto manual o local a un RepoAnalysisResult
 * para permitir generar documentación sin necesidad de repositorio remoto en GitHub
 */
export function createAnalysisFromManualData(input: ManualProjectInput): RepoAnalysisResult {
    const primaryLang = input.primaryLanguage || (input.stacks[0] ?? "TypeScript");
    const safeName = input.name.trim() || "mi-proyecto";
    const author = input.author?.trim() || "Autor";
    const stacks = input.stacks && input.stacks.length > 0 ? input.stacks : [primaryLang];
    const frameworks = input.frameworks || [];
    const databases = input.databases || [];
    const tools = input.tools || (stacks.includes("Docker") ? ["Docker"] : []);

    const dirs = input.keyDirectories && input.keyDirectories.length > 0 
        ? input.keyDirectories 
        : ["src", "components", "pages", "public", "tests"];

    const snippet = dirs.map(d => `${d}/`).join("\n");
    const hasDocker = tools.includes("Docker") || stacks.includes("Docker");

    return {
        owner: author,
        repo: safeName,
        branch: "main",
        fullName: `${author}/${safeName}`,
        description: input.description.trim() || "Proyecto de software profesional con arquitectura modular y buenas prácticas de ingeniería.",
        stars: 0,
        forks: 0,
        primaryLanguage: primaryLang,
        detectedStacks: stacks,
        frameworks,
        databases,
        uiLibraries: [],
        tools,
        scripts: {
            "dev": "npm run dev",
            "build": "npm run build",
            "start": "npm start",
            "test": "npm test"
        },
        dependencies: {},
        devDependencies: {},
        envVars: input.envVars && input.envVars.length > 0 ? input.envVars : ["PORT", "DATABASE_URL", "NODE_ENV"],
        keyDirectories: dirs,
        fileStructureSnippet: snippet,
        hasDocker,
        hasTests: true,
        hasCiCd: false
    };
}

export const gitDocsService = {
    /**
     * Inspecciona a fondo el repositorio en GitHub y extrae toda la estructura técnica
     */
    async analyzeRepo(
        owner: string,
        repo: string,
        branch: string = "HEAD",
        token?: string
    ): Promise<RepoAnalysisResult> {
        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 1. Obtener detalles básicos del repositorio
        let description = "";
        let stars = 0;
        let forks = 0;
        let defaultBranch = "main";
        let primaryLanguage = "Unknown";

        try {
            const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (repoRes.ok) {
                const repoData = await repoRes.json();
                description = repoData.description || "";
                stars = repoData.stargazers_count || 0;
                forks = repoData.forks_count || 0;
                defaultBranch = repoData.default_branch || "main";
                primaryLanguage = repoData.language || "Unknown";
            }
        } catch (e) {
            console.warn("[gitDocsService] Error al consultar datos del repositorio:", e);
        }

        const effectiveBranch = branch && branch !== "HEAD" ? branch : defaultBranch;

        // 2. Obtener árbol completo de archivos
        const allPaths = await githubService.getRepoStructure(owner, repo, effectiveBranch, token);

        // 3. Detectar stack tecnológico y dependencias
        const detectedStacksSet = new Set<string>();
        const frameworksSet = new Set<string>();
        const databasesSet = new Set<string>();
        const uiLibrariesSet = new Set<string>();
        const toolsSet = new Set<string>();
        const scripts: Record<string, string> = {};
        const dependencies: Record<string, string> = {};
        const devDependencies: Record<string, string> = {};
        const envVarsSet = new Set<string>();

        if (primaryLanguage && primaryLanguage !== "Unknown") {
            detectedStacksSet.add(primaryLanguage);
        }

        // Detectar por extensiones presentes en el árbol
        if (allPaths.some(p => p.endsWith(".ts") || p.endsWith(".tsx"))) detectedStacksSet.add("TypeScript");
        if (allPaths.some(p => p.endsWith(".js") || p.endsWith(".jsx") || p.endsWith(".mjs"))) detectedStacksSet.add("JavaScript");
        if (allPaths.some(p => p.endsWith(".py"))) detectedStacksSet.add("Python");
        if (allPaths.some(p => p.endsWith(".java"))) detectedStacksSet.add("Java");
        if (allPaths.some(p => p.endsWith(".go"))) detectedStacksSet.add("Go");
        if (allPaths.some(p => p.endsWith(".rs"))) detectedStacksSet.add("Rust");
        if (allPaths.some(p => p.endsWith(".php"))) detectedStacksSet.add("PHP");
        if (allPaths.some(p => p.endsWith(".cs"))) detectedStacksSet.add("C#");

        const hasDocker = allPaths.some(p => p.toLowerCase().includes("dockerfile") || p.toLowerCase().includes("docker-compose"));
        if (hasDocker) toolsSet.add("Docker");

        const hasCiCd = allPaths.some(p => p.startsWith(".github/workflows"));
        if (hasCiCd) toolsSet.add("GitHub Actions");

        const hasTests = allPaths.some(p => 
            p.includes(".test.") || 
            p.includes(".spec.") || 
            p.includes("__tests__") || 
            p.includes("test_")
        );
        if (hasTests) toolsSet.add("Automated Testing");

        // 4. Descargar e interpretar manifiestos
        // A. Node.js (package.json)
        if (allPaths.includes("package.json")) {
            const pkgContent = await githubService.getFileContent(owner, repo, "package.json", effectiveBranch, token);
            if (pkgContent) {
                try {
                    const pkg = JSON.parse(pkgContent);
                    if (pkg.description && !description) description = pkg.description;
                    if (pkg.scripts) Object.assign(scripts, pkg.scripts);
                    if (pkg.dependencies) Object.assign(dependencies, pkg.dependencies);
                    if (pkg.devDependencies) Object.assign(devDependencies, pkg.devDependencies);

                    const allDeps = { ...dependencies, ...devDependencies };
                    if (allDeps["next"]) frameworksSet.add("Next.js");
                    if (allDeps["react"]) frameworksSet.add("React");
                    if (allDeps["vue"]) frameworksSet.add("Vue");
                    if (allDeps["svelte"]) frameworksSet.add("Svelte");
                    if (allDeps["@angular/core"]) frameworksSet.add("Angular");
                    if (allDeps["express"]) frameworksSet.add("Express.js");
                    if (allDeps["@nestjs/core"]) frameworksSet.add("NestJS");
                    if (allDeps["fastify"]) frameworksSet.add("Fastify");

                    // UI / CSS
                    if (allDeps["tailwindcss"]) uiLibrariesSet.add("Tailwind CSS");
                    if (allDeps["@radix-ui/react-slot"] || allDeps["shadcn-ui"]) uiLibrariesSet.add("Shadcn UI");
                    if (allDeps["@mui/material"]) uiLibrariesSet.add("Material UI");
                    if (allDeps["framer-motion"]) uiLibrariesSet.add("Framer Motion");
                    if (allDeps["lucide-react"]) uiLibrariesSet.add("Lucide Icons");

                    // Databases / ORM
                    if (allDeps["@prisma/client"] || allDeps["prisma"]) databasesSet.add("Prisma ORM");
                    if (allDeps["drizzle-orm"]) databasesSet.add("Drizzle ORM");
                    if (allDeps["mongoose"]) databasesSet.add("MongoDB / Mongoose");
                    if (allDeps["pg"]) databasesSet.add("PostgreSQL");
                    if (allDeps["mysql2"]) databasesSet.add("MySQL");
                    if (allDeps["redis"] || allDeps["ioredis"]) databasesSet.add("Redis");
                    if (allDeps["better-auth"]) toolsSet.add("Better-Auth");
                    if (allDeps["next-auth"]) toolsSet.add("NextAuth.js");
                    if (allDeps["zod"]) toolsSet.add("Zod Validation");
                } catch {
                    // ignore JSON parse errors
                }
            }
        }

        // B. Python (requirements.txt o pyproject.toml)
        if (allPaths.includes("requirements.txt")) {
            const reqContent = await githubService.getFileContent(owner, repo, "requirements.txt", effectiveBranch, token);
            if (reqContent) {
                const lower = reqContent.toLowerCase();
                if (lower.includes("django")) frameworksSet.add("Django");
                if (lower.includes("fastapi")) frameworksSet.add("FastAPI");
                if (lower.includes("flask")) frameworksSet.add("Flask");
                if (lower.includes("sqlalchemy")) databasesSet.add("SQLAlchemy");
                if (lower.includes("psycopg2") || lower.includes("asyncpg")) databasesSet.add("PostgreSQL");
                if (lower.includes("pymongo")) databasesSet.add("MongoDB");
                if (lower.includes("pandas")) toolsSet.add("Pandas / Data Science");
            }
        }

        // C. Java (pom.xml o build.gradle)
        if (allPaths.includes("pom.xml") || allPaths.includes("build.gradle")) {
            frameworksSet.add("Spring Boot");
        }

        // 5. Escaneo de variables de entorno (en archivos .env.example, config, docker, etc.)
        const envFiles = allPaths.filter(p => p.includes(".env") || p.includes("config.") || p.endsWith(".conf"));
        for (const envFile of envFiles.slice(0, 5)) {
            const envContent = await githubService.getFileContent(owner, repo, envFile, effectiveBranch, token);
            if (envContent) {
                const envRegex = /(?:process\.env\.|os\.environ\.get\(['"]|System\.getenv\(['"]|^)([A-Z0-9_]{3,45})/gm;
                let match;
                while ((match = envRegex.exec(envContent)) !== null) {
                    if (match[1] && !["NODE_ENV", "PATH", "HOME", "USER", "PORT"].includes(match[1])) {
                        envVarsSet.add(match[1]);
                    }
                }
            }
        }

        // Si hay prisma/schema.prisma, buscar variables de DATABASE_URL
        if (allPaths.some(p => p.endsWith("schema.prisma"))) {
            envVarsSet.add("DATABASE_URL");
        }

        // 6. Resumen de directorios principales y árbol representativo
        const dirSet = new Set<string>();
        allPaths.forEach(p => {
            const parts = p.split('/');
            if (parts.length > 1) {
                dirSet.add(parts[0]);
            }
        });

        const keyDirectories = Array.from(dirSet).filter(d => 
            !d.startsWith(".") && !["node_modules", "dist", "build", "vendor"].includes(d)
        ).slice(0, 15);

        // Estructura simplificada para el prompt
        const topLevelSample = allPaths
            .filter(p => {
                const depth = p.split('/').length;
                return depth <= 3 && !p.includes("node_modules") && !p.includes(".git");
            })
            .slice(0, 40)
            .join("\n");

        return {
            owner,
            repo,
            branch: effectiveBranch,
            fullName: `${owner}/${repo}`,
            description: description || "Proyecto de software profesional con arquitectura modular y buenas prácticas de ingeniería.",
            stars,
            forks,
            primaryLanguage,
            detectedStacks: Array.from(detectedStacksSet),
            frameworks: Array.from(frameworksSet),
            databases: Array.from(databasesSet),
            uiLibraries: Array.from(uiLibrariesSet),
            tools: Array.from(toolsSet),
            scripts,
            dependencies,
            devDependencies,
            envVars: Array.from(envVarsSet),
            keyDirectories,
            fileStructureSnippet: topLevelSample,
            hasDocker,
            hasTests,
            hasCiCd
        };
    },

    /**
     * Genera el README.md profesional con diagramas Mermaid y suite de documentación usando LLM
     */
    async generateDocsWithAi(
        analysis: RepoAnalysisResult,
        options: DocsGenerationOptions,
        userId?: string
    ): Promise<GeneratedDocsResult> {
        const model = await getAIModel(userId);
        const result: GeneratedDocsResult = {};

        // 1. Archivos estáticos o basados en plantilla garantizados al instante
        if (options.targetFiles.license) {
            result.license = getStandardLicense(options.licenseType, options.authorName || analysis.owner);
        }

        if (options.targetFiles.gitignore) {
            result.gitignore = getTailoredGitIgnore(analysis);
        }

        if (options.targetFiles.codeOfConduct) {
            result.codeOfConduct = getCodeOfConduct(options.authorName || "SmartClass Community");
        }

        if (options.targetFiles.security) {
            result.security = getSecurityPolicy(
                options.authorName || analysis.owner, 
                analysis.repo, 
                `security@${(analysis.owner || "smartclass").toLowerCase()}.edu.co`
            );
        }

        if (options.targetFiles.changelog) {
            result.changelog = getChangelogTemplate(analysis.repo, "1.0.0");
        }

        // 2. Generar README.md con secciones personalizadas y diagrama Mermaid
        if (options.targetFiles.readme) {
            const sections = options.readmeSections || {
                badges: true,
                description: true,
                features: true,
                architecture: true,
                techStack: true,
                projectStructure: true,
                prerequisites: true,
                installation: true,
                environmentVariables: true,
                scripts: true,
                apiEndpoints: true,
                testing: true,
                troubleshooting: true,
                roadmap: true,
                contributing: true,
                license: true
            };

            const diagramType = options.mermaidType || "flowchart";
            const docStyle = options.documentationStyle || "professional";

            let diagramPrompt = "";
            if (options.includeMermaid && sections.architecture !== false) {
                switch (diagramType) {
                    case "sequence":
                        diagramPrompt = `Incluye un bloque de código mermaid (\`\`\`mermaid\\nsequenceDiagram ...) que modele el flujo secuencial de extremo a extremo de la interacción principal del usuario o cliente con la API/servicios y base de datos. Asegúrate de que los nombres de los participantes sean claros y no contengan caracteres especiales conflictivos.`;
                        break;
                    case "erDiagram":
                        diagramPrompt = `Incluye un bloque de código mermaid (\`\`\`mermaid\\nerDiagram ...) que represente las entidades principales del modelo de datos del sistema, sus atributos clave y las relaciones con cardinalidad (ej: 1 a N, N a M).`;
                        break;
                    case "c4":
                        diagramPrompt = `Incluye un bloque de código mermaid (\`\`\`mermaid\\nflowchart TB ...) que represente un diagrama C4 de componentes: Usuario -> Frontend Container -> API Gateway/Controllers -> Service Layer -> Database / External APIs, con subgrafos limpios.`;
                        break;
                    case "flowchart":
                    default:
                        diagramPrompt = `Incluye un bloque de código mermaid (\`\`\`mermaid\\nflowchart TD ...) que modele la arquitectura de alto nivel del sistema en capas: Clientes / UI -> API & Middleware -> Lógica de Negocio / Servicios -> Base de Datos / Almacenamiento. El diagrama debe ser sintácticamente impecable, sin caracteres no escapados dentro de los nodos.`;
                        break;
                }
            }

            let tonePrompt = "";
            switch (docStyle) {
                case "educational":
                    tonePrompt = `El tono debe ser didáctico, claro y pedagógico, excelente para estudiantes y docentes universitarios o del SENA. Explica los conceptos clave con rigor y claridad, guiando al aprendiz en cada paso.`;
                    break;
                case "minimal":
                    tonePrompt = `El tono debe ser conciso, directo y al grano. Evita párrafos largos, prioriza comandos listos para copiar, tablas limpias y viñetas ejecutables.`;
                    break;
                case "enterprise":
                    tonePrompt = `El tono debe ser corporativo de nivel Enterprise. Destaca la robustez, alta disponibilidad, observabilidad, seguridad de datos, diseño desacoplado y estándares de cumplimiento.`;
                    break;
                case "professional":
                default:
                    tonePrompt = `El tono debe ser de ingeniería de software profesional de clase mundial, similar a los mejores proyectos open source de GitHub (como Next.js, FastAPI, Prisma).`;
                    break;
            }

            // Construir lista de secciones activas para el prompt
            const activeSectionsList: string[] = [];
            if (sections.badges !== false) activeSectionsList.push("- Badges oficiales con shields.io (Licencia, Versión, Estrellas, Stacks con logos de Simple Icons).");
            if (sections.description !== false) activeSectionsList.push("- Resumen ejecutivo y propuesta de valor clara (problema que resuelve el proyecto).");
            if (sections.features !== false) activeSectionsList.push("- Características principales (Key Features) destacadas con viñetas elegantes y emojis contextuales.");
            if (options.includeMermaid && sections.architecture !== false) activeSectionsList.push(`- Arquitectura del Sistema (Mermaid): ${diagramPrompt}`);
            if (sections.techStack !== false) activeSectionsList.push("- Stack Tecnológico: Tabla con Categoría, Tecnología, Versión/Uso y Justificación.");
            if (sections.projectStructure !== false) activeSectionsList.push("- Estructura de Directorios: Árbol ASCII estructurado con comentarios de las carpetas clave.");
            if (sections.prerequisites !== false) activeSectionsList.push("- Requisitos Previos (Node.js, Python, Docker, Base de datos, etc.).");
            if (sections.installation !== false) activeSectionsList.push("- Guía de Instalación y Puesta en Marcha paso a paso (git clone, dependencias, levantar servidor).");
            if (sections.environmentVariables !== false) activeSectionsList.push("- Variables de Entorno: Breve resumen de variables necesarias (hacer referencia a .env.example).");
            if (sections.scripts !== false) activeSectionsList.push("- Scripts Disponibles: Tabla de comandos (dev, build, start, test, lint).");
            if (sections.apiEndpoints !== false) activeSectionsList.push("- Endpoints Principales / Rutas de API: Tabla o lista con método HTTP, ruta y breve descripción.");
            if (sections.testing !== false) activeSectionsList.push("- Pruebas y Calidad de Código: Cómo ejecutar suites de pruebas unitarias o de integración.");
            if (sections.troubleshooting !== false) activeSectionsList.push("- Solución de Problemas Comunes (FAQ / Troubleshooting).");
            if (sections.roadmap !== false) activeSectionsList.push("- Hoja de Ruta (Roadmap) con próximas mejoras.");
            if (sections.contributing !== false) activeSectionsList.push("- Contribución: Enlace e invitación a CONTRIBUTING.md.");
            if (sections.license !== false) activeSectionsList.push(`- Licencia: Enlace e indicación de licencia ${options.licenseType}.`);

            const readmeSystemPrompt = `Eres un Staff Software Engineer, Tech Lead y Experto en Documentación Técnica Open Source.
Tu objetivo es crear el README.md definitivo para un repositorio de software.

DIRECTRICES:
${tonePrompt}

SECCIONES SOLICITADAS QUE DEBES INCLUIR ESTRICTAMENTE:
${activeSectionsList.join("\n")}

REGLA CRÍTICA:
- NO agregues secciones que no fueron solicitadas.
- Si se solicitó diagrama Mermaid, asegúrate de que sea 100% válido sintácticamente. No uses caracteres como paréntesis o llaves dentro de etiquetas de nodo a menos que estén dentro de comillas (ej: A["Texto (detalles)"] --> B).
- IDIOMA: ${options.language === "es" ? "Español profesional" : "Professional English"}.`;

            const readmeUserPrompt = `Genera el archivo README.md completo para el siguiente repositorio:
Nombre: ${analysis.fullName}
Descripción actual: ${analysis.description}
Rama principal: ${analysis.branch}
Autor / Organización: ${options.authorName || analysis.owner}
Stack detectado: ${analysis.detectedStacks.join(", ")}
Frameworks: ${analysis.frameworks.join(", ")}
Bases de datos: ${analysis.databases.join(", ")}
Bibliotecas UI: ${analysis.uiLibraries.join(", ")}
Herramientas: ${analysis.tools.join(", ")}
Scripts de package.json: ${JSON.stringify(analysis.scripts)}
Variables de entorno encontradas: ${analysis.envVars.join(", ")}
Directorios detectados: ${analysis.keyDirectories.join(", ")}
Muestra de estructura:
${analysis.fileStructureSnippet}

${options.projectScope ? `Instrucciones o alcance adicional provisto por el usuario: "${options.projectScope}"` : ""}

Entrega ÚNICAMENTE el contenido del README.md en formato Markdown limpio, sin texto introductorio antes ni después.`;

            try {
                const readmeRes = await generateText({
                    model,
                    system: readmeSystemPrompt,
                    prompt: readmeUserPrompt,
                    temperature: 0.25,
                });

                result.readme = readmeRes.text.trim();

                const mermaidMatch = result.readme.match(/```mermaid\n([\s\S]*?)\n```/);
                if (mermaidMatch && mermaidMatch[1]) {
                    result.mermaidDiagram = mermaidMatch[1].trim();
                }
            } catch (err: any) {
                console.error("[gitDocsService] Error al generar README con IA:", err);
                result.readme = `# ${analysis.repo}\n\n${analysis.description}\n\n## Stack Tecnológico\n- ${analysis.detectedStacks.join("\n- ")}`;
            }
        }

        // 3. Generar .env.example con IA
        if (options.targetFiles.envExample) {
            const envSystemPrompt = `Eres un Ingeniero DevOps y Arquitecto de Software.
Genera un archivo .env.example documentado, limpio y profesional para el proyecto.
Debe contener todas las variables de entorno necesarias para levantar el proyecto localmente.
Para cada variable:
- Agrega un comentario explicativo arriba indicando su propósito o cómo obtenerla.
- Asigna un valor de ejemplo o placeholder coherente (ej: DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public", NEXT_PUBLIC_API_URL="http://localhost:3000").
- No inventes contraseñas reales.
- Agrupa las variables por sección (# Database, # Authentication, # API Keys, # App Config).

Responde ÚNICAMENTE con el contenido exacto del archivo .env.example en texto plano, sin bloques de código markdown ni explicaciones adicionales.`;

            const envUserPrompt = `Proyecto: ${analysis.fullName}
Stack: ${analysis.detectedStacks.concat(analysis.frameworks).join(", ")}
Bases de datos: ${analysis.databases.join(", ")}
Variables de entorno detectadas: ${analysis.envVars.join(", ")}`;

            try {
                const envRes = await generateText({
                    model,
                    system: envSystemPrompt,
                    prompt: envUserPrompt,
                    temperature: 0.1,
                });
                result.envExample = envRes.text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
            } catch (err) {
                console.error("[gitDocsService] Error generando .env.example:", err);
                result.envExample = analysis.envVars.map(v => `# Variable de configuración\n${v}=""\n`).join("\n");
            }
        }

        // 4. Generar CONTRIBUTING.md con IA
        if (options.targetFiles.contributing) {
            const contribSystemPrompt = `Eres un Líder Técnico de Ingeniería de Software.
Genera un archivo CONTRIBUTING.md exhaustivo y moderno para un proyecto de GitHub.
Debe incluir:
1. Mensaje de bienvenida a colaboradores.
2. Convención de ramas (ej: feature/nombre-tarea, bugfix/nombre-bug, hotfix/...).
3. Estándar de Conventional Commits (feat, fix, docs, style, refactor, test, chore) con ejemplos prácticos.
4. Flujo de trabajo de Pull Requests (PR checklist, descripción de cambios, verificación de tests locales).
5. Estándares de código y buenas prácticas.
Idioma: ${options.language === "es" ? "Español" : "Inglés"}.

Responde ÚNICAMENTE con el archivo CONTRIBUTING.md en formato Markdown limpio.`;

            try {
                const contribRes = await generateText({
                    model,
                    system: contribSystemPrompt,
                    prompt: `Proyecto: ${analysis.fullName}\nStack: ${analysis.detectedStacks.join(", ")}\nFrameworks: ${analysis.frameworks.join(", ")}`,
                    temperature: 0.2,
                });
                result.contributing = contribRes.text.trim();
            } catch (err) {
                console.error("[gitDocsService] Error generando CONTRIBUTING.md:", err);
                result.contributing = `# Guía de Contribución\n\nGracias por tu interés en contribuir a ${analysis.fullName}.\n\n## Convención de Commits\nUsa Conventional Commits (\`feat:\`, \`fix:\`, \`docs:\`).`;
            }
        }

        // 5. Generar ARCHITECTURE.md con IA (si está seleccionado)
        if (options.targetFiles.architecture) {
            const archSystemPrompt = `Eres un Principal Enterprise Architect.
Genera el archivo ARCHITECTURE.md definitivo y de alta profundidad técnica para el proyecto.
Debe incluir:
1. Visión y Principios Arquitecturales (patrones de diseño: Clean Architecture, Modular Monolith, Hexagonal, etc.).
2. Diagrama de Arquitectura Detallado en Mermaid (\`\`\`mermaid) que represente la interacción entre capas de la aplicación.
3. Desglose de Componentes y Módulos Clave (con justificación del árbol de directorios).
4. Flujo de Datos y Manejo del Estado (State Management, persistencia, validaciones).
5. Registro de Decisiones de Arquitectura (ADR - Architectural Decision Records) resumiendo las decisiones tecnológicas tomadas.
6. Estrategia de Seguridad, Escalabilidad y Resiliencia.
Idioma: ${options.language === "es" ? "Español técnico riguroso" : "Technical English"}.

Responde ÚNICAMENTE con el Markdown del archivo ARCHITECTURE.md.`;

            try {
                const archRes = await generateText({
                    model,
                    system: archSystemPrompt,
                    prompt: `Proyecto: ${analysis.fullName}\nStack: ${analysis.detectedStacks.join(", ")}\nFrameworks: ${analysis.frameworks.join(", ")}\nBases de datos: ${analysis.databases.join(", ")}\nCarpetas: ${analysis.keyDirectories.join(", ")}\nEstructura:\n${analysis.fileStructureSnippet}`,
                    temperature: 0.25,
                });
                result.architecture = archRes.text.trim();
            } catch (err) {
                console.error("[gitDocsService] Error generando ARCHITECTURE.md:", err);
                result.architecture = `# Arquitectura de ${analysis.fullName}\n\n## Principios\nArquitectura modular orientada a servicios.`;
            }
        }

        // 6. Generar API.md con IA (si está seleccionado)
        if (options.targetFiles.apiDocs) {
            const apiSystemPrompt = `Eres un Tech Lead de APIs y Servicios Web.
Genera el archivo API.md exhaustivo con la especificación de referencia de la API del proyecto.
Debe incluir:
1. Especificación general (Base URL, Versión, Cabeceras comunes como Authorization y Content-Type).
2. Mecanismos de Autenticación (Bearer Token, Cookies, JWT o API Key).
3. Catálogo de Endpoints organizados por dominio/recurso (ej: Auth, Cursos, Evaluaciones, Repositorios).
   Para cada endpoint incluir:
   - Método HTTP y Ruta (ej: \`POST /api/v1/courses\`).
   - Descripción del propósito.
   - Headers requeridos.
   - Cuerpo de la petición (JSON) con tipos y ejemplos.
   - Respuestas exitosas (\`200 OK\` o \`201 Created\`) con JSON de ejemplo.
   - Códigos de error estándar (\`400\`, \`401\`, \`403\`, \`404\`, \`500\`).
4. Manejo de Errores estándar y formato de respuesta ante excepciones.
5. Ejemplo de llamada mediante cURL.
Idioma: ${options.language === "es" ? "Español profesional" : "English"}.

Responde ÚNICAMENTE con el Markdown del archivo API.md.`;

            try {
                const apiRes = await generateText({
                    model,
                    system: apiSystemPrompt,
                    prompt: `Proyecto: ${analysis.fullName}\nStack: ${analysis.detectedStacks.join(", ")}\nFrameworks: ${analysis.frameworks.join(", ")}\nBases de datos: ${analysis.databases.join(", ")}\nDirectorios: ${analysis.keyDirectories.join(", ")}`,
                    temperature: 0.2,
                });
                result.apiDocs = apiRes.text.trim();
            } catch (err) {
                console.error("[gitDocsService] Error generando API.md:", err);
                result.apiDocs = `# Especificación de API - ${analysis.fullName}\n\n## Endpoints\nDocumentación en construcción.`;
            }
        }

        // 7. Generar DEPLOYMENT.md con IA (si está seleccionado)
        if (options.targetFiles.deployment) {
            const deploySystemPrompt = `Eres un Senior DevOps Engineer y Cloud Specialist.
Genera una guía de despliegue DEPLOYMENT.md completa y lista para producción.
Debe incluir:
1. Requisitos del Entorno de Producción (servidor, memoria, puertos, bases de datos).
2. Despliegue con Docker y Docker Compose (incluir snippets de Dockerfile multi-etapa y docker-compose.prod.yml).
3. Despliegue en Plataformas Cloud / PaaS (ej: Vercel, Railway, Render, VPS con Ubuntu / Nginx).
4. Gestión segura de Variables de Entorno y Secretos en producción.
5. Base de Datos: Migraciones automáticas (\`prisma migrate\`, scripts SQL, etc.).
6. Healthchecks, Monitoreo y Estrategia de Respaldos (Backups).
7. Procedimiento de Rollback en caso de fallos.
Idioma: ${options.language === "es" ? "Español" : "English"}.

Responde ÚNICAMENTE con el Markdown del archivo DEPLOYMENT.md.`;

            try {
                const deployRes = await generateText({
                    model,
                    system: deploySystemPrompt,
                    prompt: `Proyecto: ${analysis.fullName}\nStack: ${analysis.detectedStacks.join(", ")}\nFrameworks: ${analysis.frameworks.join(", ")}\nBases de datos: ${analysis.databases.join(", ")}\nTiene Docker: ${analysis.hasDocker ? "Sí" : "No"}\nVariables: ${analysis.envVars.join(", ")}`,
                    temperature: 0.2,
                });
                result.deployment = deployRes.text.trim();
            } catch (err) {
                console.error("[gitDocsService] Error generando DEPLOYMENT.md:", err);
                result.deployment = `# Guía de Despliegue - ${analysis.fullName}\n\n## Pasos\nConfigurar variables y ejecutar build.`;
            }
        }

        return result;
    },

    /**
     * Refina o modifica interactivamente un documento ya generado utilizando IA
     */
    async refineDocWithAi(
        content: string,
        instruction: string,
        language: "es" | "en" = "es",
        userId?: string
    ): Promise<string> {
        const model = await getAIModel(userId);
        const systemPrompt = `Eres un Staff Technical Writer y Tech Lead.
Tu tarea es modificar, mejorar o ampliar el documento técnico provisto siguiendo estrictamente la instrucción del usuario.
Reglas:
- Aplica los cambios solicitados manteniendo el formato Markdown impecable.
- Conserva el contexto del proyecto y el rigor técnico.
- Si se solicita añadir o corregir un diagrama Mermaid, asegúrate de que sea sintácticamente perfecto sin caracteres no escapados.
- Idioma solicitado: ${language === "es" ? "Español" : "Inglés"}.
- Responde ÚNICAMENTE con el documento Markdown resultante, sin comentarios introductorios ni despedidas.`;

        const userPrompt = `DOCUMENTO ORIGINAL:
${content}

INSTRUCCIÓN DE MEJORA:
${instruction}

Devuelve el documento completo refinado:`;

        const response = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        return response.text.trim();
    },

    /**
     * Sube y confirma de forma atómica uno o varios archivos al repositorio en GitHub
     * Soporta push directo a la rama o creación de nueva rama con Pull Request
     */
    async pushDocsToRepository(params: {
        owner: string;
        repo: string;
        targetBranch: string;
        files: Array<{ path: string; content: string }>;
        commitMessage: string;
        mode: "direct" | "pull_request";
        newBranchName?: string;
        prTitle?: string;
        prBody?: string;
        token: string;
    }): Promise<{
        success: boolean;
        commitSha: string;
        commitUrl?: string;
        branch: string;
        mode: "direct" | "pull_request";
        prUrl?: string;
        prNumber?: number;
        message: string;
    }> {
        const {
            owner,
            repo,
            targetBranch,
            files,
            commitMessage,
            mode,
            newBranchName,
            prTitle,
            prBody,
            token
        } = params;

        if (!token || !token.trim()) {
            throw new Error("Se requiere un Personal Access Token (PAT) de GitHub con permisos de escritura (alcance 'repo' o 'Contents: Read and write') para subir cambios.");
        }

        if (!files || files.length === 0) {
            throw new Error("No se especificaron archivos para subir al repositorio.");
        }

        const headers: HeadersInit = {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${token.trim()}`,
            'Content-Type': 'application/json'
        };

        // 1. Obtener la referencia de la rama base y su árbol actual
        const branchRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(targetBranch.trim())}`,
            { headers }
        );

        if (!branchRes.ok) {
            if (branchRes.status === 404) {
                throw new Error(`La rama '${targetBranch}' o el repositorio '${owner}/${repo}' no existen o no tienes acceso.`);
            }
            if (branchRes.status === 401 || branchRes.status === 403) {
                throw new Error("Token de GitHub no autorizado o sin permisos de escritura sobre este repositorio.");
            }
            throw new Error(`Error al consultar rama base: ${branchRes.statusText}`);
        }

        const branchData = await branchRes.json();
        const baseCommitSha: string = branchData?.commit?.sha;
        const baseTreeSha: string = branchData?.commit?.commit?.tree?.sha;

        if (!baseCommitSha || !baseTreeSha) {
            throw new Error("No se pudo obtener el commit base de la rama.");
        }

        // 2. Crear un nuevo árbol (Tree) en GitHub conteniendo los archivos modificados
        const treeItems = files.map(f => ({
            path: f.path.replace(/^\//, ''),
            mode: "100644",
            type: "blob",
            content: f.content
        }));

        const createTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeItems
            })
        });

        if (!createTreeRes.ok) {
            const errData = await createTreeRes.json().catch(() => ({}));
            throw new Error(`Error al crear árbol de archivos en GitHub: ${errData.message || createTreeRes.statusText}`);
        }

        const newTreeData = await createTreeRes.json();
        const newTreeSha: string = newTreeData.sha;

        // 3. Crear el commit apuntando al nuevo árbol y con parent el commit base
        const cleanMessage = commitMessage.trim() || "docs: actualizar suite de documentación del proyecto con SmartClass IA";
        const createCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: cleanMessage,
                tree: newTreeSha,
                parents: [baseCommitSha]
            })
        });

        if (!createCommitRes.ok) {
            const errData = await createCommitRes.json().catch(() => ({}));
            throw new Error(`Error al crear commit en GitHub: ${errData.message || createCommitRes.statusText}`);
        }

        const newCommitData = await createCommitRes.json();
        const newCommitSha: string = newCommitData.sha;
        const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;

        // 4. Modo 1: Commit directo a la rama base
        if (mode === "direct") {
            const updateRefRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch.trim())}`,
                {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        sha: newCommitSha,
                        force: false
                    })
                }
            );

            if (!updateRefRes.ok) {
                const errData = await updateRefRes.json().catch(() => ({}));
                if (updateRefRes.status === 422 && errData.message?.includes("protected")) {
                    throw new Error(`La rama '${targetBranch}' está protegida contra commits directos por políticas del repositorio. Usa el modo 'Crear Rama y Pull Request'.`);
                }
                throw new Error(`Error al actualizar rama '${targetBranch}': ${errData.message || updateRefRes.statusText}`);
            }

            return {
                success: true,
                commitSha: newCommitSha,
                commitUrl,
                branch: targetBranch,
                mode: "direct",
                message: `Se confirmaron y subieron ${files.length} archivo(s) exitosamente a la rama '${targetBranch}'.`
            };
        }

        // 5. Modo 2: Crear nueva rama y abrir Pull Request
        const timestamp = Date.now().toString().slice(-6);
        const branchPrefix = newBranchName?.trim() || "docs/smartclass-documentation";
        const cleanBranchName = `${branchPrefix.replace(/[^a-zA-Z0-9/_.-]/g, '-')}-${timestamp}`;

        // A. Crear la nueva rama apuntando al nuevo commit
        const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: `refs/heads/${cleanBranchName}`,
                sha: newCommitSha
            })
        });

        if (!createRefRes.ok) {
            const errData = await createRefRes.json().catch(() => ({}));
            throw new Error(`Error al crear rama '${cleanBranchName}': ${errData.message || createRefRes.statusText}`);
        }

        // B. Abrir Pull Request hacia la rama base
        const finalPrTitle = prTitle?.trim() || "docs: actualizar suite de documentación y gobernanza con SmartClass IA";
        const finalPrBody = prBody?.trim() || `## 📘 Suite de Documentación Generada con SmartClass IA\n\nEste Pull Request incluye la actualización de la documentación del proyecto:\n\n${files.map(f => `- \`${f.path}\``).join('\n')}\n\n*Generado automáticamente mediante SmartClass AI Docs Suite.*`;

        const createPrRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: finalPrTitle,
                head: cleanBranchName,
                base: targetBranch,
                body: finalPrBody
            })
        });

        if (!createPrRes.ok) {
            const errData = await createPrRes.json().catch(() => ({}));
            return {
                success: true,
                commitSha: newCommitSha,
                commitUrl,
                branch: cleanBranchName,
                mode: "pull_request",
                message: `Se creó la rama '${cleanBranchName}' con el commit, pero ocurrió un aviso al abrir el PR: ${errData.message || createPrRes.statusText}. Puedes abrir el PR manualmente desde GitHub.`
            };
        }

        const prData = await createPrRes.json();

        return {
            success: true,
            commitSha: newCommitSha,
            commitUrl,
            branch: cleanBranchName,
            mode: "pull_request",
            prUrl: prData.html_url,
            prNumber: prData.number,
            message: `¡Pull Request #${prData.number} creado exitosamente en '${cleanBranchName}' hacia '${targetBranch}'!`
        };
    },

    /**
     * Obtiene la cuenta Git activa configurada en la computadora local del docente
     */
    async getLocalGitAccount(): Promise<{
        hasLocalAccount: boolean;
        name: string | null;
        email: string | null;
        label: string;
    }> {
        try {
            const { stdout: nameOut } = await execAsync("git config --get user.name");
            const { stdout: emailOut } = await execAsync("git config --get user.email");
            const name = nameOut.trim() || null;
            const email = emailOut.trim() || null;
            if (name || email) {
                return {
                    hasLocalAccount: true,
                    name,
                    email,
                    label: name && email ? `${name} (${email})` : (name || email || "Cuenta Local")
                };
            }
        } catch {
            // git no configurado o no disponible
        }
        return {
            hasLocalAccount: false,
            name: null,
            email: null,
            label: "Cuenta de la Computadora"
        };
    },

    /**
     * Sube los cambios al repositorio en GitHub utilizando la cuenta activa y Git local de la computadora
     */
    async pushDocsWithLocalGit(params: {
        owner: string;
        repo: string;
        targetBranch: string;
        files: Array<{ path: string; content: string }>;
        commitMessage: string;
        mode: "direct" | "pull_request";
        newBranchName?: string;
        prTitle?: string;
        prBody?: string;
    }): Promise<{
        success: boolean;
        commitSha: string;
        commitUrl?: string;
        branch: string;
        mode: "direct" | "pull_request";
        prUrl?: string;
        prNumber?: number;
        message: string;
    }> {
        const tempDir = path.join(os.tmpdir(), `smartclass-git-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        try {
            const repoUrl = `https://github.com/${params.owner}/${params.repo}.git`;
            const cleanTarget = params.targetBranch.trim() || "main";

            // 1. Clonar con git local (utiliza las credenciales activas en Windows / GCM)
            try {
                await execAsync(`git clone --depth 1 --branch ${cleanTarget} "${repoUrl}" .`, { cwd: tempDir });
            } catch (cloneErr: any) {
                try {
                    await execAsync(`git clone --depth 1 "${repoUrl}" .`, { cwd: tempDir });
                    try {
                        await execAsync(`git checkout ${cleanTarget}`, { cwd: tempDir });
                    } catch {
                        await execAsync(`git checkout -b ${cleanTarget}`, { cwd: tempDir });
                    }
                } catch (generalCloneErr: any) {
                    throw new Error(`Error al conectar con el repositorio en GitHub con tu cuenta local: ${generalCloneErr.message || cloneErr.message}`);
                }
            }

            let effectiveBranch = cleanTarget;

            // 2. Si es modo pull request, crear rama dedicada
            if (params.mode === "pull_request") {
                const timestamp = Date.now().toString().slice(-6);
                const branchPrefix = params.newBranchName?.trim() || "docs/smartclass-documentation";
                effectiveBranch = `${branchPrefix.replace(/[^a-zA-Z0-9/_.-]/g, '-')}-${timestamp}`;
                await execAsync(`git checkout -b "${effectiveBranch}"`, { cwd: tempDir });
            }

            // 3. Escribir los archivos generados
            for (const file of params.files) {
                const fullPath = path.join(tempDir, file.path.replace(/^\//, ''));
                const parentDir = path.dirname(fullPath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                fs.writeFileSync(fullPath, file.content, 'utf-8');
            }

            // 4. Git add y commit con la identidad activa en la computadora
            await execAsync('git add .', { cwd: tempDir });

            try {
                const cleanMsg = (params.commitMessage || "docs: actualizar documentación del repositorio con SmartClass IA").replace(/"/g, '\\"');
                await execAsync(`git commit -m "${cleanMsg}"`, { cwd: tempDir });
            } catch (commitErr: any) {
                if (commitErr.message?.includes("nothing to commit")) {
                    return {
                        success: true,
                        commitSha: "",
                        branch: effectiveBranch,
                        mode: params.mode,
                        message: "Los archivos en el repositorio ya se encuentran al día. No hubo cambios adicionales que confirmar."
                    };
                }
                throw commitErr;
            }

            // 5. Obtener SHA del commit creado
            const { stdout: revOut } = await execAsync('git rev-parse HEAD', { cwd: tempDir });
            const commitSha = revOut.trim();
            const commitUrl = `https://github.com/${params.owner}/${params.repo}/commit/${commitSha}`;

            // 6. Push a GitHub con las credenciales activas en la computadora
            await execAsync(`git push origin "${effectiveBranch}"`, { cwd: tempDir });

            // 7. Enlace para PR o confirmación
            let prUrl: string | undefined;
            if (params.mode === "pull_request") {
                const encTitle = encodeURIComponent(params.prTitle?.trim() || "docs: actualizar suite de documentación");
                const encBody = encodeURIComponent(params.prBody?.trim() || `## 📘 Documentación Generada con SmartClass IA\n\n- Commits confirmados con la cuenta activa de la computadora.`);
                prUrl = `https://github.com/${params.owner}/${params.repo}/compare/${cleanTarget}...${effectiveBranch}?expand=1&title=${encTitle}&body=${encBody}`;
            }

            return {
                success: true,
                commitSha,
                commitUrl,
                branch: effectiveBranch,
                mode: params.mode,
                prUrl,
                message: params.mode === "pull_request"
                    ? `¡Rama '${effectiveBranch}' subida exitosamente con tu cuenta activa de la computadora! Haz clic para abrir el Pull Request en GitHub.`
                    : `¡Cambios confirmados y subidos exitosamente a la rama '${effectiveBranch}' con tu cuenta activa de la computadora!`
            };
        } finally {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch {
                // ignore
            }
        }
    }
};

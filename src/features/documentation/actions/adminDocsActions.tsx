"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import matter from "gray-matter";
import * as adminService from "../services/admin-docs";
import prisma from "@/lib/prisma";
import { blocksToMarkdown } from "../components/admin/blockEditorUtils";

import { getRoleFromUser } from "@/features/auth/services/authService";

async function verifyAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  const role = getRoleFromUser(session.user);
  if (role !== "teacher" && role !== "admin") throw new Error("Forbidden");
  return session;
}

async function checkProjectOwnership(projectIdOrSlug: string, session: any, includePages = false) {
  const decodedIdOrSlug = decodeURIComponent(projectIdOrSlug);
  
  const project = await prisma.docProject.findFirst({
    where: {
      OR: [
        { id: decodedIdOrSlug },
        { slug: decodedIdOrSlug }
      ]
    },
    include: {
      pages: includePages
    }
  });
  
  if (!project) {
    throw new Error(`El proyecto "${decodedIdOrSlug}" no existe.`);
  }

  const role = getRoleFromUser(session.user);
  if (role !== "admin" && project.teacherId !== session.user.id) {
    throw new Error("No tienes permiso sobre este proyecto. Solo el propietario o un administrador pueden editarlo.");
  }

  return project;
}

export async function getFileTreeAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  return await adminService.getProjectFileTree(project.slug);
}

export async function getFileContentAction(projectId: string, path: string) {
  try {
    const session = await verifyAdmin();
    const project = await checkProjectOwnership(projectId, session);
    return await adminService.readFileContent(project.slug, path);
  } catch (error) {
    console.error(`Error in getFileContentAction (project: ${projectId}, path: ${path}):`, error);
    throw error;
  }
}

export async function saveFileContentAction(projectId: string, path: string, content: string, sha?: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const newSha = await adminService.saveFileContent(project.slug, path, content);
  revalidatePath("/docs", "layout");


  return { success: true, sha: newSha };
}

export async function createItemAction(
  projectId: string, 
  parentPath: string, 
  name: string, 
  type: 'file' | 'folder',
  metadata?: { title: string, order?: string },
  content?: string
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  const normalizedParent = parentPath === projectId || parentPath === project.slug || parentPath === project.id ? "" : parentPath;
  const depth = normalizedParent ? normalizedParent.split('/').length : 0;
  
  if (type === 'folder' && (depth >= 1 || normalizedParent !== "")) {
    throw new Error("No se permite crear carpetas o tópicos dentro de otras carpetas o tópicos.");
  }

  const path = normalizedParent ? `${normalizedParent}/${name}` : name;
  const finalSlug = path.replace(/\.md$/, '');
  
  let finalContent = content || `# ${metadata?.title || name}\n\nEscribe aquí tu contenido...`;
  
  const saveMetadata: {
    title: string;
    order?: number;
    category?: string;
    categoryOrder?: number;
    draft?: boolean;
    publishDate?: Date | null;
    icon?: string;
  } = {
    title: metadata?.title || name,
    order: metadata?.order ? parseInt(metadata.order) : undefined
  };

  // Si el archivo se crea dentro de un tópico que está en borrador, hereda el estado de borrador
  if (type === 'file' && normalizedParent) {
    const parentTopic = await prisma.docPage.findFirst({
      where: {
        docProjectId: project.id,
        OR: [
          { slug: `${normalizedParent}/index` },
          { slug: normalizedParent }
        ]
      },
      select: { draft: true }
    });
    if (parentTopic?.draft) {
      saveMetadata.draft = true;
    }
  }

  // If content is provided, parse frontmatter using gray-matter
  if (content && content.trim().startsWith("---")) {
    try {
      const parsed = matter(content);
      finalContent = parsed.content;
      if (parsed.data) {
        if (parsed.data.title) {
          saveMetadata.title = parsed.data.title;
        }
        if (parsed.data.draft !== undefined) {
          saveMetadata.draft = String(parsed.data.draft) === 'true';
        }
        if (parsed.data.date) {
          saveMetadata.publishDate = new Date(parsed.data.date);
        }
        if (parsed.data.order !== undefined) {
          saveMetadata.order = parseInt(String(parsed.data.order));
        }
        if (parsed.data.category) {
          saveMetadata.category = parsed.data.category;
        }
        if (parsed.data.categoryOrder !== undefined) {
          saveMetadata.categoryOrder = parseInt(String(parsed.data.categoryOrder));
        }
        if (parsed.data.icon) {
          saveMetadata.icon = parsed.data.icon;
        }
      }
    } catch (err) {
      console.warn("Error parsing frontmatter on createItemAction:", err);
    }
  }
  
  if (type === 'file') {
    await adminService.saveFileContent(project.slug, finalSlug, finalContent, saveMetadata);
  } else {
    await adminService.saveFileContent(project.slug, `${finalSlug}/index`, finalContent, saveMetadata);
  }
  
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");
  return { success: true };
}

export async function deleteItemAction(projectId: string, path: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const normalizedPath = path === projectId || path === project.slug || path === project.id ? "" : path;
  await adminService.deleteItem(project.slug, normalizedPath);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");



  return { success: true };
}

export async function renameItemAction(projectId: string, path: string, newName: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  const normalizedPath = path === projectId || path === project.slug || path === project.id ? "" : path;
  await adminService.renameItem(project.slug, normalizedPath, newName);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");



  return { success: true };
}

export async function createProjectAction(name: string) {
  const session = await verifyAdmin();
  const id = await adminService.initNewProject(name, session.user.id);
  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true, id };
}

export async function deleteProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  // Delete project pages first
  await prisma.docPage.deleteMany({
    where: { docProjectId: project.id }
  });
  // Delete the project
  await prisma.docProject.delete({
    where: { id: project.id }
  });
  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true };
}



export async function moveItemAction(projectId: string, oldPath: string, newParentPath: string, sha: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);
  const normalizedNewParent = newParentPath === projectId || newParentPath === project.slug || newParentPath === project.id ? "" : newParentPath;
  
  const isTopic = project.pages.some((p: any) => (p.slug === `${oldPath}/index` || p.slug === oldPath) && p.slug.endsWith('/index'));
  if (isTopic && normalizedNewParent !== "") {
    throw new Error("No se permite mover un tópico o carpeta dentro de otro tópico.");
  }

  await adminService.moveItem(project.slug, oldPath, normalizedNewParent);
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");
  return { success: true };
}

export async function updatePageMetadataAction(
  projectId: string, 
  path: string, 
  metadata: { 
    title?: string, 
    description?: string, 
    category?: string, 
    order?: number, 
    categoryOrder?: number,
    draft?: boolean,
    public?: boolean,
    date?: string,
    icon?: string
  }
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);

  let page = await prisma.docPage.findFirst({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: path },
        { slug: `${path}/index` }
      ]
    }
  });

  const isFolder = page ? (page.slug.endsWith('/index') || path.endsWith('/index')) : false;
  const folderSlugPrefix = isFolder
    ? (page!.slug.endsWith('/index') ? page!.slug.slice(0, -'/index'.length) : path.replace(/\/index$/, ''))
    : path.replace(/\/index$/, '');

  if (!page) {
    // Si es un tópico/carpeta pero la página index aún no existe, buscar si tiene hijos
    const hasChildren = await prisma.docPage.findFirst({
      where: {
        docProjectId: project.id,
        slug: { startsWith: `${folderSlugPrefix}/` }
      }
    });

    if (hasChildren) {
      page = await prisma.docPage.create({
        data: {
          docProjectId: project.id,
          slug: `${folderSlugPrefix}/index`,
          title: metadata.title || path,
          category: metadata.category || metadata.title || path,
          content: `# ${metadata.title || path}\n\nDocumentación del tópico.`,
          draft: metadata.draft ?? false,
          publishDate: (metadata.date && metadata.date.trim() !== "") ? new Date(metadata.date) : null,
          icon: metadata.icon
        }
      });
    } else {
      throw new Error(`Página no encontrada: ${path}`);
    }
  }

  await prisma.docPage.update({
    where: { id: page.id },
    data: {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      order: metadata.order,
      categoryOrder: metadata.categoryOrder,
      draft: metadata.draft,
      icon: metadata.icon,
      publishDate: (metadata.date && metadata.date.trim() !== "") ? new Date(metadata.date) : null,
    }
  });

  // Si es un tópico/carpeta y se modifica el estado de borrador (draft),
  // propagar en cascada el nuevo estado de borrador a todos los archivos dentro del tópico
  if ((isFolder || page.slug.endsWith('/index')) && metadata.draft !== undefined) {
    const prefix = page.slug.endsWith('/index') ? page.slug.slice(0, -'/index'.length) : folderSlugPrefix;
    if (prefix) {
      await prisma.docPage.updateMany({
        where: {
          docProjectId: project.id,
          slug: {
            startsWith: `${prefix}/`
          },
          NOT: {
            id: page.id
          }
        },
        data: {
          draft: metadata.draft
        }
      });
    }
  }

  // Actualizar la fecha de modificación del proyecto para invalidar caches
  await prisma.docProject.update({
    where: { id: project.id },
    data: { updatedAt: new Date() }
  });

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath(`/docs/${project.slug}`, "layout");
  revalidatePath("/docs", "layout");

  return { success: true };
}

export async function reorderItemAction(projectId: string, path: string, direction: 'up' | 'down') {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);

  const parts = path.split('/');
  const isIndex = path === 'index' || path.endsWith('/index');
  const parentPath = parts.slice(0, -1).join('/');
  
  const isTopic = isIndex;
  const sortField = isTopic ? 'categoryOrder' : 'order';

  let siblings = project.pages.filter((p: any) => {
    const pParts = p.slug.split('/');
    const pParent = pParts.slice(0, -1).join('/');
    if (isTopic) {
      return p.slug.endsWith('/index') && pParent === parentPath.split('/').slice(0, -1).join('/');
    } else {
      return pParent === parentPath && !p.slug.endsWith('/index');
    }
  });

  siblings.sort((a: any, b: any) => (a as any)[sortField] - (b as any)[sortField]);

  const currentIndex = siblings.findIndex((s: any) => s.slug === path || s.slug === `${path}/index`);
  if (currentIndex === -1) {
    return { success: false };
  }

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= siblings.length) return { success: false };

  const target = siblings[newIndex];
  const current = siblings[currentIndex];
  
  const targetVal = (target as any)[sortField];
  const currentVal = (current as any)[sortField];

  if (targetVal === currentVal) {
     for (let i = 0; i < siblings.length; i++) {
        await prisma.docPage.update({ where: { id: siblings[i].id }, data: { [sortField]: i * 10 } });
     }
     return reorderItemAction(projectId, path, direction);
  }

  await prisma.$transaction([
    prisma.docPage.update({ where: { id: current.id }, data: { [sortField]: targetVal } }),
    prisma.docPage.update({ where: { id: target.id }, data: { [sortField]: currentVal } })
  ]);

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");

  return { success: true };
}

export async function moveAndReorderAction(
  projectId: string, 
  sourcePath: string, 
  targetPath: string, 
  position: 'before' | 'after' | 'inside'
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);

  const findPage = (p: string) => 
    project.pages.find((pg: any) => pg.slug === p) || project.pages.find((pg: any) => pg.slug === `${p}/index`);

  const sourcePage = findPage(sourcePath);
  const targetPage = findPage(targetPath);
  
  if (!sourcePage || !targetPage) {
    throw new Error(`Página no encontrada. Origen: ${sourcePath}, Destino: ${targetPath}`);
  }

  if (sourcePage.id === targetPage.id && position !== 'inside') return { success: true };

  const sourceIsTopic = sourcePage.slug === 'index' || sourcePage.slug.endsWith('/index');
  const targetIsTopic = targetPage.slug === 'index' || targetPage.slug.endsWith('/index');
  const sortField = sourceIsTopic ? 'categoryOrder' : 'order';

  const sourceFileName = sourcePage.slug.split('/').pop() || '';
  const sourceFolderPrefix = sourcePage.slug.replace(/\/index$/, '');
  const sourceBaseName = sourceFolderPrefix.split('/').pop() || '';
  const targetBase = targetPage.slug.replace(/\/index$/, '');
  
  let newSlug = sourcePage.slug;
  if (position === 'inside') {
    if (sourceIsTopic) {
      throw new Error("No se permite mover un tópico o carpeta dentro de otro tópico.");
    }
    newSlug = `${targetBase}/${sourceFileName}`;
  } else {
    const targetHierarchyParent = targetBase.split('/').slice(0, -1).join('/');
    newSlug = sourceIsTopic 
      ? (targetHierarchyParent ? `${targetHierarchyParent}/${sourceBaseName}/index` : `${sourceBaseName}/index`)
      : (targetHierarchyParent ? `${targetHierarchyParent}/${sourceFileName}` : sourceFileName);
  }

  const newSlugParts = newSlug.split('/');
  if (sourceIsTopic && newSlugParts.length > 2) {
    throw new Error("No se permite anidar tópicos o carpetas dentro de otros tópicos.");
  }
  if (!sourceIsTopic && newSlugParts.length > 2) {
    throw new Error("No se pueden anidar páginas a más de 2 niveles (Tópico > Página).");
  }
  
  if (sourceIsTopic) {
    const descendants = project.pages.filter((p: any) => p.slug.startsWith(`${sourceFolderPrefix}/`) && p.id !== sourcePage.id);
    const maxDescendantDepth = descendants.reduce((max: number, d: any) => {
      const depth = d.slug.split('/').length;
      return Math.max(max, depth);
    }, 0);
    
    const depthShift = newSlugParts.length - sourcePage.slug.split('/').length;
    if (maxDescendantDepth + depthShift > 3) {
      throw new Error("El movimiento excedería el límite de 3 niveles de profundidad para los elementos hijos.");
    }
  }

  const oldFolderPrefix = sourceFolderPrefix;
  const newFolderPrefix = newSlug.replace(/\/index$/, '');

  await prisma.$transaction(async (tx: any) => {
    if (sourceIsTopic && oldFolderPrefix !== newFolderPrefix) {
      const descendants = project.pages.filter((p: any) => p.slug.startsWith(`${oldFolderPrefix}/`) && p.id !== sourcePage.id);
      for (const desc of descendants) {
        const relativePath = desc.slug.substring(oldFolderPrefix.length);
        await tx.docPage.update({
          where: { id: desc.id },
          data: { slug: `${newFolderPrefix}${relativePath}` }
        });
      }
    }

    const allPages = await tx.docPage.findMany({
      where: { docProjectId: project.id }
    });

    const destinationParent = sourceIsTopic 
      ? "" 
      : (newSlug.includes('/') ? newSlug.split('/').slice(0, -1).join('/') : "");

    let siblings = allPages.filter((p: any) => {
      const pIsTopic = p.slug === 'index' || p.slug.endsWith('/index');
      if (sourceIsTopic) {
        return pIsTopic;
      } else {
        if (pIsTopic) return false;
        const pParent = p.slug.includes('/') ? p.slug.split('/').slice(0, -1).join('/') : "";
        return pParent === destinationParent;
      }
    });

    siblings.sort((a: any, b: any) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (aVal !== bVal) return aVal - bVal;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });

    siblings = siblings.filter((p: any) => p.id !== sourcePage.id);

    if (position === 'inside') {
      siblings.push(sourcePage);
    } else {
      const targetIdx = siblings.findIndex((p: any) => p.id === targetPage.id);
      if (targetIdx === -1) {
        siblings.push(sourcePage);
      } else {
        const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
        siblings.splice(insertIdx, 0, sourcePage);
      }
    }

    let categoryName: string | undefined = undefined;
    if (!sourceIsTopic) {
      if (destinationParent) {
        const parentTopic = allPages.find((p: any) => p.slug === `${destinationParent}/index` || p.slug === destinationParent);
        categoryName = parentTopic?.title || destinationParent;
      } else {
        categoryName = "General";
      }
    }

    for (let i = 0; i < siblings.length; i++) {
      const item = siblings[i];
      const isSource = item.id === sourcePage.id;
      await tx.docPage.update({
        where: { id: item.id },
        data: {
          ...(isSource ? { 
            slug: newSlug,
            ...(categoryName ? { category: categoryName } : {})
          } : {}),
          [sortField]: i * 10
        }
      });
    }
  });

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");

  return { success: true };
}

import { generateText } from "ai";
import { getAIModel } from "@/features/teacher/services/ai/client";

export async function generateDocContentAction(prompt: string, currentContent?: string, mode: "append" | "replace" | "integrate" | "improve" = "append") {
  const session = await verifyAdmin();
  const userId = session.user.id;
  const model = await getAIModel(userId);

  let systemPrompt = `Eres un redactor experto de documentación técnica y contenido académico en formato MDX.
Tu tarea es generar, expandir o mejorar contenido para un archivo de documentación en base a la solicitud del usuario.
  
Directrices:
- Escribe en español
- Devuelve SIEMPRE contenido en formato Markdown/MDX válido
- Mantén un tono profesional, claro y estructurado
- No incluyas explicaciones adicionales ni bloques de código redundantes. Devuelve ÚNICAMENTE el contenido en MDX final.`;

  if (mode === "integrate") {
    systemPrompt += `\n- Estás en modo de FUSIÓN E INTEGRACIÓN. Lee el contenido actual completo, y combínalo/adáptalo coherentemente con la nueva solicitud. No borres partes importantes ya existentes a menos que la solicitud lo indique expresamente. El resultado final debe ser el documento completo y fusionado de manera fluida.`;
  } else if (mode === "improve") {
    systemPrompt += `\n- Estás en modo de MEJORAR Y EXPANDIR. Lee el contenido actual completo y expande los temas, profundiza las explicaciones, corrige errores o enriquece el documento con nuevos ejemplos o detalles técnicos solicitados. El resultado final debe ser el documento completo mejorado y expandido de manera fluida.`;
  }

  const userPrompt = currentContent 
    ? `Contenido actual del documento:\n\n${currentContent}\n\nSolicitud de mejora/generación:\n\n${prompt}`
    : `Solicitud de generación:\n\n${prompt}`;

  const { text } = await generateText({
    model,
    prompt: `${systemPrompt}\n\n${userPrompt}`,
  });

  return { success: true, content: text };
}

import { generateObject } from "ai";
import { z } from "zod";

function cleanSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CourseStructureData {
  name: string;
  overview: string;
  topics: Array<{
    title: string;
    description: string;
    documents: Array<{
      title: string;
      summary: string;
    }>;
  }>;
}

function structureToMarkdown(data: CourseStructureData): string {
  return `# ${data.name}

${data.overview}

## Plan de Estudios y Temario Propuesto

${data.topics.map((t, i) => {
  const topicNum = String(i + 1).padStart(2, "0");
  return `### ${topicNum}. ${t.title}
${t.description}

${t.documents.map((d, j) => `- **${String(j + 1).padStart(2, "0")}. ${d.title}**: ${d.summary}`).join("\n")}`;
}).join("\n\n")}

---
*💡 Puedes usar el chat de la derecha para pedir modificaciones a este temario antes de crearlo.*`;
}

const courseStructureZodSchema = z.object({
  overview: z.string().describe("Breve descripción u objetivos generales del curso (2-3 párrafos)"),
  topics: z.array(z.object({
    title: z.string().describe("Título del tópico o unidad temática (ej: 'Fundamentos de Kotlin', 'Arquitectura y Componentes')"),
    description: z.string().describe("Breve descripción del tópico (1 o 2 oraciones de qué se aprenderá)"),
    documents: z.array(z.object({
      title: z.string().describe("Título de la lección o documento (ej: 'Variables y Tipos de Datos', 'StateFlow y LiveData')"),
      summary: z.string().describe("Breve objetivo o síntesis pedagógica de este documento en 1-2 líneas")
    })).describe("Lista de lecciones o documentos dentro de este tópico")
  })).describe("Lista de tópicos secuenciales del curso")
});

export async function generateCourseStructureProposalAction(name: string, prompt: string) {
  const session = await verifyAdmin();
  const userId = session.user.id;
  const model = await getAIModel(userId);

  const systemPrompt = `Eres un diseñador curricular y arquitecto pedagógico experto en ingeniería y tecnología.
Tu única labor es estructurar el plan de estudios o temario jerárquico de un curso completo (Syllabus) organizado en Tópicos (módulos/unidades) y Documentos (lecciones específicas dentro de cada tópico).

IMPORTANTE:
- NO generes el contenido exhaustivo de cada lección. Solo genera los títulos y una breve síntesis u objetivo (1 o 2 oraciones) de cada documento.
- El contenido completo de cada documento será redactado posteriormente por el docente usando el Chat IA en el editor.
- Genera entre 3 y 7 Tópicos principales bien secuenciados.
- Dentro de cada Tópico, genera entre 2 y 5 Documentos o lecciones ordenadas de forma progresiva.`;

  const { object } = await generateObject({
    model,
    schema: courseStructureZodSchema,
    prompt: `${systemPrompt}\n\nCurso a estructurar:\nNombre: ${name}\nDetalles o temario solicitado: ${prompt}`,
  });

  if (!object?.topics || object.topics.length === 0) {
    throw new Error("No se pudo generar la estructura del curso.");
  }

  const structure: CourseStructureData = {
    name,
    overview: object.overview,
    topics: object.topics,
  };

  return {
    success: true,
    structure,
    markdownPreview: structureToMarkdown(structure)
  };
}

export async function refineCourseStructureProposalAction(
  currentStructure: CourseStructureData,
  instruction: string
) {
  const session = await verifyAdmin();
  const userId = session.user.id;
  const model = await getAIModel(userId);

  const systemPrompt = `Eres un diseñador curricular y arquitecto pedagógico experto en ingeniería y tecnología.
Tu labor es modificar, adaptar, reorganizar, expandir o resumir la estructura del temario de un curso según las instrucciones específicas del profesor.

ESTRUCTURA ACTUAL DEL CURSO:
Nombre: ${currentStructure.name}
Descripción: ${currentStructure.overview}
Tópicos y Lecciones actuales:
${JSON.stringify(currentStructure.topics, null, 2)}

INSTRUCCIONES ESPECÍFICAS DEL PROFESOR:
"${instruction}"

REGLAS CRÍTICAS:
1. Aplica con exactitud los cambios pedidos por el profesor (ej: añadir más módulos, reducir duración, cambiar el orden, subdividir lecciones o profundizar temas).
2. Preserva las partes del curso que no se pidió modificar.
3. Devuelve la estructura completa del curso actualizada con el mismo esquema.`;

  const { object } = await generateObject({
    model,
    schema: courseStructureZodSchema,
    prompt: systemPrompt,
  });

  if (!object?.topics || object.topics.length === 0) {
    throw new Error("No se pudo adaptar la estructura del curso.");
  }

  const updatedStructure: CourseStructureData = {
    name: currentStructure.name,
    overview: object.overview,
    topics: object.topics,
  };

  return {
    success: true,
    structure: updatedStructure,
    markdownPreview: structureToMarkdown(updatedStructure)
  };
}

export async function createProjectFromStructureAction(name: string, structure: CourseStructureData) {
  const session = await verifyAdmin();
  const userId = session.user.id;

  const slug = cleanSlug(name) || `doc-${Date.now()}`;

  const existing = await prisma.docProject.findUnique({ where: { slug } });
  if (existing) throw new Error("Ya existe un proyecto con ese nombre o identificador similar.");

  const pagesToCreate: Array<{
    slug: string;
    title: string;
    content: string;
    category: string;
    order: number;
    categoryOrder: number;
  }> = [];

  // 1. Página Raíz (Inicio / Presentación del Curso)
  const rootIndexContent = `# ${name}

${structure.overview}

## Estructura General del Curso

${structure.topics.map((t, i) => {
  const topicNum = String(i + 1).padStart(2, "0");
  return `### ${topicNum}. ${t.title}
${t.description}

${t.documents.map((d, j) => `- **${String(j + 1).padStart(2, "0")}. ${d.title}**: ${d.summary}`).join("\n")}`;
}).join("\n\n")}

---
*Nota: Explora los tópicos en el explorador lateral. Puedes abrir cualquier documento y utilizar el botón **Modificar con Chat IA** para redactar y personalizar el contenido completo de cada lección.*`;

  pagesToCreate.push({
    slug: "index",
    title: "Inicio",
    content: rootIndexContent,
    category: "General",
    order: 0,
    categoryOrder: 0,
  });

  // 2. Páginas de Tópicos (índices de cada tópico) y Documentos (lecciones dentro de cada tópico)
  structure.topics.forEach((topic, i) => {
    const topicNum = String(i + 1).padStart(2, "0");
    const topicSlugPart = `${topicNum}-${cleanSlug(topic.title)}`;
    const categoryOrder = (i + 1) * 10;
    const categoryTitle = topic.title;

    // Índice del Tópico (XX-topico/index)
    const topicIndexContent = `# ${topic.title}

${topic.description}

## Documentos y Lecciones en este Tópico

${topic.documents.map((d, j) => {
  const docNum = String(j + 1).padStart(2, "0");
  return `${j + 1}. **${d.title}**
   ${d.summary}`;
}).join("\n\n")}

---
*Nota: Selecciona una lección en el panel lateral para comenzar o utiliza el editor con **Chat IA** para redactar su contenido.*`;

    pagesToCreate.push({
      slug: `${topicSlugPart}/index`,
      title: topic.title,
      content: topicIndexContent,
      category: categoryTitle,
      order: 0,
      categoryOrder,
    });

    // Documentos dentro del Tópico (XX-topico/YY-documento)
    topic.documents.forEach((doc, j) => {
      const docNum = String(j + 1).padStart(2, "0");
      const docSlugPart = `${docNum}-${cleanSlug(doc.title)}`;

      const docContent = `# ${doc.title}

> [!NOTE]
> **Objetivo pedagógico**: ${doc.summary}

## Esquema Temático
- Fundamentos y conceptos clave
- Explicación detallada con ejemplos prácticos
- Guía paso a paso y mejores prácticas
- Conclusiones y ejercicios recomendados

---
*Nota: Esta lección fue estructurada en el temario. Haz clic en **Modificar con Chat IA** o **Generar Contenido con IA** en la barra superior para redactar la explicación completa, ejemplos de código interactivos o diagramas.*`;

      pagesToCreate.push({
        slug: `${topicSlugPart}/${docSlugPart}`,
        title: doc.title,
        content: docContent,
        category: categoryTitle,
        order: j + 1,
        categoryOrder,
      });
    });
  });

  const project = await prisma.docProject.create({
    data: {
      name,
      slug,
      teacherId: userId,
      pages: {
        create: pagesToCreate.map(p => ({
          slug: p.slug,
          title: p.title,
          content: p.content,
          category: p.category,
          order: p.order,
          categoryOrder: p.categoryOrder
        }))
      }
    }
  });

  revalidatePath("/dashboard/teacher/docs");
  revalidatePath("/dashboard/admin/docs");
  return { success: true, slug: project.slug };
}

export async function generateFullProjectAction(name: string, prompt: string) {
  const { structure } = await generateCourseStructureProposalAction(name, prompt);
  return await createProjectFromStructureAction(name, structure);
}

export async function getProjectCoursesAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  const projectWithCourses = await prisma.docProject.findFirst({
    where: { id: project.id },
    include: {
      courseLinks: {
        select: {
          course: { select: { id: true, title: true } }
        }
      }
    }
  });
  
  return projectWithCourses?.courseLinks.map(l => l.course) || [];
}

export async function getCourseLinkedProjectsAction(courseId: string) {
  const session = await verifyAdmin();
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true }
  });
  if (!course) throw new Error("Curso no encontrado");
  if (course.teacherId !== session.user.id && session.user.role !== "admin") {
    throw new Error("No tienes permiso sobre este curso");
  }

  const links = await prisma.courseDocProject.findMany({
    where: { courseId },
    include: { docProject: { select: { id: true, name: true, slug: true, icon: true, imageUrl: true } } },
    orderBy: { order: 'asc' }
  });

  return links.map(l => ({ ...l.docProject, linkId: l.id, order: l.order }));
}

export async function linkProjectToCourseAction(courseId: string, projectId: string) {
  const session = await verifyAdmin();
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true }
  });
  if (!course) throw new Error("Curso no encontrado");
  if (course.teacherId !== session.user.id && session.user.role !== "admin") {
    throw new Error("No tienes permiso sobre este curso");
  }

  // Get current max order
  const existing = await prisma.courseDocProject.findMany({
    where: { courseId },
    orderBy: { order: 'desc' },
    take: 1
  });
  const nextOrder = existing.length > 0 ? existing[0].order + 1 : 0;

  await prisma.courseDocProject.upsert({
    where: { courseId_docProjectId: { courseId, docProjectId: projectId } },
    update: {},
    create: { courseId, docProjectId: projectId, order: nextOrder }
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  return { success: true };
}

export async function unlinkProjectFromCourseAction(courseId: string, projectId: string) {
  const session = await verifyAdmin();
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { teacherId: true }
  });
  if (!course) throw new Error("Curso no encontrado");
  if (course.teacherId !== session.user.id && session.user.role !== "admin") {
    throw new Error("No tienes permiso sobre este curso");
  }

  await prisma.courseDocProject.deleteMany({
    where: { courseId, docProjectId: projectId }
  });

  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
  return { success: true };
}

export async function getTeacherDocProjectsAction() {
  const session = await verifyAdmin();
  return await prisma.docProject.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  return {
    id: project.id,
    name: project.name,
    slug: project.slug
  };
}

export async function updateProjectNameAction(projectId: string, newName: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);
  
  await prisma.docProject.update({
    where: { id: project.id },
    data: { name: newName }
  });
  
  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/dashboard/teacher/docs");
  
  
  return { success: true };
}

function sanitizeDocFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function stringToDocSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatToStandardMarkdown(content: string, title?: string): string {
  let body = content || '';

  // 1. If content is JSON array of blocks from BlockEditor designer, convert to standard markdown
  const trimmed = body.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const blocks = JSON.parse(trimmed);
      if (Array.isArray(blocks)) {
        body = blocksToMarkdown(blocks);
      }
    } catch (e) {
      console.warn("Could not parse JSON blocks for markdown formatting:", e);
    }
  }

  // 2. Normalize CRLF to LF
  body = body.replace(/\r\n/g, '\n');

  // 3. Remove excessive consecutive blank lines (more than 2 blank lines -> 1 empty line)
  body = body.replace(/\n{3,}/g, '\n\n');

  // 4. Ensure document starts with H1 title if not already present
  const trimmedBody = body.trim();
  if (title && !trimmedBody.startsWith('# ') && !trimmedBody.startsWith('#\t')) {
    body = `# ${title}\n\n${trimmedBody}`;
  } else {
    body = trimmedBody;
  }

  return body.trim() + '\n';
}

export async function exportProjectAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);
  const tree = await adminService.getProjectFileTree(project.slug);

  const exportFiles: Array<{ path: string; content: string }> = [];
  const exportedSlugs = new Set<string>();

  // Map pages by slug for fast lookup
  const pageMap = new Map<string, any>();
  project.pages.forEach((p: any) => {
    pageMap.set(p.slug, p);
    if (!p.slug.endsWith('/index')) {
      pageMap.set(`${p.slug}/index`, p);
    }
  });

  const formatPageContent = (page: any, overrideCategory?: string, overrideOrder?: number, overrideCatOrder?: number) => {
    let rawContent = page.content || '';
    let parsedData: any = {};
    if (rawContent.trim().startsWith('---')) {
      try {
        const parsed = matter(rawContent);
        rawContent = parsed.content;
        parsedData = parsed.data || {};
      } catch {}
    }

    const title = page.title || parsedData.title || "Sin título";
    const category = overrideCategory || page.category || parsedData.category || "General";
    const order = overrideOrder !== undefined ? overrideOrder : (page.order ?? parsedData.order ?? 0);
    const categoryOrder = overrideCatOrder !== undefined ? overrideCatOrder : (page.categoryOrder ?? parsedData.categoryOrder ?? 0);
    const draft = page.draft !== undefined ? page.draft : (parsedData.draft ?? false);
    const date = page.publishDate ? (page.publishDate instanceof Date ? page.publishDate.toISOString() : page.publishDate) : (parsedData.date || null);
    const icon = page.icon || parsedData.icon || null;

    const cleanMarkdown = formatToStandardMarkdown(rawContent, title);

    const fmLines: string[] = [];
    fmLines.push(`title: "${String(title).replace(/"/g, '\\"')}"`);
    if (category && category !== 'General') {
      fmLines.push(`category: "${category}"`);
    }
    fmLines.push(`order: ${order}`);
    if (categoryOrder !== 0) {
      fmLines.push(`categoryOrder: ${categoryOrder}`);
    }
    if (draft === true) {
      fmLines.push(`draft: true`);
    }
    if (date) {
      fmLines.push(`date: "${date}"`);
    }
    if (icon) {
      fmLines.push(`icon: "${icon}"`);
    }

    return `---\n${fmLines.join('\n')}\n---\n\n${cleanMarkdown}`;
  };

  // 1. Process Folders (Topics) from tree
  const folders = tree.filter(n => n.type === 'folder');
  folders.forEach((folder, folderIdx) => {
    const folderNum = String(folderIdx).padStart(2, '0');
    const topicTitle = folder.title || folder.name;
    const folderName = `${folderNum} ${sanitizeDocFilename(topicTitle)}`;
    
    const children = folder.children || [];
    children.forEach((child, childIdx) => {
      const fileNum = String(childIdx).padStart(2, '0');
      const fileTitle = child.title || child.name;
      const fileName = `${fileNum} ${sanitizeDocFilename(fileTitle)}.md`;
      const fullPath = `${folderName}/${fileName}`;

      const page = pageMap.get(child.path) || project.pages.find((p: any) => p.slug === child.path);
      if (page) {
        exportedSlugs.add(page.slug);
        exportFiles.push({
          path: fullPath,
          content: formatPageContent(page, topicTitle, childIdx * 10, folderIdx * 10)
        });
      } else {
        exportFiles.push({
          path: fullPath,
          content: `# ${fileTitle}\n`
        });
      }
    });
  });

  // 2. Process Root Files from tree
  const rootFiles = tree.filter(n => n.type === 'file');
  rootFiles.forEach((fileNode, fileIdx) => {
    const fileNum = String(fileIdx).padStart(2, '0');
    const fileTitle = fileNode.title || fileNode.name;
    const fileName = `${fileNum} ${sanitizeDocFilename(fileTitle)}.md`;

    const page = pageMap.get(fileNode.path) || project.pages.find((p: any) => p.slug === fileNode.path);
    if (page) {
      exportedSlugs.add(page.slug);
      exportFiles.push({
        path: fileName,
        content: formatPageContent(page, "General", fileIdx * 10, 0)
      });
    } else {
      exportFiles.push({
        path: fileName,
        content: `# ${fileTitle}\n`
      });
    }
  });

  // 3. Any remaining pages not covered in tree
  const remainingPages = project.pages.filter((p: any) => !exportedSlugs.has(p.slug) && !p.slug.endsWith('/index'));
  if (remainingPages.length > 0) {
    const catMap = new Map<string, any[]>();
    remainingPages.forEach((p: any) => {
      const cat = p.category || 'General';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(p);
    });

    let extraCatIdx = folders.length;
    catMap.forEach((pagesInCat, catName) => {
      const catNum = String(extraCatIdx++).padStart(2, '0');
      const folderName = `${catNum} ${sanitizeDocFilename(catName)}`;
      pagesInCat.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      pagesInCat.forEach((p, pIdx) => {
        const fileNum = String(pIdx).padStart(2, '0');
        const fileName = `${fileNum} ${sanitizeDocFilename(p.title)}.md`;
        exportFiles.push({
          path: `${folderName}/${fileName}`,
          content: formatPageContent(p, catName, pIdx * 10, extraCatIdx * 10)
        });
      });
    });
  }

  return {
    projectName: project.name,
    projectSlug: project.slug,
    files: exportFiles
  };
}

export interface ImportedDocFile {
  path: string;
  content: string;
}

export async function importProjectStructureAction(
  projectId: string,
  rawFiles: ImportedDocFile[]
) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session);

  // 1. Filter out non-markdown and hidden files
  let validFiles = rawFiles.filter(f => {
    const p = f.path.replace(/\\/g, '/');
    const name = p.split('/').pop() || '';
    if (name.startsWith('.') || p.includes('/.') || p.startsWith('__MACOSX')) return false;
    return p.toLowerCase().endsWith('.md');
  });

  if (validFiles.length === 0) {
    throw new Error("No se encontraron archivos markdown (.md) válidos para importar.");
  }

  // 2. Detect and strip common root wrapper directory if all files are inside an enclosing folder
  const paths = validFiles.map(f => f.path.replace(/\\/g, '/').replace(/^\/+/, ''));
  const firstSlashIndices = paths.map(p => p.indexOf('/'));
  const allHaveSlash = firstSlashIndices.every(idx => idx > 0);
  if (allHaveSlash) {
    const firstDirs = paths.map(p => p.slice(0, p.indexOf('/')));
    const commonDir = firstDirs[0];
    const allShareCommonDir = firstDirs.every(d => d === commonDir);
    // If the common directory is e.g. "my-project" or "docs-export" (not a numbered topic "00 ...")
    if (allShareCommonDir && !/^\d+[ -_.]/.test(commonDir)) {
      validFiles = validFiles.map(f => ({
        path: f.path.replace(/\\/g, '/').replace(/^\/+/, '').slice(commonDir.length + 1),
        content: f.content
      }));
    }
  }

  // 3. Structure into topics and pages
  interface ParsedItem {
    topicFolderRaw: string | null;
    topicTitle: string;
    topicOrder: number;
    topicSlug: string;
    fileRaw: string;
    fileTitle: string;
    fileOrder: number;
    fileSlug: string;
    content: string;
    draft: boolean;
    publishDate: Date | null;
    icon: string;
  }

  const parsedItems: ParsedItem[] = [];

  validFiles.forEach((file, index) => {
    const normalizedPath = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = normalizedPath.split('/');

    let topicFolderRaw: string | null = null;
    let fileRaw = parts[parts.length - 1];

    if (parts.length > 1) {
      topicFolderRaw = parts[0]; // First level is topic folder
    }

    // Parse frontmatter
    let body = file.content;
    let frontmatter: any = {};
    if (body.trim().startsWith('---')) {
      try {
        const parsed = matter(body);
        body = parsed.content;
        frontmatter = parsed.data || {};
      } catch (err) {
        console.warn("Frontmatter parse error during import:", err);
      }
    }

    // Parse Topic info
    let topicTitle = "General";
    let topicOrder = 0;
    if (topicFolderRaw) {
      const match = topicFolderRaw.match(/^(\d+)[ -_.]+(.*)$/);
      if (match) {
        topicOrder = parseInt(match[1], 10);
        topicTitle = match[2].trim();
      } else {
        topicOrder = index;
        topicTitle = topicFolderRaw.trim();
      }
    }
    if (frontmatter.category && frontmatter.category !== 'General') {
      topicTitle = frontmatter.category;
    }
    if (frontmatter.categoryOrder !== undefined && typeof frontmatter.categoryOrder === 'number') {
      topicOrder = frontmatter.categoryOrder;
    }

    const topicSlug = stringToDocSlug(topicTitle) || `topico-${topicOrder}`;

    // Parse File info
    const cleanBaseName = fileRaw.replace(/\.md$/i, '');
    let fileTitle = cleanBaseName;
    let fileOrder = index;

    const fileMatch = cleanBaseName.match(/^(\d+)[ -_.]+(.*)$/);
    if (fileMatch) {
      fileOrder = parseInt(fileMatch[1], 10);
      fileTitle = fileMatch[2].trim();
    }
    if (frontmatter.title) {
      fileTitle = frontmatter.title;
    }
    if (frontmatter.order !== undefined && typeof frontmatter.order === 'number') {
      fileOrder = frontmatter.order;
    }

    const fileSlug = stringToDocSlug(fileTitle) || `doc-${fileOrder}`;

    let publishDate: Date | null = null;
    if (frontmatter.date) {
      const d = new Date(frontmatter.date);
      if (!isNaN(d.getTime())) publishDate = d;
    }

    const cleanMarkdown = formatToStandardMarkdown(body, fileTitle);

    parsedItems.push({
      topicFolderRaw,
      topicTitle,
      topicOrder,
      topicSlug,
      fileRaw,
      fileTitle,
      fileOrder,
      fileSlug,
      content: cleanMarkdown,
      draft: frontmatter.draft === true,
      publishDate,
      icon: frontmatter.icon || ""
    });
  });

  // 4. Ensure Topic folders are registered (upsert topic index page)
  const uniqueTopics = new Map<string, { title: string; order: number }>();
  parsedItems.forEach(item => {
    if (item.topicFolderRaw && !uniqueTopics.has(item.topicSlug)) {
      uniqueTopics.set(item.topicSlug, {
        title: item.topicTitle,
        order: item.topicOrder
      });
    }
  });

  for (const [tSlug, tInfo] of uniqueTopics.entries()) {
    await prisma.docPage.upsert({
      where: {
        docProjectId_slug: {
          docProjectId: project.id,
          slug: `${tSlug}/index`
        }
      },
      update: {
        title: tInfo.title,
        category: tInfo.title,
        categoryOrder: tInfo.order * 10,
        order: 0,
        updatedAt: new Date()
      },
      create: {
        docProjectId: project.id,
        slug: `${tSlug}/index`,
        title: tInfo.title,
        category: tInfo.title,
        categoryOrder: tInfo.order * 10,
        order: 0,
        content: `# ${tInfo.title}\n\nDocumentación para ${tInfo.title}.`,
        draft: false
      }
    });
  }

  // 5. Upsert all pages
  const usedSlugs = new Set<string>();
  let importedCount = 0;

  for (const item of parsedItems) {
    const isTopicIndex = item.fileSlug === 'index' || item.fileRaw.toLowerCase() === 'index.md';
    let targetSlug = item.topicFolderRaw ? `${item.topicSlug}/${item.fileSlug}` : item.fileSlug;

    if (isTopicIndex && item.topicFolderRaw) {
      targetSlug = `${item.topicSlug}/index`;
    } else {
      let finalSlug = targetSlug;
      let counter = 2;
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${targetSlug}-${counter++}`;
      }
      targetSlug = finalSlug;
      usedSlugs.add(targetSlug);
    }

    await prisma.docPage.upsert({
      where: {
        docProjectId_slug: {
          docProjectId: project.id,
          slug: targetSlug
        }
      },
      update: {
        title: item.fileTitle,
        content: item.content,
        category: item.topicTitle,
        categoryOrder: item.topicOrder * 10,
        order: item.fileOrder * 10,
        draft: item.draft,
        publishDate: item.publishDate,
        icon: item.icon,
        updatedAt: new Date()
      },
      create: {
        docProjectId: project.id,
        slug: targetSlug,
        title: item.fileTitle,
        content: item.content,
        category: item.topicTitle,
        categoryOrder: item.topicOrder * 10,
        order: item.fileOrder * 10,
        draft: item.draft,
        publishDate: item.publishDate,
        icon: item.icon
      }
    });

    importedCount++;
  }

  revalidatePath(`/dashboard/teacher/docs/${project.slug}`, "page");
  revalidatePath(`/dashboard/teacher/docs/${project.id}`, "page");
  revalidatePath("/docs", "layout");

  return {
    success: true,
    count: importedCount,
    topicsCount: uniqueTopics.size
  };
}

export async function getProjectEditorialBookDataAction(projectId: string) {
  const session = await verifyAdmin();
  const project = await checkProjectOwnership(projectId, session, true);
  
  const teacherUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true }
  });
  const authorName = teacherUser?.name || session.user.name || "Profesor Titular";

  const tree = await adminService.getProjectFileTree(project.slug);

  const pageMap = new Map<string, any>();
  project.pages.forEach((p: any) => {
    pageMap.set(p.slug, p);
    if (!p.slug.endsWith('/index')) {
      pageMap.set(`${p.slug}/index`, p);
    }
  });

  // 1. Root / Intro page (index)
  const rootIndexPage = pageMap.get("index") || project.pages.find((p: any) => p.slug === "index");
  let intro: { title: string; content: string } | undefined;
  if (rootIndexPage) {
    let rawContent = rootIndexPage.content || "";
    if (rawContent.trim().startsWith("---")) {
      try {
        const parsed = matter(rawContent);
        rawContent = parsed.content;
      } catch {}
    }
    const cleanContent = formatToStandardMarkdown(rawContent, rootIndexPage.title || "Inicio");
    intro = {
      title: rootIndexPage.title || "Presentación del Curso",
      content: cleanContent,
    };
  }

  // 2. Chapters (Topics)
  const folders = tree.filter(n => n.type === 'folder');
  const chapters: Array<{
    number: number;
    title: string;
    description: string;
    introContent?: string;
    lessons: Array<{
      number: string;
      title: string;
      content: string;
    }>;
  }> = [];

  folders.forEach((folder, folderIdx) => {
    const chapterNumber = folderIdx + 1;
    const topicTitle = folder.title || folder.name;
    const topicDescription = folder.description || "";

    const topicIndexPage = pageMap.get(`${folder.path}/index`) || pageMap.get(folder.path);
    let topicIntroContent: string | undefined;
    if (topicIndexPage) {
      let rawContent = topicIndexPage.content || "";
      if (rawContent.trim().startsWith("---")) {
        try {
          const parsed = matter(rawContent);
          rawContent = parsed.content;
        } catch {}
      }
      topicIntroContent = formatToStandardMarkdown(rawContent, topicTitle);
    }

    const lessons: Array<{ number: string; title: string; content: string }> = [];
    const children = (folder.children || []).filter(c => c.name !== 'index');

    children.forEach((child, childIdx) => {
      const lessonNumber = `${chapterNumber}.${childIdx + 1}`;
      const lessonTitle = child.title || child.name;
      const page = pageMap.get(child.path) || project.pages.find((p: any) => p.slug === child.path);

      let lessonContent = `# ${lessonTitle}\n`;
      if (page) {
        let raw = page.content || "";
        if (raw.trim().startsWith("---")) {
          try {
            const parsed = matter(raw);
            raw = parsed.content;
          } catch {}
        }
        lessonContent = formatToStandardMarkdown(raw, lessonTitle);
      }

      lessons.push({
        number: lessonNumber,
        title: lessonTitle,
        content: lessonContent,
      });
    });

    chapters.push({
      number: chapterNumber,
      title: topicTitle,
      description: topicDescription,
      introContent: topicIntroContent,
      lessons,
    });
  });

  return {
    projectName: project.name,
    projectSlug: project.slug,
    authorName,
    academicYear: new Date().getFullYear().toString(),
    institutionName: "SmartClass Academic Press",
    createdAt: new Date(project.createdAt).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    intro,
    chapters,
  };
}


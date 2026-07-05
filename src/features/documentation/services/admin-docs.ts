import prisma from "@/lib/prisma";

export interface FileNode {
  name: string;
  path: string; // En el nuevo sistema, path será el slug de la página
  type: 'file' | 'folder';
  title?: string;
  description?: string;
  icon?: string;
  sha?: string;
  order: number;
  draft?: boolean;
  publishDate?: Date | null;
  createdAt?: Date;
  children?: FileNode[];
}

function parseMetadataFromSlug(slug: string) {
  const parts = slug.split('/');
  const isIndex = slug === 'index' || slug.endsWith('/index');
  
  let category = "General";
  let categoryOrder = 0;
  let title = "";
  let order = 0;

  const formatName = (s: string) => s.split(/[ \-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (parts.length > 1) {
    // 01-topico/02-archivo
    const categoryPart = parts[0];
    const catMatch = categoryPart.match(/^(\d+)-(.*)$/);
    if (catMatch) {
      categoryOrder = parseInt(catMatch[1]);
      category = formatName(catMatch[2]);
    } else {
      category = formatName(categoryPart);
    }

    const filePart = parts[parts.length - 1];
    if (filePart === 'index') {
       title = category; 
       order = 0; 
    } else {
       const fileMatch = filePart.match(/^(\d+)-(.*)$/);
       if (fileMatch) {
         order = parseInt(fileMatch[1]);
         title = formatName(fileMatch[2]);
       } else {
         title = formatName(filePart);
       }
    }
  } else {
    // Archivo en raíz
    const filePart = parts[0];
    if (filePart === 'index') {
       title = "Inicio";
       order = 0;
    } else {
      const fileMatch = filePart.match(/^(\d+)-(.*)$/);
      if (fileMatch) {
        order = parseInt(fileMatch[1]);
        title = formatName(fileMatch[2]);
      } else {
        title = formatName(filePart);
      }
    }
  }

  return {
    category,
    categoryOrder,
    title,
    order
  };
}

/**
 * Transforma las páginas de un proyecto en una estructura de árbol para el explorador
 */
export async function getProjectFileTree(projectId: string): Promise<FileNode[]> {
  const decodedId = decodeURIComponent(projectId);
  const project = await prisma.docProject.findUnique({
    where: { slug: decodedId },
    include: { pages: true }
  });

  if (!project) return [];

  const root: FileNode[] = [];
  const map: Record<string, FileNode> = {};

  project.pages.forEach(page => {
    const parts = page.slug.split('/');
    let currentPath = "";

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map[currentPath]) {
        const node: FileNode = {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'folder',
          title: page.title,
          description: page.description || "",
          icon: page.icon || undefined,
          sha: page.updatedAt.getTime().toString(),
          order: isLast ? page.order : page.categoryOrder,
          draft: isLast ? page.draft : false,
          publishDate: isLast ? page.publishDate : null,
          createdAt: page.createdAt,
          children: isLast ? undefined : []
        };
        map[currentPath] = node;

        if (!parentPath) {
          root.push(node);
        } else {
          const parent = map[parentPath];
          if (parent && parent.children) {
            parent.children.push(node);
          }
        }
      }

      if (isLast && part === 'index' && parentPath && map[parentPath]) {
        map[parentPath].title = page.title;
        map[parentPath].description = page.description || "";
        map[parentPath].icon = page.icon || undefined;
        map[parentPath].order = page.categoryOrder;
        map[parentPath].sha = page.updatedAt.getTime().toString();
        map[parentPath].draft = page.draft;
        map[parentPath].publishDate = page.publishDate;
        map[parentPath].createdAt = page.createdAt;
        
        const parent = map[parentPath];
        if (parent.children) {
          parent.children = parent.children.filter(c => c.name !== 'index');
        }
        delete map[currentPath];
        return; 
      }
    });
  });

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
    });
    nodes.forEach(n => n.children && sortNodes(n.children));
  };

  sortNodes(root);
  return root;
}

/**
 * Obtiene el contenido de una página por su slug (path)
 */
export async function readFileContent(projectSlug: string, pageSlug: string) {
  const page = await prisma.docPage.findFirst({
    where: { 
      docProject: { slug: projectSlug },
      OR: [
        { slug: pageSlug },
        { slug: `${pageSlug}/index` }
      ]
    }
  });

  if (!page) throw new Error(`Página no encontrada: ${pageSlug}`);

  return {
    content: page.content,
    sha: page.updatedAt.getTime().toString(),
    metadata: {
      title: page.title,
      description: page.description,
      category: page.category,
      order: page.order,
      categoryOrder: page.categoryOrder,
      icon: page.icon,
      draft: page.draft,
      publishDate: page.publishDate
    }
  };
}

/**
 * Guarda o crea una página en la base de datos
 */
export async function saveFileContent(
  projectSlug: string, 
  pageSlug: string, 
  content: string,
  metadata?: { title?: string, order?: number, category?: string, categoryOrder?: number }
): Promise<string> {
  const project = await prisma.docProject.findUnique({
    where: { slug: projectSlug }
  });

  if (!project) throw new Error("Proyecto no encontrado");

  const fallbackMetadata = parseMetadataFromSlug(pageSlug);
  
  const existingPage = await prisma.docPage.findFirst({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: pageSlug },
        { slug: `${pageSlug}/index` }
      ]
    }
  });

  const finalTitle = metadata?.title || existingPage?.title || fallbackMetadata.title;
  const finalOrder = metadata?.order !== undefined ? metadata.order : existingPage?.order !== undefined ? existingPage.order : fallbackMetadata.order;
  const finalCategory = metadata?.category || existingPage?.category || fallbackMetadata.category;
  const finalCategoryOrder = metadata?.categoryOrder !== undefined ? metadata.categoryOrder : existingPage?.categoryOrder !== undefined ? existingPage.categoryOrder : fallbackMetadata.categoryOrder;

  const targetSlug = existingPage?.slug || pageSlug;

  const page = await prisma.docPage.upsert({
    where: {
      docProjectId_slug: {
        docProjectId: project.id,
        slug: targetSlug
      }
    },
    update: {
      content,
      title: finalTitle,
      category: finalCategory,
      order: finalOrder,
      categoryOrder: finalCategoryOrder,
      updatedAt: new Date()
    },
    create: {
      docProjectId: project.id,
      slug: targetSlug,
      content,
      title: finalTitle,
      category: finalCategory,
      order: finalOrder,
      categoryOrder: finalCategoryOrder,
    }
  });

  // Forzar actualización del proyecto para invalidar cachés
  await prisma.docProject.update({
    where: { id: project.id },
    data: { updatedAt: new Date() }
  });

  return page.updatedAt.getTime().toString();
}

/**
 * Elimina una página
 */
export async function deleteItem(projectSlug: string, pageSlug: string): Promise<void> {
  const project = await prisma.docProject.findUnique({ where: { slug: projectSlug } });
  if (!project) {
    console.error(`[deleteItem] Proyecto no encontrado: ${projectSlug}`);
    return;
  }

  // Si pageSlug está vacío, no hacemos nada para evitar borrar todo el proyecto accidentalmente
  if (!pageSlug || pageSlug.trim() === "") {
    console.warn(`[deleteItem] Se intentó borrar una ruta vacía en el proyecto ${projectSlug}`);
    return;
  }

  const result = await prisma.docPage.deleteMany({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: pageSlug },
        { slug: { startsWith: `${pageSlug}/` } }
      ]
    }
  });

  console.log(`[deleteItem] Eliminados ${result.count} elementos con slug base: ${pageSlug}`);

  await prisma.docProject.update({
    where: { id: project.id },
    data: { updatedAt: new Date() }
  });
}

/**
 * Inicializa un nuevo proyecto
 */
export async function initNewProject(name: string, teacherId: string): Promise<string> {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  
  const project = await prisma.docProject.create({
    data: {
      name,
      slug,
      teacherId,
      pages: {
        create: {
          slug: "index",
          title: "Inicio",
          content: `# Bienvenidos a ${name}\n\nEsta es la página principal del proyecto.`
        }
      }
    }
  });

  return project.slug;
}

/**
 * Renombrar una página (cambiar slug)
 */
export async function renameItem(projectSlug: string, oldSlug: string, newName: string): Promise<string> {
  const project = await prisma.docProject.findUnique({ where: { slug: projectSlug } });
  if (!project) throw new Error("Proyecto no encontrado");

  const parent = oldSlug.includes('/') ? oldSlug.split('/').slice(0, -1).join('/') + '/' : '';
  const newSlug = `${parent}${newName}`.replace(/\.md$/, '');
  
  const pagesToUpdate = await prisma.docPage.findMany({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: oldSlug },
        { slug: { startsWith: `${oldSlug}/` } }
      ]
    }
  });

  if (pagesToUpdate.length === 0) throw new Error(`No se encontró el elemento: ${oldSlug}`);

  await prisma.$transaction(
    pagesToUpdate.map(page => {
      const relativePath = page.slug === oldSlug ? "" : page.slug.substring(oldSlug.length);
      const updatedSlug = `${newSlug}${relativePath}`;
      const metadata = parseMetadataFromSlug(updatedSlug);
      
      return prisma.docPage.update({
        where: { id: page.id },
        data: {
          slug: updatedSlug,
          title: page.slug === oldSlug || page.slug === `${oldSlug}/index` ? metadata.title : undefined,
          category: metadata.category,
          order: metadata.order,
          categoryOrder: metadata.categoryOrder
        }
      });
    })
  );

  await prisma.docProject.update({
    where: { id: project.id },
    data: { updatedAt: new Date() }
  });

  return newSlug;
}

/**
 * Mover una página
 */
export async function moveItem(projectSlug: string, oldSlug: string, newParentSlug: string): Promise<string> {
  const project = await prisma.docProject.findUnique({ where: { slug: projectSlug } });
  if (!project) throw new Error("Proyecto no encontrado");

  const fileName = oldSlug.split('/').pop() || '';
  const newSlug = newParentSlug ? `${newParentSlug}/${fileName}` : fileName;

  const pagesToUpdate = await prisma.docPage.findMany({
    where: {
      docProjectId: project.id,
      OR: [
        { slug: oldSlug },
        { slug: { startsWith: `${oldSlug}/` } }
      ]
    }
  });

  if (pagesToUpdate.length === 0) throw new Error(`No se encontró el elemento: ${oldSlug}`);

  await prisma.$transaction(
    pagesToUpdate.map(page => {
      const relativePath = page.slug === oldSlug ? "" : page.slug.substring(oldSlug.length);
      const updatedSlug = `${newSlug}${relativePath}`;
      const metadata = parseMetadataFromSlug(updatedSlug);
      
      return prisma.docPage.update({
        where: { id: page.id },
        data: {
          slug: updatedSlug,
          category: metadata.category,
          order: metadata.order,
          categoryOrder: metadata.categoryOrder
        }
      });
    })
  );

  await prisma.docProject.update({
    where: { id: project.id },
    data: { updatedAt: new Date() }
  });

  return newSlug;
}

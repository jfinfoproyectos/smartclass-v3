import prisma from "@/lib/prisma";

export interface NavItem {
  id: string;
  title: string;
  slug: string;
  type: 'file' | 'folder';
  order: number;
  publishDate?: Date | null;
  createdAt?: Date;
  icon?: string;
  children?: NavItem[];
}

// Persistent server-side caches
const projectCache = new Map<string, { data: any; updatedAt: number }>();
const pageCache = new Map<string, { data: any; updatedAt: number }>();
const navTreeCache = new Map<string, { data: any; updatedAt: number }>();

export async function getPublicDocProject(projectId: string, includePages = false) {
  try {
    // Check the updatedAt without reading all contents first
    const check = await prisma.docProject.findFirst({
      where: {
        OR: [
          { id: projectId },
          { slug: projectId }
        ]
      },
      select: { id: true, updatedAt: true }
    });

    if (!check) return null;

    const cacheKey = `${check.id}:${includePages}`;
    const cached = projectCache.get(cacheKey);
    if (cached && cached.updatedAt === check.updatedAt.getTime()) {
      return cached.data;
    }

    const project = await prisma.docProject.findUnique({
      where: { id: check.id },
      include: includePages ? { pages: true } : undefined,
    });

    if (project) {
      projectCache.set(cacheKey, { data: project, updatedAt: check.updatedAt.getTime() });
    }

    return project;
  } catch (error) {
    console.error("Error in getPublicDocProject, attempting cache fallback:", error);
    // Fallback to ANY cached version of this project if DB fails
    for (const [key, value] of projectCache.entries()) {
      if (key.startsWith(projectId) || (value.data && (value.data.id === projectId || value.data.slug === projectId))) {
        return value.data;
      }
    }
    throw error; // Re-throw if no cache available to trigger error boundary
  }
}

export async function getPublicDocPage(projectId: string, pageSlug: string, includeDrafts = false) {
  try {
    const project = await prisma.docProject.findFirst({
      where: {
        OR: [
          { id: projectId },
          { slug: projectId }
        ]
      },
      select: { id: true }
    });

    if (!project) return null;

    let targetSlug = pageSlug ? pageSlug : "index";
    
    let check = await prisma.docPage.findFirst({
      where: {
        docProjectId: project.id,
        slug: targetSlug,
      },
      select: { id: true, updatedAt: true }
    });

    // Fallback check for folder/index
    if (!check && pageSlug) {
      const fallbackSlug = `${pageSlug}/index`;
      check = await prisma.docPage.findFirst({
        where: {
          docProjectId: project.id,
          slug: fallbackSlug,
        },
        select: { id: true, updatedAt: true }
      });
      if (check) {
        targetSlug = fallbackSlug;
        const cacheKey = `${project.id}:${targetSlug}`;
        const cached = pageCache.get(cacheKey);
        if (cached && cached.updatedAt === check.updatedAt.getTime()) {
          return { ...cached.data, _source: "cache" };
        }
      }
    }

    if (!check) {
      return null;
    }

    const cacheKey = `${project.id}:${targetSlug}`;
    const cached = pageCache.get(cacheKey);
    if (cached && cached.updatedAt === check.updatedAt.getTime()) {
      return { ...cached.data, _source: "cache" };
    }

    const visibilityFilter: any = {
      OR: [
        { publishDate: null },
        { publishDate: { lte: new Date() } }
      ]
    };

    if (!includeDrafts) {
      visibilityFilter.draft = false;
    }

    let page = await prisma.docPage.findFirst({
      where: {
        docProjectId: project.id,
        slug: targetSlug,
        ...visibilityFilter
      }
    });

    if (!page && pageSlug) {
      page = await prisma.docPage.findFirst({
        where: {
          docProjectId: project.id,
          slug: `${pageSlug}/index`,
          ...visibilityFilter
        }
      });
    }

    if (page) {
      pageCache.set(cacheKey, { data: page, updatedAt: check.updatedAt.getTime() });
      return { ...page, _source: "database" };
    }

    return null;
  } catch (error) {
    console.error("Error in getPublicDocPage, attempting cache fallback:", error);
    const targetSlug = pageSlug ? pageSlug : "index";
    // Search in cache by slug if DB fails
    for (const [key, value] of pageCache.entries()) {
      if (key.includes(targetSlug) || (pageSlug && key.includes(`${pageSlug}/index`))) {
        return { ...value.data, _source: "cache" };
      }
    }
    throw error;
  }
}

export async function getProjectNavigationTree(projectId: string, includeDrafts = false): Promise<NavItem[]> {
  try {
    const check = await prisma.docProject.findFirst({
      where: {
        OR: [
          { id: projectId },
          { slug: projectId }
        ]
      },
      select: { id: true, updatedAt: true }
    });

    if (!check) return [];

    const cacheKey = `${check.id}:${includeDrafts}`;
    const cached = navTreeCache.get(cacheKey);
    if (cached && cached.updatedAt === check.updatedAt.getTime()) {
      return cached.data;
    }

    const project = await prisma.docProject.findUnique({
      where: { id: check.id },
      include: { pages: true },
    });

    if (!project) return [];

    const pages = project.pages
      .filter(page => includeDrafts || !page.draft)
      .sort((a, b) => {
        if (a.categoryOrder !== b.categoryOrder) return (a.categoryOrder || 0) - (b.categoryOrder || 0);
        if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const tree: NavItem[] = [];
    const folderMap = new Map<string, NavItem>();

    const getOrCreateFolder = (slugPath: string, title: string, order: number): NavItem => {
      if (folderMap.has(slugPath)) return folderMap.get(slugPath)!;
      
      const parts = slugPath.split('/');
      const navItem: NavItem = {
        id: `folder-${slugPath}`,
        title: title || parts[parts.length - 1],
        slug: slugPath,
        type: 'folder',
        order: order,
        createdAt: new Date(), // Fallback
        children: []
      };
      
      folderMap.set(slugPath, navItem);
      
      if (parts.length === 1) {
        tree.push(navItem);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = getOrCreateFolder(parentPath, parts[parts.length - 2], order);
        parent.children?.push(navItem);
      }
      
      return navItem;
    };

    for (const page of pages) {
      const parts = page.slug.split('/');
      const isIndex = parts[parts.length - 1] === 'index';
      
      if (isIndex && parts.length > 1) {
        const folderPath = parts.slice(0, -1).join('/');
        const folder = getOrCreateFolder(folderPath, page.title || parts[parts.length - 2], page.categoryOrder || 0);
        folder.id = page.id;
        folder.title = page.title || folder.title;
        folder.order = page.categoryOrder || folder.order;
        folder.publishDate = page.publishDate;
        folder.createdAt = page.createdAt;
        folder.icon = page.icon || undefined;
      } else if (page.slug === 'index') {
         // skip
      } else {
        const navItem: NavItem = {
          id: page.id,
          title: page.title || parts[parts.length - 1].split(/[ \-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          slug: page.slug,
          type: 'file',
          order: page.order || 0,
          publishDate: page.publishDate,
          createdAt: page.createdAt,
          icon: page.icon || undefined,
        };
        
        if (parts.length === 1) {
          tree.push(navItem);
        } else {
          const parentPath = parts.slice(0, -1).join('/');
          const parent = getOrCreateFolder(parentPath, parts[parts.length - 2], 0);
          parent.children?.push(navItem);
        }
      }
    }

    const sortRecursive = (items: NavItem[]) => {
      items.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
      });
      items.forEach(item => {
        if (item.children) sortRecursive(item.children);
      });
    };
    sortRecursive(tree);

    navTreeCache.set(cacheKey, { data: tree, updatedAt: check.updatedAt.getTime() });
    return tree;
  } catch (error) {
    console.error("Error in getProjectNavigationTree, attempting cache fallback:", error);
    // Search in cache by projectId if DB fails
    for (const [key, value] of navTreeCache.entries()) {
      if (key.startsWith(projectId)) {
        return value.data;
      }
    }
    throw error;
  }
}

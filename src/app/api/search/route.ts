import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { create, insert, search } from "@orama/orama";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const projectSlug = searchParams.get("project");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 1. Obtener páginas válidas de la base de datos
    const pages = await prisma.docPage.findMany({
      where: {
        AND: [
          { draft: false },
          {
            OR: [
              { publishDate: null },
              { publishDate: { lte: new Date() } }
            ]
          },
          ...(projectSlug ? [{ docProject: { slug: projectSlug } }] : []),
        ]
      },
      include: {
        docProject: true,
      },
    });

    if (pages.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 2. Inicializar Orama y Crear el Índice en Memoria
    const db = await create({
      schema: {
        id: "string",
        title: "string",
        content: "string",
        slug: "string",
        topic: "string",
      } as const,
    });

    // 3. Insertar documentos en Orama
    for (const page of pages) {
      await insert(db, {
        id: page.id,
        title: page.title || "",
        content: page.content || "",
        slug: page.slug || "",
        topic: page.docProject.name || "",
      });
    }

    // 4. Realizar la búsqueda profesional
    const searchResults = await search(db, {
      term: query,
      properties: ["title", "content", "topic"],
      boost: {
        title: 2,
        topic: 1.5,
        content: 1,
      },
      tolerance: 1,
    });

    // 5. Formatear resultados con Deep-Linking (Hash)
    const words = query.trim().split(/\s+/);
    
    const formattedResults = searchResults.hits.map((hit: any) => {
      const page = pages.find(p => p.id === hit.document.id);
      if (!page) return null;

      let url = `/docs/${page.docProject.slug}/${page.slug === "index" ? "" : page.slug}`;
      let snippet = "";
      let hash = "";

      if (page.content) {
        // Strip Markdown and MDX for cleaner snippets
        const stripMarkdown = (text: string) => {
          return text
            .replace(/<[^>]*>/g, '') // Remove HTML/JSX tags
            .replace(/#+\s+/g, '') // Remove Headings
            .replace(/\*\*|__|[*_]/g, '') // Remove Bold/Italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove Links but keep text
            .replace(/`{3,}[^`]*`{3,}/gm, '') // Remove Code Blocks
            .replace(/`[^`]*`/g, '') // Remove Inline Code
            .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove Images
            .replace(/>\s+/g, '') // Remove Blockquotes
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();
        };

        const cleanContent = stripMarkdown(page.content);
        const lowerContent = cleanContent.toLowerCase();
        
        let firstWordIndex = -1;
        for (const word of words) {
          const idx = lowerContent.indexOf(word.toLowerCase());
          if (idx !== -1 && (firstWordIndex === -1 || idx < firstWordIndex)) {
            firstWordIndex = idx;
          }
        }
        
        if (firstWordIndex !== -1) {
          // Para el hash (deep linking) seguimos usando el original para detectar encabezados reales
          const contentBefore = page.content.substring(0, page.content.toLowerCase().indexOf(words[0].toLowerCase()));
          const headingMatches = Array.from(contentBefore.matchAll(/^#+\s+(.*)$/gm)) as any[];
          
          if (headingMatches.length > 0) {
            const lastHeadingText = headingMatches[headingMatches.length - 1][1];
            const generatedId = lastHeadingText.toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            hash = `#${generatedId}`;
          }
          
          const start = Math.max(0, firstWordIndex - 40);
          const end = Math.min(cleanContent.length, start + 140);
          snippet = (start > 0 ? "..." : "") + cleanContent.substring(start, end) + (end < cleanContent.length ? "..." : "");
        } else {
          snippet = cleanContent.substring(0, 140) + "...";
        }
      }

      return {
        title: page.title,
        content: snippet,
        url: url + hash,
        topic: page.docProject.name,
        score: hit.score
      };
    }).filter(Boolean);

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

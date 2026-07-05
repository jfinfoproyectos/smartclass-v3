import React from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { remarkP5Sketch } from "../utils/remark-p5";
import { remarkMermaid } from "../utils/remark-mermaid";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { MdxErrorFallback } from "./MdxErrorFallback";
import { CodeBlockWrapper } from "./mdx/CodeBlockWrapper";
import { mdxComponents } from "./mdx-components";
import { getCodeTheme } from "@/app/actions/code-themes";
import { resolveShikiTheme } from "@/features/documentation/utils/shiki-themes";

const components = {
  ...mdxComponents,
  a: ({ children, ...props }: any) => (
    <a 
      {...props} 
      className="text-primary font-bold underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all duration-300"
    >
      {children}
    </a>
  ),
  h1: (props: any) => <h1 {...props} className="text-4xl font-extrabold tracking-tight text-foreground mb-8 border-b-2 border-primary/20 pb-2" />,
  figure: ({ children, "data-rehype-pretty-code-figure": isPrettyCode, ...props }: any) => {
    if (isPrettyCode !== undefined || 'data-rehype-pretty-code-figure' in props) {
      return <CodeBlockWrapper {...props} data-rehype-pretty-code-figure={isPrettyCode}>{children}</CodeBlockWrapper>;
    }
    return <figure {...props}>{children}</figure>;
  },
  pre: (props: any) => <pre {...props} className="bg-transparent border-0 p-0 m-0 overflow-visible" />,
  code: (props: any) => {
    const isInline = !props.className?.includes('language-');
    if (isInline) {
      return <code {...props} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-primary/20" />;
    }
    return <code {...props} />;
  },
  blockquote: ({ children }: { children: React.ReactNode }) => {
    // Detect GitHub-style alerts [!NOTE], [!TIP], etc.
    const text = React.Children.toArray(children)
      .map(child => {
        if (React.isValidElement(child) && child.props && typeof child.props === "object" && "children" in (child.props as Record<string, unknown>)) {
          return (child.props as any).children;
        }
        return "";
      })
      .join("");
    
    const alertMatch = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
    
    if (alertMatch) {
      const type = alertMatch[1] as "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
      const alertClass = `markdown-alert markdown-alert-${type.toLowerCase()}`;
      
      const icons = {
        NOTE: () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"></path><path d="M7.25 12V6.75H8.75V12H7.25ZM7.25 4V5.5H8.75V4H7.25Z"></path></svg>,
        TIP: () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5c-2.363 0-4.43 1.27-5.534 3.191-.33.576-.466 1.251-.466 1.944 0 .93.3 1.83.84 2.62.62.91 1.05 1.76 1.15 2.59.05.41.05.74.05 1.01v.625c0 .552.448 1 1 1h6c.552 0 1-.448 1-1V12.19c0-.27 0-.6-.05-1.01-.1-.83-.53-1.68-1.15-2.59a4.804 4.804 0 0 0 .84-2.62c0-.693-.136-1.368-.466-1.944C12.43 2.77 10.363 1.5 8 1.5ZM6.5 13.5v.5c0 .552.448 1 1 1h1c.552 0 1-.448 1-1v-.5h-3Z"></path></svg>,
        IMPORTANT: () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A.75.75 0 0 1 4.22 15.04l-.004-.332-.004-1.708H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 .75.75v1.44l1.94-1.94a.75.75 0 0 1 .53-.22h6.75a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.25 3h1.5v4h-1.5V3Z"></path></svg>,
        WARNING: () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.03 11.315c.602 1.129-.218 2.487-1.543 2.487H2.031c-1.325 0-2.145-1.358-1.543-2.487l6.03-11.315ZM8 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path></svg>,
        CAUTION: () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53L4.47.22ZM5.207 1.5 1.5 5.207v5.586l3.707 3.707h5.586l3.707-3.707V5.207L10.793 1.5H5.207Z"></path><path d="M8 4a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 8 4Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"></path></svg>
      };
      
      const Icon = icons[type];

      return (
        <div className={alertClass}>
          <div className="markdown-alert-title">
            <Icon />
            <span>{type}</span>
          </div>
          <div className="text-[13px] opacity-90">
             {/* Remove the prefix from the first child if it's text */}
             {React.Children.map(children, (child, i) => {
               if (i === 0 && React.isValidElement(child) && child.props && typeof child.props === "object" && "children" in (child.props as Record<string, unknown>)) {
                 const originalText = (child.props as any).children;
                 if (typeof originalText === 'string') {
                   return originalText.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/, '');
                 }
               }
               return child;
             })}
          </div>
        </div>
      );
    }

    return <blockquote>{children}</blockquote>;
  },
  table: ({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-8 w-full overflow-x-auto border border-border/40 rounded-xl bg-card/10 backdrop-blur-md shadow-sm select-text">
      <table className="w-full border-collapse text-left" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/40 border-b border-border/60" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-border/40" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-muted/10 transition-colors" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 font-black text-foreground tracking-wider select-none uppercase text-[11px]" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 text-muted-foreground leading-relaxed break-words" {...props}>
      {children}
    </td>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-6 my-6 space-y-2 text-foreground/80" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 my-6 space-y-2 text-foreground/80" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
};

interface MarkdownRendererProps {
  content: string;
  codeTheme?: string;
  isPreview?: boolean;
}

export default async function MarkdownRenderer({ content, codeTheme: providedTheme, isPreview = false }: MarkdownRendererProps) {
  let codeTheme = null;
  
  if (!isPreview) {
    try {
      const rawThemeName = providedTheme || await getCodeTheme();
      // Carga el tema como objeto desde bundledThemes de Shiki para compatibilidad
      // con entornos serverless (Vercel). Los strings no funcionan en producción.
      codeTheme = await resolveShikiTheme(rawThemeName);
    } catch (e) {
      console.warn("Failed to load shiki theme, proceeding without it", e);
    }
  }

  try {
    const rehypePlugins: any[] = [rehypeSlug];
    
    // Solo usamos rehype-pretty-code (Shiki) en producción estática
    // En la vista previa (Serverless) da problemas de módulos dinámicos y relentiza el tipado
    if (!isPreview && codeTheme) {
      rehypePlugins.push([
        rehypePrettyCode,
        {
          theme: codeTheme,
          keepBackground: true,
        },
      ]);
    }

    const { content: compiledContent } = await compileMDX({
      source: content,
      components,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkP5Sketch, remarkMermaid],
          rehypePlugins,
        },
      },
    });

    return (
      <div className="prose prose-slate dark:prose-invert max-w-none prose-pre:p-0 prose-headings:scroll-mt-20">
        {compiledContent}
      </div>
    );
  } catch (error: any) {
    console.error("MDX Compilation Error:", error);
    // IMPORTANTE: Extraer el mensaje como string. Next.js RSC no puede serializar un objeto Error nativo hacia un Client Component.
    return <MdxErrorFallback error={error?.message || String(error)} />;
  }
}

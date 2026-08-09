import { NavItem } from "../../services/public-docs";
import Link from "next/link";
import { ArrowUpRight, FileText, Folder, BookOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import DynamicIcon from "../DynamicIcon";

interface TopicNavigationProps {
  items: NavItem[];
  projectId: string;
}

export function TopicNavigation({ items, projectId }: TopicNavigationProps) {
  const filteredItems = (items || []).filter(
    item => item.slug.toLowerCase() !== "inicio" && item.title.toLowerCase() !== "inicio"
  );

  if (!filteredItems || filteredItems.length === 0) return null;

  return (
    <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full space-y-6">
      {/* Section Divider Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] shrink-0">
          <Layers className="w-3.5 h-3.5" />
          <span>Explorar Temas</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/20 via-border/40 to-transparent" />
      </div>

      {/* Grid of Topic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        {filteredItems.map((item) => {
          const isFolder = item.type === "folder";
          const itemCount = item.children?.length || 0;

          return (
            <Link
              key={item.id}
              href={`/docs/${projectId}/${item.slug === "index" ? "" : item.slug}`}
              className="group relative p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 hover:bg-card/90 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 backdrop-blur-md shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Top Accent Gradient Bar on Hover */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Ambient radial background glow on hover */}
              <div className="absolute -inset-px bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

              <div className="relative z-10 flex items-start gap-3.5">
                {/* Icon Badge */}
                <div className="p-3 rounded-xl transition-all duration-300 shrink-0 shadow-sm border bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                   {item.icon ? (
                     <DynamicIcon icon={item.icon} className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                   ) : (
                     isFolder ? <Folder className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" /> : <FileText className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                   )}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border leading-none bg-primary/10 text-primary border-primary/20">
                      {isFolder ? 'Sección' : 'Tema'}
                    </span>

                    <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors whitespace-normal break-words leading-snug tracking-tight">
                    {item.title}
                  </h4>
                </div>
              </div>

              {/* Bottom Metadata Line */}
              <div className="relative z-10 pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 text-muted-foreground/80 group-hover:text-foreground transition-colors">
                  <BookOpen className="w-3 h-3 text-primary/70" />
                  {isFolder ? (itemCount > 0 ? `${itemCount} subtemas` : "Ver carpeta") : "Guía de lectura"}
                </span>

                <span className="font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Explorar →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


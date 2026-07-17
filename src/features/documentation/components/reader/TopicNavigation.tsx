import { NavItem } from "../../services/public-docs";
import Link from "next/link";
import { ArrowRight, FileText, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import DynamicIcon from "../DynamicIcon";

interface TopicNavigationProps {
  items: NavItem[];
  projectId: string;
}

export function TopicNavigation({ items, projectId }: TopicNavigationProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60 whitespace-nowrap">
          Explorar sección
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/docs/${projectId}/${item.slug === "index" ? "" : item.slug}`}
            className="group relative p-5 rounded-2xl border border-border/40 bg-card/30 hover:bg-primary/5 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex items-center gap-4 overflow-hidden"
          >
            {/* Ambient hover gradient */}
            <div className="absolute -inset-px bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
            
            <div className={cn(
              "relative p-3.5 rounded-xl transition-all duration-300 shrink-0",
              item.type === 'folder' 
                ? "bg-primary/10 text-primary group-hover:scale-105" 
                : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary group-hover:scale-105"
            )}>
               {item.icon ? (
                 <DynamicIcon icon={item.icon} className="w-5 h-5" />
               ) : (
                 item.type === 'folder' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />
               )}
            </div>

            <div className="relative flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate tracking-tight">
                {item.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border leading-none",
                  item.type === 'folder' 
                    ? "bg-primary/5 text-primary/80 border-primary/10" 
                    : "bg-muted text-muted-foreground/75 border-border"
                )}>
                  {item.type === 'folder' ? 'Sección' : 'Tema'}
                </span>
                {item.children && item.children.length > 0 && (
                  <span className="text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-widest leading-none">
                    {item.children.length} temas
                  </span>
                )}
              </div>
            </div>

            <div className="relative h-7 w-7 flex items-center justify-center rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

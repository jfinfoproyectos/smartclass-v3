import { NavItem } from "../../services/public-docs";
import Link from "next/link";
import { ArrowRight, FileText, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import DynamicIcon from "../DynamicIcon";
import { motion } from "framer-motion";

interface TopicNavigationProps {
  items: NavItem[];
  projectId: string;
}

export function TopicNavigation({ items, projectId }: TopicNavigationProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-8 opacity-60">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70 whitespace-nowrap">
          Explorar sección
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <Link
            key={item.id}
            href={`/docs/${projectId}/${item.slug === "index" ? "" : item.slug}`}
            className="group relative p-6 rounded-3xl border border-border/20 bg-card/5 hover:bg-primary/5 hover:border-primary/20 transition-all flex items-center gap-5 overflow-hidden"
          >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:to-primary/5 transition-all duration-500" />
            
            <div className={cn(
              "relative p-4 rounded-2xl transition-all duration-500",
              item.type === 'folder' 
                ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20" 
                : "bg-primary/10 text-primary group-hover:bg-primary/20"
            )}>
               {item.icon ? (
                 <DynamicIcon icon={item.icon} className="w-6 h-6" />
               ) : (
                 item.type === 'folder' ? <Folder className="w-6 h-6" /> : <FileText className="w-6 h-6" />
               )}
            </div>

            <div className="relative flex-1 min-w-0">
              <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate tracking-tight">
                {item.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                  item.type === 'folder' 
                    ? "bg-amber-500/5 text-amber-500/60 border-amber-500/10" 
                    : "bg-primary/5 text-primary/60 border-primary/10"
                )}>
                  {item.type === 'folder' ? 'Sección' : 'Lección'}
                </span>
                {item.children && item.children.length > 0 && (
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                    {item.children.length} temas
                  </span>
                )}
              </div>
            </div>

            <div className="relative h-10 w-10 flex items-center justify-center rounded-full bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

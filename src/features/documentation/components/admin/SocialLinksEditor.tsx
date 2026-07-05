"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Link2, Type, Hash } from "lucide-react";
import DynamicIcon from "@/features/documentation/components/DynamicIcon";

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

interface SocialLinksEditorProps {
  value: string; // JSON string
  onChange: (value: string) => void;
}

export function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  let initialLinks: SocialLink[] = [];
  try {
    initialLinks = JSON.parse(value);
    if (!Array.isArray(initialLinks)) initialLinks = [];
  } catch (e) {
    initialLinks = [];
  }

  const [links, setLinks] = useState<SocialLink[]>(initialLinks);

  const updateLinks = (newLinks: SocialLink[]) => {
    setLinks(newLinks);
    onChange(JSON.stringify(newLinks));
  };

  const addLink = () => {
    updateLinks([...links, { name: "", url: "", icon: "lucide:link" }]);
  };

  const removeLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    updateLinks(newLinks);
  };

  const handleChange = (index: number, field: keyof SocialLink, val: string) => {
    const newLinks = [...links];
    newLinks[index][field] = val;
    updateLinks(newLinks);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {links.map((link, index) => (
          <div 
            key={index} 
            className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl glass border-white/5 hover:border-primary/20 transition-all shadow-sm hover:shadow-lg"
          >
            {/* Name Input */}
            <div className="flex-1 w-full space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                <Type className="w-3 h-3" />
                Nombre
              </div>
              <Input
                value={link.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
                placeholder="Ej: GitHub"
                className="h-10 rounded-xl bg-background/50 border-white/5 focus:bg-background transition-all text-xs font-bold"
              />
            </div>

            {/* URL Input */}
            <div className="flex-[2] w-full space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                <Link2 className="w-3 h-3" />
                URL
              </div>
              <Input
                value={link.url}
                onChange={(e) => handleChange(index, "url", e.target.value)}
                placeholder="https://github.com/..."
                className="h-10 rounded-xl bg-background/50 border-white/5 focus:bg-background transition-all text-xs font-medium"
              />
            </div>

            {/* Icon Input */}
            <div className="flex-1 w-full space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                <Hash className="w-3 h-3" />
                Icono (Lucide)
              </div>
              <div className="flex gap-2">
                <Input
                  value={link.icon}
                  onChange={(e) => handleChange(index, "icon", e.target.value)}
                  placeholder="lucide:github"
                  className="h-10 rounded-xl bg-background/50 border-white/5 focus:bg-background transition-all text-[10px] font-mono"
                />
                <div className="shrink-0 w-10 h-10 rounded-xl glass border-white/5 flex items-center justify-center text-primary shadow-inner">
                  <DynamicIcon icon={link.icon} width="18" height="18" />
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLink(index)}
              className="shrink-0 h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all sm:mt-6"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {links.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 rounded-[2rem] border-2 border-dashed border-white/5 text-center bg-muted/5">
             <div className="p-4 bg-muted/20 rounded-full mb-4">
                <Link2 className="w-8 h-8 text-muted-foreground/40" />
             </div>
             <p className="text-sm font-bold text-muted-foreground">No hay enlaces configurados</p>
             <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">Agrega tus redes sociales para mostrarlas en el header</p>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={addLink}
        variant="outline"
        className="w-full h-12 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest gap-2 transition-all active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Agregar Nuevo Enlace
      </Button>
    </div>
  );
}

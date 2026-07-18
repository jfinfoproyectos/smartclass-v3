"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, GraduationCap, ExternalLink } from "lucide-react";

interface DocInfo {
  id: string;
  title: string;
  icon?: string;
  groupName: string;
  imageUrl?: string | null;
}

interface UserDocsListProps {
  docs: DocInfo[];
}

const defaultImages = [
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=2128&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=2069&auto=format&fit=crop",
];

export function UserDocsList({ docs }: UserDocsListProps) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl text-center">
        <div className="p-5 bg-primary/5 rounded-full mb-4 ring-4 ring-primary/10">
          <BookOpen className="h-10 w-10 text-primary/40" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight text-muted-foreground">Sin documentación asignada</h3>
        <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
          El profesor aún no ha vinculado documentación a este curso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight">Material de Estudio</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Documentación habilitada por el docente para este curso
            </p>
          </div>
        </div>
        <Badge className="text-[9px] px-3 h-6 font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-full shrink-0">
          {docs.length} {docs.length === 1 ? "documento" : "documentos"}
        </Badge>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 items-stretch">
        {docs.map((doc, index) => {
          const bgImage = doc.imageUrl || defaultImages[index % defaultImages.length];

          return (
            <Link
              key={`${doc.groupName}-${doc.id}`}
              href={`/docs/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group h-full block"
            >
              {/* Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/40 via-primary/10 to-transparent rounded-[1.8rem] blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

              <div className="relative h-full flex flex-col rounded-[1.6rem] overflow-hidden border border-border/40 group-hover:border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg group-hover:shadow-primary/10 group-hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1">

                {/* Image Banner */}
                <div className="relative h-44 w-full overflow-hidden shrink-0">
                  <img
                    src={bgImage}
                    alt={doc.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <Badge className="text-[8px] px-2.5 h-5 font-black uppercase tracking-widest border-none shadow-lg bg-primary/80 text-primary-foreground backdrop-blur-md rounded-full">
                      <FileText className="w-2.5 h-2.5 mr-1" />
                      Documentación
                    </Badge>
                    <div className="h-7 w-7 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ExternalLink className="w-3 h-3 text-foreground" />
                    </div>
                  </div>

                  {/* Icon at bottom of image */}
                  <div className="absolute bottom-3 left-4 z-10">
                    <div className="h-10 w-10 rounded-xl bg-background/80 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-xl">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 px-5 pt-4 pb-5 gap-3">
                  {/* Doc type label */}
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-primary/70">
                    Material del Curso
                  </span>

                  {/* Title */}
                  <h4 className="text-sm font-black tracking-tight leading-snug text-foreground group-hover:text-primary transition-colors duration-300 uppercase flex-1">
                    {doc.title}
                  </h4>

                  {/* Description hint */}
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                    Accede al contenido completo de esta documentación asignada por tu docente.
                  </p>

                  {/* CTA Button */}
                  <Button
                    className="w-full h-10 text-[9px] font-black uppercase tracking-[0.15em] gap-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 active:scale-95 mt-1"
                    asChild
                  >
                    <span>
                      <BookOpen className="w-3.5 h-3.5" />
                      Abrir Documento
                    </span>
                  </Button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, LayoutGrid, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function UserDocsList({ docs }: UserDocsListProps) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-3xl text-center">
        <div className="p-4 bg-muted/20 rounded-full mb-4">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-xl font-semibold text-muted-foreground">No hay documentación disponible</h3>
        <p className="text-sm text-muted-foreground/60 mt-1">
          No se ha encontrado contenido en esta categoría.
        </p>
      </div>
    );
  }

  const defaultImages = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=2128&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop"
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {docs.map((doc, index) => {
        const bgImage = doc.imageUrl || defaultImages[index % defaultImages.length];
        
        return (
          <div key={`${doc.groupName}-${doc.id}`} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <Card className="h-full flex flex-col relative glass border-white/5 rounded-[2rem] overflow-hidden hover:border-primary/30 transition-all duration-500 shadow-xl hover:-translate-y-1.5 p-0">
              {/* Header Image Section */}
              <div className="relative h-36 w-full overflow-hidden">
                 <img 
                   src={bgImage} 
                   alt={doc.title}
                   className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                 
                 {/* Group Badge */}
                 <div className="absolute top-4 left-4 z-20">
                    <Badge className="text-[8px] px-2 h-5 font-black uppercase tracking-widest border-none shadow-xl glass bg-background/40 text-foreground">
                      {doc.groupName}
                    </Badge>
                 </div>
              </div>

              <CardHeader className="pb-0 pt-4 px-6">
                <CardTitle className="text-sm font-black tracking-tight leading-tight group-hover:text-primary transition-colors font-heading uppercase">
                  {doc.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-6 py-5 flex flex-col gap-4">
                <Link href={`/docs/${doc.id}`} className="w-full">
                  <Button className="w-full h-9 text-[9px] font-black uppercase tracking-[0.15em] gap-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                    <BookOpen className="w-3.5 h-3.5" />
                    Abrir Documento
                  </Button>
                </Link>
                
                <div className="flex items-center justify-between opacity-30">
                  <span className="text-[8px] font-mono uppercase tracking-tighter">REF: {doc.id.slice(0, 8)}</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // No mostrar en la raíz del dashboard
  if (pathname === "/dashboard") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className={cn(
        "group flex items-center gap-2 h-9 px-3 rounded-xl transition-all duration-300",
        "hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20",
        "active:scale-95"
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      <span className="text-sm font-semibold tracking-tight">Regresar</span>
    </Button>
  );
}

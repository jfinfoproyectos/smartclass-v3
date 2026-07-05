"use client";

import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function RefreshButton() {
  const router = useRouter();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.refresh()}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all active:scale-95 group"
          >
            <RefreshCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-active:rotate-180 transition-transform duration-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">
          Actualizar Vista
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

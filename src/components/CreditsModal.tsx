"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function CreditsModal({ asMenuItem, className }: { asMenuItem?: boolean; className?: string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 opacity-50">
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">Créditos</span>
            </Button>
        );
    }

    if (asMenuItem) {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-xs">
                        <Info className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Créditos / Información</span>
                    </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créditos de la Aplicación</DialogTitle>
                        <DialogDescription>
                            Información sobre el autor y desarrollo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Info className="h-12 w-12 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Jhon Fredy Valencia Gómez</h3>
                            <p className="text-muted-foreground">Ingeniero de Software y Datos</p>
                        </div>
                        <p className="text-sm text-muted-foreground pt-4">
                            © {new Date().getFullYear()} SmartClass. Todos los derechos reservados.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog>
            <Tooltip>
                <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                                "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/90 dark:hover:bg-accent/70 hover:shadow-2xs transition-all", 
                                className
                            )}
                        >
                            <Info className="h-3.5 w-3.5" />
                            <span className="sr-only">Créditos</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    <p>Créditos e información</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Créditos de la Aplicación</DialogTitle>
                    <DialogDescription>
                        Información sobre el autor y desarrollo.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Info className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Jhon Fredy Valencia Gómez</h3>
                        <p className="text-muted-foreground">Ingeniero de Software y Datos</p>
                    </div>
                    <p className="text-sm text-muted-foreground pt-4">
                        © {new Date().getFullYear()} SmartClass. Todos los derechos reservados.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

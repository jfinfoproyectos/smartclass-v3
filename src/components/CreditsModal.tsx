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

export function CreditsModal({ asMenuItem }: { asMenuItem?: boolean }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60">
                <Info className="h-4 w-4" />
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 transition-all">
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Créditos</span>
                        </Button>
                    </TooltipTrigger>
                </DialogTrigger>
                <TooltipContent>
                    <p>Créditos</p>
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

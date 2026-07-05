"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { 
    Search, 
    BookOpen, 
    Home, 
    Calculator,
    User,
    LogOut
} from "lucide-react";
import { getSearchItems } from "@/app/actions/navigation";
import { authClient } from "@/lib/auth-client";

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<{ id: string; title: string; type: string; url: string }[]>([]);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    React.useEffect(() => {
        if (open) {
            getSearchItems().then(setItems);
        }
    }, [open]);

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="group flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground md:px-4 md:py-2 md:text-sm"
            >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Buscar cursos o comandos...</span>
                <span className="md:hidden">Buscar...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            {mounted && (
                <CommandDialog open={open} onOpenChange={setOpen}>
                    <CommandInput placeholder="Escribe un comando o busca algo..." />
                    <CommandList>
                        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                        <CommandGroup heading="Navegación">
                            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                                <Home className="mr-2 h-4 w-4" />
                                <span>Inicio</span>
                            </CommandItem>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    onSelect={() => runCommand(() => router.push(item.url))}
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    <span>{item.title}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Sesión">
                            <CommandItem onSelect={() => runCommand(() => authClient.signOut())}>
                                <LogOut className="mr-2 h-4 w-4 text-destructive" />
                                <span className="text-destructive">Cerrar Sesión</span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </CommandDialog>
            )}
        </>
    );
}

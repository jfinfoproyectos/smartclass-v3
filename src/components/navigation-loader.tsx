"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export function NavigationLoader() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Use a microtask to avoid synchronous setState in effect body
        const timer = setTimeout(() => setIsLoading(false), 0)
        return () => clearTimeout(timer)
    }, [pathname, searchParams])

    useEffect(() => {
        const handleStart = () => setIsLoading(true)

        // Listen for route changes
        window.addEventListener("beforeunload", handleStart)

        return () => {
            window.removeEventListener("beforeunload", handleStart)
        }
    }, [])

    if (!isLoading) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
        </div>
    )
}

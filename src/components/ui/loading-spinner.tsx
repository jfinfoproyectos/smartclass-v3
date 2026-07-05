import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
    message?: string
    className?: string
    size?: "sm" | "md" | "lg"
}

export function LoadingSpinner({ message = "Cargando...", className, size = "md" }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-12 w-12",
        lg: "h-16 w-16"
    }

    return (
        <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
            <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
            {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}
        </div>
    )
}

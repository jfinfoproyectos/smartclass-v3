"use client";

import { useState } from "react";
import { getInitials } from "@/lib/utils";

interface UserAvatarProps {
    src: string | null | undefined;
    alt: string;
    fallbackText: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function UserAvatar({ src, alt, fallbackText, size = "md", className = "" }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);

    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        md: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-2xl"
    };

    const sizeClass = sizeClasses[size];

    if (!src || imageError) {
        return (
            <div className={`${sizeClass} rounded-full bg-muted flex items-center justify-center ${className}`}>
                <span className="font-medium">
                    {getInitials(fallbackText)}
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${sizeClass} rounded-full ${className}`}
            onError={() => setImageError(true)}
        />
    );
}

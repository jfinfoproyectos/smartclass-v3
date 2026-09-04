"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface AICanvasCardProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  accentColor?: string;
  iconBgColor?: string;
  iconTextColor?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  actionLabel?: string;
  actionText?: string;
  hideFooter?: boolean;
  compact?: boolean;
}

export function AICanvasCard({
  title,
  description,
  icon: Icon,
  badge,
  badgeColor = "bg-primary/10 text-primary border-primary/20",
  accentColor = "from-primary/20 via-primary/10 to-transparent",
  iconBgColor = "bg-primary/10",
  iconTextColor = "text-primary",
  onClick,
  className,
  children,
  actionLabel,
  actionText,
  hideFooter = false,
  compact = false,
}: AICanvasCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-lg transition-all duration-300",
        compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Ambient background glow following cursor */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, var(--primary, rgba(16, 185, 129, 0.1)), transparent 80%)`,
          }}
        />
      )}

      {/* Top Gradient Bar */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          accentColor
        )}
      />

      <div className={cn("relative z-10 flex flex-col justify-between h-full flex-1", compact ? "gap-2" : "gap-3")}>
        <div className={cn(compact ? "space-y-1.5" : "space-y-2.5")}>
          {/* Header: Icon & Badge */}
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs shrink-0",
                compact ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl",
                iconBgColor,
                iconTextColor
              )}
            >
              <Icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </div>

            {badge && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full font-semibold border backdrop-blur-sm shrink-0",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
                  badgeColor
                )}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-0.5">
            <h3 className={cn("font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 flex items-center justify-between", compact ? "text-sm" : "text-base")}>
              <span className="truncate">{title}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary shrink-0" />
            </h3>
            {description && (
              <p className={cn("text-muted-foreground leading-snug text-xs", compact ? "line-clamp-2" : "line-clamp-2")}>
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>

      {/* Footer / Action indicator */}
      {!hideFooter && (
        <div className={cn(
          "relative z-10 border-t border-border/50 flex items-center justify-between text-muted-foreground group-hover:text-foreground transition-colors",
          compact ? "pt-2 mt-2 text-[11px]" : "pt-2.5 mt-3 text-xs"
        )}>
          <span className="truncate pr-2">{actionLabel || "Explorar módulo"}</span>
          <span className="font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
            {actionText || "Acceder →"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

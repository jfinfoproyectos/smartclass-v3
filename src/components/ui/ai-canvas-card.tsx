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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-xl transition-all duration-300",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Ambient background glow following cursor */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, var(--primary, rgba(16, 185, 129, 0.12)), transparent 80%)`,
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

      <div className="relative z-10 flex flex-col justify-between h-full flex-1 space-y-4">
        <div className="space-y-4">
          {/* Header: Icon & Badge */}
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
                iconBgColor,
                iconTextColor
              )}
            >
              <Icon className="w-6 h-6" />
            </div>

            {badge && (
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm",
                  badgeColor
                )}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 flex items-center justify-between">
              <span>{title}</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>

      {/* Footer / Action indicator */}
      {!hideFooter && (
        <div className="relative z-10 pt-4 mt-auto border-t border-border/60 flex items-center justify-between text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <span>{actionLabel || "Explorar módulo"}</span>
          <span className="font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            {actionText || "Acceder →"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

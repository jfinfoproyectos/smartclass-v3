"use client";

import React from "react";
import Link from "next/link";
import { NavItem } from "../../services/public-docs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TopicsHeaderProps {
  topics: NavItem[];
  projectId: string;
  activeTopicSlug: string | null;
}

export function TopicsHeader({ topics, projectId, activeTopicSlug }: TopicsHeaderProps) {
  if (topics.length === 0) return null;

  return (
    <div className="w-full border-b border-border/30 bg-background/30 backdrop-blur-md z-30">
      <div className="max-w-[1800px] mx-auto px-4 h-9 flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        {/* Permanent Inicio Tab */}
        <Link
          href={`/docs/${projectId}`}
          className={cn(
            "relative h-full flex items-center px-4 text-[9px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap group",
            !activeTopicSlug 
              ? "text-primary font-extrabold" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inicio
          {!activeTopicSlug && (
            <motion.div 
              layoutId="activeTopic"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </Link>

        {topics.map((topic) => {
          const isActive = activeTopicSlug === topic.slug;
          
          return (
            <Link
              key={topic.id}
              href={`/docs/${projectId}/${topic.slug}`}
              className={cn(
                "relative h-full flex items-center px-4 text-[9px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap group",
                isActive 
                  ? "text-primary font-extrabold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {topic.title}
              {isActive && (
                <motion.div 
                  layoutId="activeTopic"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import Link from 'next/link';

interface HeroAction {
  label: string;
  href: string;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: string;
}

interface HeroProps {
  title: string;
  description?: string;
  icon?: string;
  actions?: any;
  align?: 'left' | 'center';
  variant?: 'gradient' | 'glass' | 'minimal';
  color?: 'default' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple' | 'blue';
  backgroundImage?: string;
}

export function Hero({ 
  title, 
  description, 
  icon, 
  actions = [], 
  align = 'center',
  variant = 'gradient',
  color = 'default',
  backgroundImage
}: HeroProps) {
  const IconComponent = icon ? (Icons as any)[icon] : null;

  const finalActions = useMemo<HeroAction[]>(() => {
    if (!actions) return [];
    if (typeof actions === 'string') {
      try {
        const normalized = actions.replace(/'/g, '"');
        return JSON.parse(normalized);
      } catch (e) {
        console.error("Error parsing actions JSON in Hero:", e);
        return [];
      }
    }
    return Array.isArray(actions) ? actions : [];
  }, [actions]);

  const colorGradients: Record<string, string> = {
    default: 'from-indigo-500/10 via-purple-500/10 to-pink-500/10',
    emerald: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
    rose: 'from-rose-500/10 via-pink-500/10 to-orange-500/10',
    amber: 'from-amber-500/10 via-orange-500/10 to-yellow-500/10',
    cyan: 'from-cyan-500/10 via-sky-500/10 to-blue-500/10',
    purple: 'from-purple-500/10 via-fuchsia-500/10 to-pink-500/10',
    blue: 'from-blue-500/10 via-indigo-500/10 to-violet-500/10',
  };

  const gradientClass = colorGradients[color || 'default'] || colorGradients.default;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const isCenter = align === 'center';

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className={`relative my-12 overflow-hidden rounded-[2.5rem] border border-black/10 dark:border-white/10 p-8 md:p-16 ${
        variant === 'glass' ? 'bg-black/5 dark:bg-white/5 backdrop-blur-2xl shadow-xl dark:shadow-2xl' : 
        variant === 'gradient' ? `bg-gradient-to-br ${gradientClass} backdrop-blur-md` :
        'bg-black/5 dark:bg-white/5'
      } ${isCenter ? 'text-center flex flex-col items-center' : 'text-left'} overflow-hidden min-h-[300px] flex justify-center`}
    >
      {/* Background Image */}
      {backgroundImage && (
        <>
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-30" 
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-background/90 via-background/60 to-background/10 dark:from-background dark:via-background/80 dark:to-transparent" />
        </>
      )}

      {/* Decorative Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Content wrapper */}
      <div className="relative z-10 w-full flex flex-col items-center md:items-start text-center md:text-left">
        {isCenter ? (
          <div className="w-full flex flex-col items-center">
            {IconComponent && (
              <motion.div 
                variants={itemVariants}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 shadow-inner border border-black/5 dark:border-white/10"
              >
                <IconComponent className="h-10 w-10 text-primary" />
              </motion.div>
            )}

            <motion.h1 
              variants={itemVariants}
              className="mb-4 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-black to-black/60 dark:from-white dark:to-white/60"
            >
              {title}
            </motion.h1>

            {description && (
              <motion.p 
                variants={itemVariants}
                className="mb-8 max-w-2xl text-lg text-muted-foreground/80 md:text-xl leading-relaxed"
              >
                {description}
              </motion.p>
            )}

            {finalActions.length > 0 && (
              <motion.div 
                variants={itemVariants}
                className="flex flex-wrap gap-4 justify-center"
              >
                {finalActions.map((action, i) => (
                  <HeroAction action={action} key={i} />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-start">
            {IconComponent && (
              <motion.div 
                variants={itemVariants}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 shadow-inner border border-black/5 dark:border-white/10"
              >
                <IconComponent className="h-10 w-10 text-primary" />
              </motion.div>
            )}

            <motion.h1 
              variants={itemVariants}
              className="mb-4 text-4xl font-extrabold tracking-tight text-foreground md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-black to-black/60 dark:from-white dark:to-white/60"
            >
              {title}
            </motion.h1>

            {description && (
              <motion.p 
                variants={itemVariants}
                className="mb-8 max-w-2xl text-lg text-muted-foreground/80 md:text-xl leading-relaxed"
              >
                {description}
              </motion.p>
            )}

            {finalActions.length > 0 && (
              <motion.div 
                variants={itemVariants}
                className="flex flex-wrap gap-4"
              >
                {finalActions.map((action, i) => (
                  <HeroAction action={action} key={i} />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HeroAction({ action }: { action: HeroAction }) {
  const ActionIcon = action.icon ? (Icons as any)[action.icon] : null;
  return (
    <Link 
      href={action.href}
      className={`flex items-center gap-2 rounded-2xl px-8 py-3.5 font-bold transition-all active:scale-95 ${
        action.variant === 'outline' 
          ? 'border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground hover:bg-black/10 dark:hover:bg-white/10' 
          : action.variant === 'ghost'
          ? 'text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
          : 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-105 active:scale-95'
      }`}
    >
        {action.label}
        {ActionIcon && <ActionIcon className="h-4 w-4" />}
    </Link>
  );
}

export default Hero;

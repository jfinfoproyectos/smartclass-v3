'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-white/10 bg-white/5 text-foreground hover:bg-white/10",
        info:
          "border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
        error:
          "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        purple:
          "border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
        outline: "text-foreground border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export default Badge;

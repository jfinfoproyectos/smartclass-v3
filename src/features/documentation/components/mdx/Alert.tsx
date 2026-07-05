'use client';

import React from 'react';
import { 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  title?: string;
  className?: string;
}

const variantStyles: Record<AlertVariant, {
  container: string;
  icon: React.ReactNode;
  titleColor: string;
}> = {
  info: {
    container: 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    titleColor: 'text-blue-800 dark:text-blue-300',
  },
  success: {
    container: 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    titleColor: 'text-emerald-800 dark:text-emerald-300',
  },
  warning: {
    container: 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    titleColor: 'text-amber-800 dark:text-amber-300',
  },
  error: {
    container: 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50',
    icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    titleColor: 'text-rose-800 dark:text-rose-300',
  },
};

export default function Alert({ 
  children, 
  variant = 'info', 
  title,
  className = '' 
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`my-6 flex gap-4 p-4 rounded-lg border leading-relaxed ${styles.container} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className={`font-bold mb-1 ${styles.titleColor}`}>
            {title}
          </h5>
        )}
        <div className="text-sm text-foreground/90 prose-p:my-0">
          {children}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Folder as FolderIcon, FolderOpen, File as FileIcon, ChevronRight, FileCode, FileImage, FileText, FileSearch, Terminal, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (name.includes('config') || ext === 'json' || ext === 'yaml') return <SettingsIcon className="w-4 h-4 text-slate-400" />;
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <FileCode className="w-4 h-4 text-blue-400" />;
  if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return <FileImage className="w-4 h-4 text-emerald-400" />;
  if (['md', 'mdx', 'txt'].includes(ext || '')) return <FileText className="w-4 h-4 text-slate-300" />;
  if (ext === 'css' || ext === 'scss') return <Hash className="w-4 h-4 text-pink-400" />;
  return <FileIcon className="w-4 h-4 text-slate-400" />;
};

const SettingsIcon = Terminal; // Fallback for config/settings

export function FileTree({ children, items }: { children?: React.ReactNode; items?: any }) {
  const finalItems = useMemo(() => {
    if (!items) return [];
    if (typeof items === 'string') {
      try {
        const normalized = items.replace(/'/g, '"');
        return JSON.parse(normalized);
      } catch (e) {
        console.error("Error parsing items JSON in FileTree:", e);
        return [];
      }
    }
    return Array.isArray(items) ? items : [];
  }, [items]);

  const renderTree = (treeItems: any[]) => {
    return treeItems.map((item: any, i: number) => {
      if (item.type === "folder") {
        return (
          <Folder key={i} name={item.name} defaultOpen={item.open !== false}>
            {item.children && renderTree(item.children)}
          </Folder>
        );
      }
      return <File key={i} name={item.name} label={item.label} />;
    });
  };

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm shadow-xl font-mono text-sm">
      <div className="flex items-center gap-2 mb-4 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <Terminal className="w-3.5 h-3.5" />
        Estructura de Proyecto
      </div>
      <div className="space-y-1">
        {finalItems.length > 0 ? renderTree(finalItems) : children}
      </div>
    </div>
  );
}

export function Folder({ name, children, defaultOpen = true }: { name: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="select-none">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </motion.div>
        {isOpen ? (
          <FolderOpen className="w-4 h-4 text-primary/80 fill-primary/10" />
        ) : (
          <FolderIcon className="w-4 h-4 text-primary/60 fill-primary/5" />
        )}
        <span className="font-medium text-foreground/90 group-hover:text-primary transition-colors">{name}</span>
      </div>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-4 border-l border-white/5 space-y-1 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function File({ name, label }: { name: string, label?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-default transition-colors group">
      <div className="ml-3.5">
        {getFileIcon(name)}
      </div>
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        {name}
        {label && <span className="ml-2 text-[10px] text-muted-foreground/50 uppercase tracking-tighter">— {label}</span>}
      </span>
    </div>
  );
}

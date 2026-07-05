"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Icon } from "@iconify/react";

type ShellType = "bash" | "zsh" | "powershell" | "cmd" | "node" | "python";

interface TerminalProps {
  commands?: string;
  commandList?: string[];
  title?: string;
  staticText?: string;
  shell?: ShellType;
  children?: React.ReactNode;
}

const SHELL_CONFIG: Record<ShellType, { prompt: string; icon: string; name: string }> = {
  bash: { prompt: "$", icon: "mdi:terminal", name: "bash" },
  zsh: { prompt: "$", icon: "mdi:terminal", name: "zsh" },
  powershell: { prompt: "PS >", icon: "mdi:microsoft-powershell", name: "PowerShell" },
  cmd: { prompt: "C:\\>", icon: "mdi:console", name: "Command Prompt" },
  node: { prompt: ">", icon: "logos:nodejs-icon", name: "Node.js" },
  python: { prompt: ">>>", icon: "logos:python", name: "Python" },
};

function extractTextFromChildren(node: React.ReactNode): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return node.toString();
  if (Array.isArray(node)) {
    return node.map(extractTextFromChildren).join("");
  }
  if (React.isValidElement(node)) {
    const props = node.props as any;
    if (props && props.children) {
      return extractTextFromChildren(props.children);
    }
  }
  return "";
}

export function Terminal({ commands, commandList, title, staticText, shell = "bash", children }: TerminalProps) {
  const config = SHELL_CONFIG[shell];
  const terminalTitle = title || config.name;
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.2 });

  const finalCommandList = useMemo(() => {
    if (commandList) return commandList;
    if (children) {
      const extractedText = extractTextFromChildren(children);
      if (extractedText.trim().length > 0) {
        return extractedText.split(/\r?\n|\r/).map(c => c.trim()).filter(cmd => cmd.length > 0);
      }
    }
    if (!commands) return [];
    return commands.split(/\\n|\n/).filter(cmd => cmd.trim().length > 0);
  }, [commands, commandList, children]);

  const [history, setHistory] = useState<string[]>([]);
  const [currentTypedText, setCurrentTypedText] = useState("");
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Use a ref for charIndex to keep it synced with the interval
  const charIndexRef = useRef(0);
  const hasInViewStartedRef = useRef(false);

  const handleRestart = useCallback(() => {
    setHistory([]);
    setCurrentCommandIndex(0);
    setCurrentTypedText("");
    charIndexRef.current = 0;
    setIsTyping(true);
    setIsCompleted(false);
  }, []);

  useEffect(() => {
    if (isInView && !hasInViewStartedRef.current) {
      handleRestart();
      hasInViewStartedRef.current = true;
    }
    
    if (!isInView) {
      hasInViewStartedRef.current = false;
    }
  }, [isInView, handleRestart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentTypedText]);

  useEffect(() => {
    if (finalCommandList.length === 0) return;
    
    if (currentCommandIndex >= finalCommandList.length) {
      setIsCompleted(true);
      setIsTyping(false);
      return;
    }

    const command = finalCommandList[currentCommandIndex];
    charIndexRef.current = 0;
    setCurrentTypedText("");
    setIsTyping(true);
    setIsCompleted(false);

    let timer: NodeJS.Timeout;

    const typingInterval = setInterval(() => {
      const idx = charIndexRef.current;
      if (idx < command.length) {
        // Use substring to ensure we don't skip letters due to state batching
        setCurrentTypedText(command.substring(0, idx + 1));
        charIndexRef.current = idx + 1;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        
        timer = setTimeout(() => {
          setHistory(prev => [...prev, command]);
          setCurrentTypedText("");
          setCurrentCommandIndex(prev => prev + 1);
        }, 1000);
      }
    }, 50); // Slightly faster for smoother feel

    return () => {
      clearInterval(typingInterval);
      if (timer) clearTimeout(timer);
    };
  }, [currentCommandIndex, finalCommandList]);

  return (
    <div 
      ref={containerRef}
      className="w-full my-8 rounded-xl overflow-hidden shadow-2xl bg-[#0d1117] border border-white/10 font-mono text-sm group transition-all duration-300"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex items-center gap-2 text-white/40 text-xs select-none">
            <Icon icon={config.icon} className="text-sm opacity-60" />
            <span>{terminalTitle}</span>
          </div>
        </div>
        
        <button 
          onClick={handleRestart}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors text-[10px] uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100"
          title="Reiniciar animación"
        >
          <Icon icon="mdi:refresh" className="text-xs" />
          Reiniciar
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="p-6 min-h-[160px] max-h-[400px] text-white/90 overflow-y-auto relative scroll-smooth thin-scrollbar"
      >
        {staticText && (
          <div className="mb-4 text-white/50 select-none"># {staticText}</div>
        )}
        
        {history.map((cmd, index) => (
          <div key={index} className="flex items-start mb-1.5 opacity-70 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-primary mr-3 select-none opacity-60">{config.prompt}</span>
            <span className="flex-1 whitespace-pre-wrap">{cmd}</span>
          </div>
        ))}

        {!isCompleted && (
          <div className="flex items-start">
            <span className="text-primary mr-3 select-none opacity-80">{config.prompt}</span>
            <div className="flex-1">
              <span className="whitespace-pre-wrap">{currentTypedText}</span>
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 ml-1 bg-primary align-middle"
                />
              )}
            </div>
          </div>
        )}

        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-6 border-t border-white/5 text-green-400/80"
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:check-circle" className="text-green-400" />
              <span className="text-xs uppercase font-bold tracking-widest">Process Finished</span>
              <button 
                onClick={handleRestart}
                className="ml-auto text-[10px] uppercase font-bold tracking-widest text-white/30 hover:text-white/80 flex items-center gap-2 transition-all p-1 hover:bg-white/5 rounded"
              >
                Ejecutar de nuevo
                <Icon icon="mdi:refresh" className="text-xs" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

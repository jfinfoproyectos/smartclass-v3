"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  BrainCircuit, 
  Send, 
  X, 
  MessageSquare, 
  Loader2, 
  Bot, 
  User as UserIcon,
  Sparkles,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { askAiTutorAction, getAiUsageAction } from "../../actions/aiTutorActions";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiTutorChatProps {
  projectId: string;
  pageId: string;
  projectName: string;
  isEnabled: boolean;
  limit: number;
}

export function AiTutorChat({ projectId, pageId, projectName, isEnabled, limit }: AiTutorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usedCount, setUsedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Reset messages on page change
  useEffect(() => {
    setMessages([]);
    setIsOpen(false);
  }, [pageId]);

  // Load usage on open
  useEffect(() => {
    if (isOpen && isEnabled) {
      getAiUsageAction(projectId).then(res => setUsedCount(res.used));
    }
  }, [isOpen, projectId, isEnabled]);

  if (!isEnabled) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await askAiTutorAction(projectId, pageId, userMessage);
      if (result.success) {
        setMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
        // Actualizar contador tras éxito
        setUsedCount(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al consultar al Tutor IA");
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] flex flex-col"
          >
            <Card className="flex-1 flex flex-col bg-background/80 backdrop-blur-3xl border-primary/20 shadow-2xl rounded-3xl overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-primary/10 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Tutor IA de {projectName}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[120px]">En: {pageId.substring(0, 8)}...</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/10">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{usedCount}/{limit} <span className="opacity-60">Consultas</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-primary/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="p-4 rounded-3xl bg-primary/5 text-primary/20">
                      <Sparkles className="w-12 h-12" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">¿Tienes alguna duda?</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Pregúntame sobre el contenido de esta página. Tengo un límite de {limit} consultas por hora.</p>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted border border-border text-primary"
                    )}>
                      {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-[11px] leading-relaxed max-w-[80%]",
                      msg.role === "user" 
                        ? "bg-primary/10 text-foreground rounded-tr-none" 
                        : "bg-muted/50 border border-border/50 text-muted-foreground rounded-tl-none"
                    )}>
                    <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/20 prose-pre:p-2 prose-pre:rounded-lg max-w-none">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center animate-pulse">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/30 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/5 bg-black/20">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="h-10 bg-background/50 border-white/10 rounded-xl text-xs"
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !input.trim()}
                    className="rounded-xl h-10 w-10 shrink-0 bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 w-12 rounded-full shadow-2xl transition-all duration-500 group relative overflow-hidden border border-white/10 backdrop-blur-xl",
          isOpen 
            ? "bg-destructive hover:bg-destructive/90" 
            : "bg-primary hover:bg-primary/90 hover:scale-110 active:scale-95"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        {!isOpen && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 border-2 border-primary rounded-full animate-pulse shadow-sm" />
        )}
      </Button>
    </div>
  );
}

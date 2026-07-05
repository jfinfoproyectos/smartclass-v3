"use client";

import { useState, useEffect, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2, RefreshCw } from "lucide-react";
import { renderMdxPreviewAction } from "@/features/documentation/actions/adminDocsActions";
import { ErrorBoundary } from "@/features/documentation/components/ErrorBoundary";
import { MdxErrorFallback } from "@/features/documentation/components/MdxErrorFallback";


interface PreviewData {
  displayTitle: string;
  previewNode: React.ReactNode;
}

interface EditorPreviewProps {
  content: string;
}

export function EditorPreview({ content }: EditorPreviewProps) {
  const debouncedContent = useDebounce(content, 800);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener("code-theme-change", handleThemeChange);
    return () => window.removeEventListener("code-theme-change", handleThemeChange);
  }, []);

  useEffect(() => {
    if (!debouncedContent) {
      setPreviewData(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const result = await renderMdxPreviewAction(debouncedContent);
        if (result.success) {
           setPreviewData({
             displayTitle: result.displayTitle,
             previewNode: result.previewNode
           });
        } else {
          // El servidor retornó un error de compilación MDX
          setPreviewData(null);
          setError((result as any).error || "Error de compilación MDX");
        }
      } catch (err: any) {
        console.error("Error rendering preview:", err);
        setPreviewData(null);
        setError(err?.message || "Error desconocido al renderizar la vista previa");
      }
    });
  }, [debouncedContent, refreshTrigger]);

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-10 pb-24 custom-scrollbar bg-background/50 relative">
      <div className="max-w-6xl mx-auto">
        {isPending && (
          <div className="absolute top-4 right-4 z-50">
            <div className="bg-background/80 backdrop-blur-sm border border-border px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sincronizando...</span>
            </div>
          </div>
        )}

        <ErrorBoundary key={debouncedContent}>
          {error ? (
            <MdxErrorFallback error={error} resetErrorBoundary={() => setError(null)} />
          ) : previewData ? (
            <div className="animate-in fade-in duration-500 mdx-preview-root">
               {previewData.previewNode}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
               <p className="text-xs font-bold uppercase tracking-widest leading-tight">Cargando vista previa...</p>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

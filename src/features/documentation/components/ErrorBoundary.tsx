"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Block Editor/Renderer:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 border border-rose-500/20 bg-rose-500/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 my-4">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
          <h4 className="font-bold text-sm text-foreground">Error al renderizar el componente</h4>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            {this.state.error?.message || "Ocurrió un error inesperado al procesar este bloque de contenido."}
          </p>
          <Button onClick={this.handleReset} variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-wider">
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

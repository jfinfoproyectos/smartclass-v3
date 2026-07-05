"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { MdxErrorFallback } from "./MdxErrorFallback";

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
    console.error("Uncaught error in MDX Renderer:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <MdxErrorFallback 
          error={this.state.error || "Unknown Error"} 
          resetErrorBoundary={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

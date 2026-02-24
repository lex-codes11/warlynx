"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for development
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Store error info in state
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Placeholder for external error logging
    // In production, this would send to Sentry, LogRocket, etc.
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      };
      
      // Example: fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorData) });
      console.log("Error logged:", errorData);
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Cinematic error UI matching the dark anime/Marvel theme
      return (
        <div className="min-h-screen bg-[#0B0B12] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900/60 backdrop-blur-lg border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] rounded-xl p-8">
            <div className="text-red-500 text-5xl mb-4 text-center animate-pulse">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-4 text-center">
              System Error
            </h2>
            <p className="text-gray-300 mb-6 text-center">
              An unexpected error occurred. The system has been notified.
            </p>
            {this.state.error && (
              <details className="mb-6">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-950/50 text-red-300 p-3 rounded border border-red-500/20 overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.errorInfo && (
                    <>
                      {"\n\nComponent Stack:"}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
              >
                Reload Page
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 font-medium rounded-md hover:bg-gray-800/50 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

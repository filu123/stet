"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown in place of the crashed subtree. Receives a reset to retry. */
  fallback: (reset: () => void) => ReactNode;
  /** Optional side-channel for logging (never receives user content). */
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a rendering crash to its subtree so one broken feature (say, the AI
 * assistant) can't take down the whole editor. Class component — React only
 * supports error boundaries this way.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep user content out of logs — only the error itself.
    console.error("ErrorBoundary caught:", error.message, info.componentStack);
    this.props.onError?.(error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) return this.props.fallback(this.reset);
    return this.props.children;
  }
}

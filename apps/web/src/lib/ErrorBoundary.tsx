import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Without this, an uncaught render/effect error (e.g. missing Firebase
 * config) crashes to a silent blank page — exactly what happened when a
 * CI deploy ran with empty secrets. Show something instead of nothing.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="text-sm text-ink-muted">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-bg hover:bg-brand-hover"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

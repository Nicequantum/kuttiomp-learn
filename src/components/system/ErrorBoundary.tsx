import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 py-12">
          <p className="label-eyebrow text-[var(--color-primary)]">
            Something went wrong
          </p>
          <h1 className="font-display text-display">We hit a snag</h1>
          <p className="text-content text-[var(--color-muted)] leading-relaxed">
            The learning home hit an unexpected error. Your progress on this
            device is usually still saved. Try reloading.
          </p>
          <pre className="surface-card pad-mode overflow-auto text-xs text-[var(--color-subtle)]">
            {this.state.error.message}
          </pre>
          <Button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign("/welcome");
            }}
          >
            Reload Kuttiomp
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

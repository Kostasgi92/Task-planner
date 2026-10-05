import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
};

type State = { error: Error | null };

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: toError(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', toError(error), info.componentStack);
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.error !== null && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return (
      <div className="grid min-h-[60dvh] place-items-center p-6">
        <div className="max-w-lg text-center">
          <p className="font-serif text-2xl tracking-[-.03em]">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This part of the app hit an error. The rest of the app is still running.
          </p>
          {/* Dev only: messages can carry API responses and other internals. */}
          {import.meta.env.DEV ? (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-3 text-left text-xs">
              {error.message || String(error)}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

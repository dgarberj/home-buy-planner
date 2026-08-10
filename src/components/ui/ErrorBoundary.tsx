import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * A blank white page is the worst possible failure: it tells you nothing and
 * offers no way out. This catches a render crash, shows what actually broke,
 * and gives you the one button that fixes most of them -- clearing the saved
 * session, which is where incompatible old data lives.
 */
interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  private clearSavedData = () => {
    localStorage.removeItem("home-buy-planner");
    location.reload();
  };

  state: State = { error: null, info: null };

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail around for the panel below, and in the console for you.
    console.error("Render failed:", error, info);
    this.setState({ info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Something broke while rendering
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Nine times out of ten this is saved data from an older version of
            the app that no longer matches the current shape. Clearing it resets
            everything to the example numbers —{" "}
            <strong>if you have real figures in here, export them first</strong>{" "}
            from a previous session, or re-import your{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">
              data/household.json
            </code>{" "}
            afterwards.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.clearSavedData}
              className="rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Clear saved data and reload
            </button>
            <button
              type="button"
              onClick={() => location.reload()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Just reload
            </button>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">
              Technical detail
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
              {info?.componentStack
                ? `\n\nComponent stack:${info.componentStack}`
                : ""}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

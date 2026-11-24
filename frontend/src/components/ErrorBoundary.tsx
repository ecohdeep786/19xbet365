import React, { type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[19x-ui]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-error">
          <div className="fatal-error-mark">A</div>
          <span className="eyebrow">Unexpected interruption</span>
          <h1>That view hit a snag.</h1>
          <p>The interface caught an error before it could blank the page. Your account and coin ledger are unaffected.</p>
          <div className="fatal-error-actions">
            <button className="btn btn-lime" onClick={() => window.location.reload()}>Reload the page</button>
            <a className="btn btn-secondary" href="#/">Back to home</a>
          </div>
          <small>{this.state.error.message}</small>
        </div>
      );
    }
    return this.props.children;
  }
}

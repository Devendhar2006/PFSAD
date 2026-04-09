import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected UI error" };
  }

  componentDidCatch() {
    // Keep UI stable; error details are shown to user in fallback panel.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
          <div className="card w-full p-6 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">The dashboard failed to render. Please refresh the page.</p>
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-left text-xs text-slate-700">{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../i18n";
import { logClientError } from "../lib/errors";

/** Last line of defence: without this, any uncaught render error anywhere in the
 * tree unmounts the whole app into a blank white screen with nothing to tap on.
 * Class component because React still has no hook for componentDidCatch. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClientError(error, "render crash " + (info.componentStack ?? "").split("\n")[1]?.trim());
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-bold text-sea-800">{t("errorBoundary.title")}</h1>
        <p className="mt-3 text-sm text-gray-600">{t("errorBoundary.body")}</p>
        <p className="mt-2 break-words text-xs text-gray-400" dir="ltr">
          {this.state.error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
        >
          {t("errorBoundary.reload")}
        </button>
      </div>
    );
  }
}

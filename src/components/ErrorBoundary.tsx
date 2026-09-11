import React, { Component, ErrorInfo, ReactNode } from "react";
import ServerErrorPage from "../pages/Status/ServerErrorPage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SchoolProfit Uncaught Runtime Error:", error, errorInfo);
    const msg = String(error?.message || "");
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Loading chunk")
    ) {
      try {
        const key = "sp_eb_chunk_reload_ts";
        const last = sessionStorage.getItem(key);
        const now = Date.now();
        if (!last || now - parseInt(last, 10) > 10000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        }
      } catch (e) {
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return <ServerErrorPage error={this.state.error} />;
    }

    return this.props.children;
  }
}


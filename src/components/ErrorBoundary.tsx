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
    console.error("GradiosEdu Uncaught Runtime Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <ServerErrorPage error={this.state.error} />;
    }

    return this.props.children;
  }
}

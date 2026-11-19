"use client";

import React from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";

interface Props {
  children: React.ReactNode;
  label?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class NeonErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unexpected interface error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[NeonErrorBoundary]", this.props.label || "view", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="mx-auto my-8 max-w-md neon-border-sweep">
        <div className="neon-sweep-inner p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#ff1e8e]/50 bg-[#ff1e8e]/15 text-[#ff1e8e]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-[#f7f7fc]">
            {this.props.label || "View"} recovered cleanly
          </h2>
          <p className="text-xs text-[#a6a6c4] break-words">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-full neon-btn-primary px-5 py-2.5 text-xs font-bold text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset View &amp; Continue
          </button>
        </div>
      </div>
    );
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI DJ Studio — Uncaught Runtime Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      // Clear transient session caches that might cause render loops
      sessionStorage.clear();
      // Keep auth token if present
      const authToken = localStorage.getItem('aidj_auth_token');
      const authUser = localStorage.getItem('aidj_auth_user');
      localStorage.clear();
      if (authToken) localStorage.setItem('aidj_auth_token', authToken);
      if (authUser) localStorage.setItem('aidj_auth_user', authUser);
    } catch {}
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen bg-[#121212] text-white flex items-center justify-center p-4 select-none font-sans">
          <div className="max-w-md w-full bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            {/* Header Icon with Neon Pulse */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Audio Stream Interrupted
              </h2>
              <p className="text-sm text-[#B3B3B3] leading-relaxed">
                An unexpected interface or audio engine glitch occurred. Your account data, playlists, and favorites remain completely safe.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-sm shadow-lg shadow-[#1DB954]/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Player</span>
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-[#B3B3B3]" />
                <span>Reset Cache</span>
              </button>
            </div>

            {/* Collapsible Error Diagnostics */}
            <div className="pt-2 text-left">
              <button
                onClick={this.toggleDetails}
                className="flex items-center justify-between w-full text-xs text-[#71717A] hover:text-[#B3B3B3] py-1 border-t border-white/5 cursor-pointer"
              >
                <span>Technical Diagnostics</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-red-400 overflow-x-auto max-h-40 scrollbar-thin">
                  <p className="font-bold">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 text-[10px] text-[#A1A1AA] whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

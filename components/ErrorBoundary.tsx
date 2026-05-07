import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center space-y-6">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-4xl">
              ⚠️
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Erro Inesperado</h1>
            <p className="text-slate-500 font-medium">
              Ocorreu um erro no aplicativo. Por favor, recarregue a página ou tente novamente.
            </p>
            <div className="bg-slate-100 p-4 rounded-xl text-left overflow-auto max-h-40">
              <code className="text-xs text-slate-700 font-mono">
                {this.state.error?.message || 'Erro desconhecido'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function reportError(message: string, context: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/report-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Apikey': SUPABASE_ANON },
      body: JSON.stringify({ message, context }),
    });
  } catch {
    // best-effort — never throw from error reporter
  }
}

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? 'Unknown error' };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    reportError(err?.message ?? 'Unknown error', {
      stack: err?.stack?.slice(0, 1000),
      componentStack: info.componentStack?.slice(0, 500),
      url: typeof window !== 'undefined' ? window.location.href : '',
      page: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('page') ?? 'home' : '',
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => window.location.replace('/')}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
}

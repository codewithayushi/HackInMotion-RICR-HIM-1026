import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Civic Platform Caught Component Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
          <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-slate-200 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              🏛️
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Smart City Municipal Portal
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Report View Fallback & Recovery
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The portal encountered a display issue while rendering this record. Your civic complaint data is safe in the system.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900">Recommended Recovery Actions:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                <li>Click <strong>Reload Report</strong> to fetch a fresh copy from municipal servers.</li>
                <li>Return to the <strong>Citizen Dashboard</strong> to view all your reported issues.</li>
                <li>Submit a new grievance via the <strong>Report Issue</strong> form.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                🔄 Reload Report
              </button>
              <Link
                to="/citizen"
                className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition-all text-center"
              >
                ← Return to Dashboard
              </Link>
              <Link
                to="/report"
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all text-center border border-slate-300"
              >
                + File New Issue
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

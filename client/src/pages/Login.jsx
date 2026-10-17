import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CloudSun, ShieldCheck, Key, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

/**
 * LOGIN PAGE (R - React Page Component)
 * Supports Google Identity Services OAuth sign-in and Quick Demo authentication fallback.
 */
export const Login = () => {
  const { user, loginWithGoogle, loginWithDemo } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Google Identity Services Script if client ID exists
    if (googleClientId && !googleClientId.includes('your_google_client_id')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-btn-container'),
            { theme: 'filled_blue', size: 'large', width: '100%' }
          );
        }
      };
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  const handleGoogleCredentialResponse = async (response) => {
    setIsSubmitting(true);
    setError('');
    const res = await loginWithGoogle(response.credential);
    if (!res.success) {
      setError(res.message);
    }
    setIsSubmitting(false);
  };

  const handleDemoSignIn = async () => {
    setIsSubmitting(true);
    setError('');
    const res = await loginWithDemo();
    if (!res.success) {
      setError(res.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-slate-800/90 border border-slate-700/80 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-teal-500/10 text-teal-400 rounded-2xl border border-teal-500/30">
            <CloudSun className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">CLIMATRIX</h2>
          <p className="text-slate-400 text-sm">Climate Data Management & Visualization Platform</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Authentication Options */}
        <div className="space-y-4 pt-4">
          
          {/* Google Identity Services Button */}
          {googleClientId && !googleClientId.includes('your_google_client_id') ? (
            <div id="google-btn-container" className="flex justify-center"></div>
          ) : (
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/80 text-xs text-slate-400 space-y-1">
              <div className="flex items-center text-amber-400 font-medium">
                <Key className="w-3.5 h-3.5 mr-1" />
                <span>Google Client ID Pending Setup</span>
              </div>
              <p>Add <code className="text-teal-300">VITE_GOOGLE_CLIENT_ID</code> in client/.env for live Google Auth.</p>
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold uppercase tracking-wider">Authentication</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          {/* Quick Demo Access Button */}
          <button
            onClick={handleDemoSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sign In with Google / Academic Demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* PRD Features Checklist */}
        <div className="border-t border-slate-700/80 pt-6 space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300 mb-2 flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Project Requirements Document (PRD) Scope:</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>CSV Upload & Validation</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Statistical Engine</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Recharts Trend Analysis</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Mapbox Heatmap Layer</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

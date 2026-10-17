import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CloudRain, User, Mail, Lock, Shield, Sparkles, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Researcher');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (isLogin) {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      }
    } else {
      if (!name) {
        setError('Please enter your full name.');
        setIsSubmitting(false);
        return;
      }
      const res = await signup(name, email, password, role);
      if (!res.success) {
        setError(res.message);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#F5F4F1', fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl p-8 shadow-lg border space-y-6"
        style={{ borderColor: '#E4E2DC' }}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3"
            style={{ backgroundColor: '#156272' }}
          >
            <CloudRain size={24} color="#fff" />
          </div>
          <h1
            className="text-2xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            CLIMATRIX
          </h1>
          <p className="text-xs text-slate-500">
            Climate Data Management & Visualization Platform
          </p>
        </div>

        {/* Auth Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl" style={{ backgroundColor: '#F5F4F1' }}>
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              backgroundColor: isLogin ? '#fff' : 'transparent',
              color: isLogin ? '#0D1117' : '#8B8B97',
              boxShadow: isLogin ? '0 1px 3px 0 rgb(0 0 0 / 0.04)' : 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              backgroundColor: !isLogin ? '#fff' : 'transparent',
              color: !isLogin ? '#0D1117' : '#8B8B97',
              boxShadow: !isLogin ? '0 1px 3px 0 rgb(0 0 0 / 0.04)' : 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isLogin && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Alex Kim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="researcher@climatrix.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none"
                style={{ borderColor: '#E4E2DC' }}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none"
                style={{ borderColor: '#E4E2DC' }}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Role / Title
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl outline-none bg-white"
                style={{ borderColor: '#E4E2DC' }}
              >
                <option value="Researcher">Climate Researcher</option>
                <option value="Student">Academic Student</option>
                <option value="Faculty">Faculty Professor</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-medium text-white transition-all shadow-sm flex items-center justify-center gap-2 mt-2 text-sm"
            style={{ backgroundColor: '#156272' }}
          >
            <Sparkles size={16} />
            <span>{isLogin ? 'Sign In to Dashboard' : 'Register Account'}</span>
          </button>
        </form>

        <div className="border-t pt-4 text-center text-[11px] text-slate-400" style={{ borderColor: '#F0EEE9' }}>
          Climatrix Platform • Manual Email/Password Authentication
        </div>
      </div>
    </div>
  );
}

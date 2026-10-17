import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Shield, Key, Database, LogOut, CheckCircle } from 'lucide-react';

/**
 * PROFILE PAGE (R - React Page Component)
 * User account profile information and session management.
 */
export const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-700/80 pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">User Profile & Account</h1>
        <p className="text-slate-400 text-sm mt-1">Authenticated user credentials and Google Identity session metadata.</p>
      </div>

      {user && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-8 space-y-8 shadow-xl">
          
          {/* User Header */}
          <div className="flex items-center space-x-6">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-20 h-20 rounded-full border-2 border-teal-500 shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-2xl border-2 border-teal-500">
                {user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <p className="text-sm text-teal-400 font-medium mt-0.5">{user.email}</p>
              <div className="mt-2 inline-flex items-center space-x-1 bg-teal-950 text-teal-300 text-xs px-2.5 py-0.5 rounded-full border border-teal-800">
                <CheckCircle className="w-3 h-3" />
                <span>Authenticated Session Active</span>
              </div>
            </div>
          </div>

          {/* Account Details Table */}
          <div className="border-t border-slate-700/80 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase flex items-center space-x-1">
                <UserIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Account Name</span>
              </span>
              <p className="text-slate-200 font-medium">{user.name}</p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-teal-400" />
                <span>Email Address</span>
              </span>
              <p className="text-slate-200 font-medium">{user.email}</p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-teal-400" />
                <span>User Mongo ID</span>
              </span>
              <p className="text-slate-300 font-mono text-xs truncate">{user._id}</p>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Authentication Source</span>
              </span>
              <p className="text-slate-200 font-medium">Google Identity Services / Academic Demo</p>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-700/80 pt-6 flex justify-end">
            <button
              onClick={logout}
              className="inline-flex items-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

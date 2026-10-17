import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Database, UploadCloud, BarChart3, User, LogOut, CloudSun } from 'lucide-react';

/**
 * NAVBAR & NAVIGATION COMPONENT (R - React Component)
 * Responsive top navigation bar providing primary links: Dashboard, My Datasets, Upload, Analytics, Profile.
 */
export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Datasets', path: '/datasets', icon: Database },
    { name: 'Upload', path: '/upload', icon: UploadCloud },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="p-2 bg-teal-600/20 text-teal-400 rounded-lg border border-teal-500/30">
              <CloudSun className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-100 tracking-wider">
              CLIMATRIX <span className="text-xs text-teal-400 font-normal px-2 py-0.5 bg-teal-950 border border-teal-800 rounded-full">PRD 1.0</span>
            </span>
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* User Profile & Logout */}
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full border border-teal-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-slate-200">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}

        </div>
      </div>
    </nav>
  );
};

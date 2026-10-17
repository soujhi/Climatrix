import React, { useState } from 'react';
import {
  LayoutDashboard,
  Database,
  BarChart2,
  MapPin,
  User,
  Settings,
  CloudRain,
  Upload,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, onNavigate, onUploadClick }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Datasets', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'geospatial', label: 'Geospatial', icon: MapPin },
  ];

  const bottomItems = [
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen border-r border border-border bg-card shadow-sm"
      style={{ borderColor: '#E4E2DC', backgroundColor: '#FFFFFF' }}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: '#E4E2DC' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: '#156272' }}
        >
          <CloudRain size={16} strokeWidth={2.2} color="#fff" />
        </div>
        <div className="flex flex-col">
          <span
            className="text-base font-semibold tracking-widest uppercase"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117', letterSpacing: '0.12em' }}
          >
            Climatrix
          </span>
          <span className="text-[10px] uppercase font-medium" style={{ color: '#8B8B97' }}>
            Data Platform
          </span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-5 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 w-full text-left font-medium"
              style={{
                backgroundColor: active ? '#EAF4F6' : 'transparent',
                color: active ? '#156272' : '#4A4A52',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#F5F4F1';
                  e.currentTarget.style.color = '#0D1117';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4A4A52';
                }
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-4 rounded-full"
                  style={{ backgroundColor: '#156272' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile / Account Navigation */}
      <div className="py-4 px-3 border-t flex flex-col gap-1" style={{ borderColor: '#E4E2DC' }}>
        {bottomItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 w-full text-left font-medium"
              style={{
                backgroundColor: active ? '#EAF4F6' : 'transparent',
                color: active ? '#156272' : '#4A4A52',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#F5F4F1';
                  e.currentTarget.style.color = '#0D1117';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4A4A52';
                }
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* User Identity Card */}
        {user && (
          <div
            className="mt-2 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border"
            style={{ backgroundColor: '#F5F4F1', borderColor: '#E4E2DC' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm"
                style={{ backgroundColor: '#156272', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: '#0D1117' }}>
                  {user.name}
                </p>
                <p className="text-[11px] truncate" style={{ color: '#8B8B97' }}>
                  {user.role || 'Researcher'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
              title="Sign Out"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

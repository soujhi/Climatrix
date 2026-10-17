import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Datasets from './components/Datasets';
import Analytics from './components/Analytics';
import Geospatial from './components/Geospatial';
import UploadModal from './components/UploadModal';
import AuthPage from './pages/AuthPage';
import { MapPin, User, Settings, ShieldCheck, Mail, Key } from 'lucide-react';

function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
          Researcher Profile
        </h1>
        <p className="text-sm" style={{ color: '#8B8B97' }}>
          Manage your account credentials and system authorization.
        </p>
      </div>

      {user && (
        <div className="bg-white rounded-2xl p-8 border space-y-6 max-w-2xl shadow-sm" style={{ borderColor: '#E4E2DC' }}>
          <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: '#F0EEE9' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md" style={{ backgroundColor: '#156272' }}>
              {user.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
              <p className="text-xs font-medium" style={{ color: '#156272' }}>{user.email}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Authenticated Member ({user.role || 'Researcher'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border bg-slate-50" style={{ borderColor: '#E4E2DC' }}>
              <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                <User size={14} className="text-teal-700" /> Account Name
              </span>
              <p className="font-semibold text-slate-900">{user.name}</p>
            </div>
            <div className="p-4 rounded-xl border bg-slate-50" style={{ borderColor: '#E4E2DC' }}>
              <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5 mb-1">
                <Mail size={14} className="text-teal-700" /> Email Address
              </span>
              <p className="font-semibold text-slate-900">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

function MainLayout() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-medium" style={{ backgroundColor: '#F5F4F1', color: '#8B8B97' }}>
        Verifying Climatrix session...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} onUploadClick={() => setIsUploadOpen(true)} />;
      case 'datasets':
        return <Datasets onNavigate={setActivePage} onUploadClick={() => setIsUploadOpen(true)} />;
      case 'analytics':
        return <Analytics />;
      case 'geospatial':
        return <Geospatial onUploadClick={() => setIsUploadOpen(true)} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard onNavigate={setActivePage} onUploadClick={() => setIsUploadOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F4F1', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} onUploadClick={() => setIsUploadOpen(true)} />
      <main className="flex-1 overflow-y-auto">
        {renderPage()}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          setIsUploadOpen(false);
          setActivePage('datasets');
        }}
      />
    </div>
  );
}

export default App;

// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Popup from './pages/Popup';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Status from './pages/Status';
import { applyTheme } from './styles/theme';

const App: React.FC = () => {
  useEffect(() => {
    const handleSync = () => {
      const savedTheme = localStorage.getItem('theme') || 'pastel';
      applyTheme(savedTheme);
    };

    handleSync();

    window.addEventListener('storage', handleSync);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      mediaQuery.removeEventListener('change', handleSync);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdfdfc] to-[#ffffff] p-4">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/popup" element={<Popup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/status" element={<Status />} />
      </Routes>
    </div>
  );
};

export default App;

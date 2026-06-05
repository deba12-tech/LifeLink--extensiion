// src/status/main.tsx

// Initial theme apply to document elements before React mounts to prevent UI flash
(function() {
  try {
    const savedTheme = localStorage.getItem('theme') || 'pastel';
    let resolved = savedTheme;
    if (savedTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-glass' : 'pastel';
    }
    const className = (resolved === 'dark-glass' || resolved === 'midnight') ? 'theme-dark-glass' : 'theme-pastel';
    document.documentElement.classList.add(className);
    document.body.classList.add(className);
  } catch (e) {}
})();

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Status from '../pages/Status';
import '../index.css';
import { applyTheme } from '../styles/theme';
import { initializeLocalStorage } from '../utils/storage';

const ThemeSyncWrapper: React.FC = () => {
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

  return <Status />;
};

initializeLocalStorage().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeSyncWrapper />
      </BrowserRouter>
    </React.StrictMode>
  );
});

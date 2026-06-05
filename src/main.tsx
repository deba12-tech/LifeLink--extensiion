// src/main.tsx

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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

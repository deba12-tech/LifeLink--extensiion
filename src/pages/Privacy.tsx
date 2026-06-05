import React, { useEffect, useState } from 'react';
import { applyTheme } from '../styles/theme';
import { syncStorageItem } from '../utils/storage';

const Privacy: React.FC = () => {
  const [time, setTime] = useState('12:45 PM');
  const [driftPos, setDriftPos] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(() => localStorage.getItem('focusMode') === 'true');

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'pastel';
    return saved === 'midnight' ? 'dark-glass' : saved;
  });

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const active = theme === 'dark-glass' || theme === 'midnight' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return active;
  });

  useEffect(() => {
    const updateDark = () => {
      const active = theme === 'dark-glass' || theme === 'midnight' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkTheme(active);
    };
    updateDark();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDark);
    return () => mediaQuery.removeEventListener('change', updateDark);
  }, [theme]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      setTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 50;
      const y = (e.clientY / window.innerHeight - 0.5) * 50;
      setDriftPos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme') || 'pastel';
      setTheme(savedTheme === 'midnight' ? 'dark-glass' : savedTheme);
      setIsFocusMode(localStorage.getItem('focusMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Chrome storage listener for instant MV3 syncing
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const handleChromeStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName === 'local') {
          for (const [key, change] of Object.entries(changes)) {
            const newValue = change.newValue;
            localStorage.setItem(key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
            if (key === 'theme') {
              const themeVal = (newValue as string) || 'pastel';
              setTheme(themeVal === 'midnight' ? 'dark-glass' : themeVal);
            } else if (key === 'focusMode') {
              setIsFocusMode(newValue === true || newValue === 'true');
            }
          }
        }
      };
      chrome.storage.onChanged.addListener(handleChromeStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    }
  }, []);

  const handleToggleFocusMode = () => {
    const nextState = !isFocusMode;
    setIsFocusMode(nextState);
    syncStorageItem('focusMode', nextState);
    showToast(nextState ? 'Focus Mode Enabled!' : 'Focus Mode Disabled!');
  };

  const handleExportData = async () => {
    try {
      let sessions = [];
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const res = await new Promise<any>((resolve) => {
          chrome.storage.local.get('activitySessions', resolve);
        });
        sessions = res.activitySessions || [];
      } else {
        const saved = localStorage.getItem('activitySessions');
        sessions = saved ? JSON.parse(saved) : [];
      }

      const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifelink_activity_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Activity data exported successfully!');
    } catch (err) {
      console.error(err);
      showToast('Export failed.', 'error');
    }
  };

  const handleClearAllActivity = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all your activity history? This will reset your metrics but preserve your settings."
    );
    if (!confirmed) return;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ activitySessions: [] }, resolve);
        });
      }
      localStorage.setItem('activitySessions', JSON.stringify([]));

      showToast("All activity history cleared!");
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
      showToast('Failed to clear activity history.', 'error');
    }
  };

  return (
    <div className={`app-bg min-h-screen flex flex-col relative px-6 md:px-container-padding-desktop pb-12 overflow-hidden ${isDarkTheme ? 'theme-dark-glass' : ''}`}>
      {/* Atmospheric Blobs */}
      <div 
        className="liquid-blob w-[600px] h-[600px] bg-lavender top-[-200px] left-[-100px] transition-transform duration-300 ease-out" 
        style={{ transform: `translate(${driftPos.x * 0.5}px, ${driftPos.y * 0.5}px)` }}
      />
      <div 
        className="liquid-blob w-[500px] h-[500px] bg-rose bottom-[-100px] right-[-50px] transition-transform duration-300 ease-out" 
        style={{ 
          transform: `translate(${driftPos.x * 1.0}px, ${driftPos.y * 1.0}px)`,
          animationDelay: '-7s' 
        }}
      />
      <div 
        className="liquid-blob w-[450px] h-[450px] bg-sky top-[30%] right-[15%] transition-transform duration-300 ease-out" 
        style={{ 
          transform: `translate(${driftPos.x * 1.5}px, ${driftPos.y * 1.5}px)`,
          animationDelay: '-12s' 
        }}
      />

      <main className="w-full max-w-7xl mx-auto flex flex-col relative z-10">
        {/* Navigation */}
        <header className="flex justify-between items-center px-8 py-3 w-full sticky top-6 z-50 glass-card-sm mb-8 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">all_inclusive</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-primary-custom">LifeLink</span>
          </div>
          
          {/* Main Links */}
          <div className="hidden lg:flex items-center gap-6">
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="newtab.html">Dashboard</a>
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="popup.html">Extension Popup</a>
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="options.html">Settings</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleToggleFocusMode}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all active:scale-95 text-xs font-bold uppercase tracking-wider ${
                isFocusMode 
                  ? 'active-pill' 
                  : 'inactive-pill'
              }`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isFocusMode ? 'check_circle' : 'adjust'}
              </span>
              Focus Mode
            </button>
            <div className="hidden md:block font-mono text-[11px] text-secondary-custom">{time}</div>
            <a href="options.html" className="material-symbols-outlined p-2 hover:bg-white/40 rounded-full transition-all text-secondary-custom">settings</a>
          </div>
        </header>

        {/* Hero Header Card */}
        <section className="mb-8">
          <div className="glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-12 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender via-sky to-peach opacity-80"></div>
            <div className="space-y-4 max-w-2xl">
              <div className="inline-block px-3 py-1 glass-pill text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-custom">
                Local-Only Sanctuary
              </div>
              <h1 className="text-4xl font-bold text-primary-custom tracking-tight">Privacy &amp; Security Sanctum</h1>
              <p className="text-lg text-secondary-custom leading-relaxed">
                We have no eyes on your browser history. Everything is stored locally on your device inside a secure sandbox.
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center border border-white/80 dark:border-white/10 flex-shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
          </div>
        </section>

        {/* Bento Explanation Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Tracked Card */}
          <div className="glass-card p-8 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center text-green-700 border border-white/40">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom">What is Tracked</h2>
            </div>
            <p className="text-sm text-secondary-custom mb-6 leading-relaxed">
              LifeLink records only essential metadata to compute your focus scores and display the internet receipt layout:
            </p>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-sky mt-0.5">language</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Domain Name</p>
                  <p className="text-xs text-secondary-custom">Stores the site address (e.g., github.com) to log durations and match your custom category rules.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-sky mt-0.5">title</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Page Title</p>
                  <p className="text-xs text-secondary-custom">Records the page header to help you search and pick up where you left off.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-sky mt-0.5">timer</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Active Time</p>
                  <p className="text-xs text-secondary-custom">Logs the exact amount of seconds you actively interact with the site in the foreground.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-sky mt-0.5">category</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Category classification</p>
                  <p className="text-xs text-secondary-custom">Groups activity into Deep Focus, Active Learning, or Leisure to calculate daily analytics.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Not Tracked Card */}
          <div className="glass-card p-8 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose/15 flex items-center justify-center text-red-700 border border-white/40">
                <span className="material-symbols-outlined">visibility_off</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom">What is NOT Tracked</h2>
            </div>
            <p className="text-sm text-secondary-custom mb-6 leading-relaxed">
              We enforce strict sandboxing rules. The extension does not inspect or save sensitive web interactions:
            </p>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-rose mt-0.5">password</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Passwords &amp; Credentials</p>
                  <p className="text-xs text-secondary-custom">Passwords, security pins, login details, and account hashes are never accessed or observed.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-rose mt-0.5">keyboard_alt</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Form Inputs &amp; Keystrokes</p>
                  <p className="text-xs text-secondary-custom">Text entered in text fields, search queries, credit card numbers, and messages are completely ignored.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-rose mt-0.5">article</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Page Body Content</p>
                  <p className="text-xs text-secondary-custom">LifeLink does not scrape the text content, emails, documents, or direct chat strings inside pages.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-rose mt-0.5">incognito</span>
                <div>
                  <p className="font-semibold text-primary-custom text-sm">Incognito Activity</p>
                  <p className="text-xs text-secondary-custom">Private browsing windows completely bypass tracking hooks and are never saved to storage.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Local Sandboxing & Data Control Section */}
        <section className="glass-card p-8 mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-primary-custom">Local Sandbox Control</h2>
              <p className="text-sm text-secondary-custom max-w-2xl leading-relaxed">
                All data is securely saved in your browser's local sandbox environment (`chrome.storage.local`). We do not use cloud synchronization, remote database clusters, or external tracking APIs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                onClick={handleExportData}
                className="pastel-button px-6 py-4 font-bold text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Export My Data
              </button>
              <button 
                onClick={handleClearAllActivity}
                className="pastel-button-rose px-6 py-4 font-bold text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">delete_sweep</span>
                Delete All Activity
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center py-10 text-muted-custom border-t border-primary/5 mt-auto">
          <div className="mono-font text-[10px] uppercase tracking-[0.3em] mb-4 md:mb-0">
            © 2026 LifeLink Spatial — V2.4 • Local Sandbox Storage • No Cloud Sync
          </div>
          <div className="flex gap-10">
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="newtab.html">Dashboard</a>
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="options.html">Settings</a>
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="terms.html">Terms</a>
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="status.html">System Status</a>
          </div>
        </footer>
      </main>

      {/* Reusable Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border flex items-center gap-2 transform transition-all duration-300 ease-out animate-bounce ${
          toast.type === 'success' 
            ? 'bg-mint/80 border-white/60 text-green-900 shadow-[0_10px_30px_rgba(168,240,212,0.4)]' 
            : 'bg-rose/80 border-white/60 text-red-900 shadow-[0_10px_30px_rgba(255,198,221,0.4)]'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Privacy;

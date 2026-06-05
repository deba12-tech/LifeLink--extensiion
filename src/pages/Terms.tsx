import React, { useEffect, useState } from 'react';
import { applyTheme } from '../styles/theme';
import { syncStorageItem } from '../utils/storage';

const Terms: React.FC = () => {
  const [time, setTime] = useState('12:45 PM');
  const [driftPos, setDriftPos] = useState({ x: 0, y: 0 });
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
            <div className="hidden md:block font-mono text-[11px] text-secondary-custom">{time}</div>
            <a href="options.html" className="material-symbols-outlined p-2 hover:bg-white/40 rounded-full transition-all text-secondary-custom">settings</a>
          </div>
        </header>

        {/* Hero Header Card */}
        <section className="mb-8 animate-fade-up">
          <div className="glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-12 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden border border-white/60 dark:border-white/10 shadow-[0_20px_50px_rgba(90,103,216,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender via-sky to-peach opacity-80"></div>
            <div className="space-y-4 max-w-2xl relative z-10">
              <div className="inline-block px-3 py-1 glass-pill text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-custom">
                Terms of Use
              </div>
              <h1 className="text-4xl font-bold text-primary-custom tracking-tight leading-tight">LifeLink Terms of Service</h1>
              <p className="text-lg text-secondary-custom leading-relaxed">
                Please read these terms carefully. Last updated: June 2026.
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center border border-white/80 dark:border-white/10 flex-shrink-0 shadow-lg relative z-10">
              <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            </div>
          </div>
        </section>

        {/* Terms Content Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Section 1 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-75 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-sky/15 flex items-center justify-center text-secondary border border-white/40">
                <span className="material-symbols-outlined">rule</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">1. Acceptance of Terms</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              By installing and utilizing the LifeLink browser extension, you explicitly agree to these Terms of Use. If you do not consent to all clauses, please uninstall the extension immediately.
            </p>
          </div>

          {/* Section 2 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-100 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-sky/15 flex items-center justify-center text-secondary border border-white/40">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">2. What LifeLink Does</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              LifeLink is a foreground browser productivity and self-awareness dashboard. It calculates active browsing time, categorizes domains, and provides visual stats such as focus scores and internet receipts to build user digital mindfulness.
            </p>
          </div>

          {/* Section 3 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-150 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center text-green-700 border border-white/40">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">3. Local-First Data Storage</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              LifeLink stores all browser activity and insights entirely locally on the user's device inside a sandbox (`chrome.storage.local`). **LifeLink does not upload, sell, or share your browsing activity.** We do not operate cloud databases, analytics pipelines, or external sync mechanisms.
            </p>
          </div>

          {/* Section 4 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-200 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-peach/15 flex items-center justify-center text-orange-700 border border-white/40">
                <span className="material-symbols-outlined">person</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">4. User Responsibility</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              You are solely responsible for managing your local configuration, setting ignore rules/blacklists (e.g. Hidden Zones), and controlling backups or clearing stored databases. Data deleted locally cannot be recovered since no remote copies exist.
            </p>
          </div>

          {/* Section 5 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-300 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose/15 flex items-center justify-center text-red-700 border border-white/40">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">5. Disclaimer & No Warranty</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              LifeLink is provided "as is" without warranty of any kind. **LifeLink is a productivity and self-awareness tool, not a security, medical, legal, or financial tool.** It should not be used as clinical evidence or for corporate surveillance audits.
            </p>
          </div>

          {/* Section 6 */}
          <div className="glass-card p-8 hover-lift animate-fade-up delay-300 border border-white/40 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose/15 flex items-center justify-center text-red-700 border border-white/40">
                <span className="material-symbols-outlined">gavel</span>
              </div>
              <h2 className="text-xl font-bold text-primary-custom tracking-tight">6. Limitation of Liability</h2>
            </div>
            <p className="text-sm text-secondary-custom leading-relaxed">
              In no event shall LifeLink or its developers be liable for any direct, indirect, incidental, special, or consequential damages arising out of your use of or inability to use the extension.
            </p>
          </div>
        </section>

        {/* Additional Info Section */}
        <section className="glass-card p-8 mb-8 animate-fade-up delay-300">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-primary-custom tracking-tight">Changes & Contact</h2>
              <p className="text-sm text-secondary-custom max-w-2xl leading-relaxed">
                We reserve the right to revise these terms to align with browser extension API changes. For inquiries regarding this local sandbox sanctuary, please reach out via our support channels.
              </p>
            </div>
            <a 
              href="newtab.html"
              className="pastel-button px-6 py-4 font-bold text-sm flex items-center justify-center gap-2 hover-lift transition-all"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Dashboard
            </a>
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
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="privacy.html">Privacy</a>
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="status.html">System Status</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Terms;

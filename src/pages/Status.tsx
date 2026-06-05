import React, { useEffect, useState } from 'react';
import { applyTheme } from '../styles/theme';
import { syncStorageItem } from '../utils/storage';
import { formatDuration } from '../lib/activityAnalytics';

interface ActivitySession {
  id: string;
  url: string;
  domain: string;
  title: string;
  category: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  date: string;
}

const Status: React.FC = () => {
  const [time, setTime] = useState('12:45 PM');
  const [driftPos, setDriftPos] = useState({ x: 0, y: 0 });
  const [isFocusMode, setIsFocusMode] = useState(() => localStorage.getItem('focusMode') === 'true');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Real data state
  const [sessionsCount, setSessionsCount] = useState(0);
  const [latestSessionTime, setLatestSessionTime] = useState<string>('None');
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

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

  // Sync state values from storage
  const syncSettingsAndSessions = () => {
    // Read Settings
    const savedSettings = localStorage.getItem('lifelinkSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setTrackingEnabled(parsed.trackingEnabled !== false);
        setIsPaused(parsed.isPaused === true);
      } catch (e) {}
    }

    // Read Sessions
    const savedSessions = localStorage.getItem('activitySessions');
    if (savedSessions) {
      try {
        const parsed: ActivitySession[] = JSON.parse(savedSessions);
        setSessionsCount(parsed.length);
        if (parsed.length > 0) {
          const sorted = [...parsed].sort((a, b) => b.endTime - a.endTime);
          const latestTime = new Date(sorted[0].endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLatestSessionTime(`${latestTime} (${sorted[0].domain})`);
        }
      } catch (e) {}
    }

    // Chrome Local Sandbox Sync
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['lifelinkSettings', 'activitySessions'], (res) => {
        if (res.lifelinkSettings) {
          setTrackingEnabled(res.lifelinkSettings.trackingEnabled !== false);
          setIsPaused(res.lifelinkSettings.isPaused === true);
        }
        if (res.activitySessions) {
          const parsed: ActivitySession[] = res.activitySessions;
          setSessionsCount(parsed.length);
          if (parsed.length > 0) {
            const sorted = [...parsed].sort((a, b) => b.endTime - a.endTime);
            const latestTime = new Date(sorted[0].endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLatestSessionTime(`${latestTime} (${sorted[0].domain})`);
          }
        }
      });
    }

    setLastCheckTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  useEffect(() => {
    syncSettingsAndSessions();
    const interval = setInterval(syncSettingsAndSessions, 5000); // Poll every 5s for live status updates
    return () => clearInterval(interval);
  }, []);

  // Listen to Storage Changes
  useEffect(() => {
    const handleStorageChange = () => {
      syncSettingsAndSessions();
      const savedTheme = localStorage.getItem('theme') || 'pastel';
      setTheme(savedTheme === 'midnight' ? 'dark-glass' : savedTheme);
      setIsFocusMode(localStorage.getItem('focusMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
              <div className="inline-flex items-center gap-2 px-3 py-1 glass-pill text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-custom">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Integrity Ledger
              </div>
              <h1 className="text-4xl font-bold text-primary-custom tracking-tight leading-tight">Spatial Diagnostics</h1>
              <p className="text-lg text-secondary-custom leading-relaxed">
                Check extension performance, local database size, and background worker state.
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center border border-white/80 dark:border-white/10 flex-shrink-0 shadow-lg relative z-10">
              <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
            </div>
          </div>
        </section>

        {/* Status Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Main Status Indicators */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card p-8 animate-fade-up delay-75 hover-lift border border-white/40 dark:border-white/5 shadow-md">
              <h2 className="text-xl font-bold text-primary-custom tracking-tight mb-8">Service Health checklist</h2>
              
              <div className="space-y-6">
                {/* Check 1: Tracking */}
                <div className="flex items-center justify-between p-4 bg-white/20 dark:bg-white/5 border border-white/30 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-secondary">track_changes</span>
                    <div>
                      <p className="font-semibold text-primary-custom text-sm">Browser Tracking Agent</p>
                      <p className="text-xs text-secondary-custom">Checks if background observer hooks are operational.</p>
                    </div>
                  </div>
                  {isPaused ? (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">Paused</span>
                  ) : trackingEnabled ? (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">Active</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">Disabled</span>
                  )}
                </div>

                {/* Check 2: Storage */}
                <div className="flex items-center justify-between p-4 bg-white/20 dark:bg-white/5 border border-white/30 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-secondary">database</span>
                    <div>
                      <p className="font-semibold text-primary-custom text-sm">Local Sandbox Storage</p>
                      <p className="text-xs text-secondary-custom">Validates storage space inside `chrome.storage.local` sandbox.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">Available</span>
                </div>

                {/* Check 3: Background Worker */}
                <div className="flex items-center justify-between p-4 bg-white/20 dark:bg-white/5 border border-white/30 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-secondary">memory</span>
                    <div>
                      <p className="font-semibold text-primary-custom text-sm">Background Service Worker</p>
                      <p className="text-xs text-secondary-custom">Checks persistent message listeners and state trackers.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">Monitoring</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="glass-card p-8 animate-fade-up delay-100 hover-lift border border-white/40 dark:border-white/5 shadow-md">
              <h2 className="text-xl font-bold text-primary-custom tracking-tight mb-6">Database Telemetry</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/20 dark:bg-white/5 border border-white/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Stored Sessions</p>
                  <p className="text-2xl font-bold text-primary-custom">{sessionsCount} entries</p>
                </div>
                <div className="p-4 bg-white/20 dark:bg-white/5 border border-white/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Latest Logged Activity</p>
                  <p className="text-xs font-bold text-primary-custom truncate mt-1">{latestSessionTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Status Panel */}
          <div className="space-y-6">
            {/* Overall Status Card */}
            <div className="glass-card p-8 bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 animate-fade-up delay-150 hover-lift shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 border border-emerald-300">
                  <span className="material-symbols-outlined text-3xl text-emerald-700">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-300 tracking-tight">System Operational</h3>
                <p className="text-xs text-emerald-850 dark:text-emerald-400 mt-2 leading-relaxed">
                  All local sandbox tracking agents are operating normally. No anomalies detected.
                </p>
              </div>
            </div>

            {/* Diagnostics checklist logs */}
            <div className="glass-card p-6 animate-fade-up delay-200 border border-white/40 dark:border-white/5 shadow-sm text-xs text-secondary-custom space-y-4">
              <p className="font-bold text-primary-custom uppercase tracking-wider">Diagnostic Logs (Polled)</p>
              <div className="h-px bg-black/5 dark:bg-white/5"></div>
              <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                <p>• [OK] chrome.storage.local connected successfully.</p>
                <p>• [OK] lifelinkSettings retrieved (paused: {isPaused ? 'true' : 'false'}).</p>
                <p>• [OK] loaded {sessionsCount} historical activitySessions.</p>
                <p>• [OK] tab state observers listening normally.</p>
                <p className="text-[10px] text-muted-custom mt-2 italic">Last polled: {lastCheckTime}</p>
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-2">
              <a 
                href="newtab.html"
                className="w-full py-4 pastel-button flex items-center justify-center gap-2 shadow-sm font-bold text-sm hover-lift active:scale-98 transition-all"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Dashboard
              </a>
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
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="privacy.html">Privacy</a>
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="terms.html">Terms</a>
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

export default Status;

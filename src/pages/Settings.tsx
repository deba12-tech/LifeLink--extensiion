import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applyTheme } from '../styles/theme';
import { syncStorageItem } from '../utils/storage';

interface CategoryRule {
  id: string;
  domain: string;
  category: string;
}

const Settings: React.FC = () => {
  // App Settings States
  const getInitialSettings = () => {
    const saved = localStorage.getItem('lifelinkSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      trackingEnabled: true,
      isPaused: false,
      pauseWhenIdle: true,
      ignoreSensitiveSites: true,
      blacklistedDomains: []
    };
  };

  const initialSettings = getInitialSettings();

  const [awareness, setAwareness] = useState(initialSettings.trackingEnabled);
  const [idle, setIdle] = useState(initialSettings.pauseWhenIdle);
  const [banking, setBanking] = useState(initialSettings.ignoreSensitiveSites);
  
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
  
  const [ignoredSites, setIgnoredSites] = useState<string[]>(initialSettings.blacklistedDomains || []);
  const [newSite, setNewSite] = useState('');

  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>(() => {
    const saved = localStorage.getItem('category_rules');
    return saved ? JSON.parse(saved) : [
      { id: '1', domain: 'github.com', category: 'Deep Work' },
      { id: '2', domain: 'youtube.com', category: 'Learning' }
    ];
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync state values to consolidated lifelinkSettings
  useEffect(() => {
    const saved = localStorage.getItem('lifelinkSettings');
    let currentIsPaused = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        currentIsPaused = parsed.isPaused || false;
        
        if (
          parsed.trackingEnabled === awareness &&
          parsed.isPaused === currentIsPaused &&
          parsed.pauseWhenIdle === idle &&
          parsed.ignoreSensitiveSites === banking &&
          JSON.stringify(parsed.blacklistedDomains) === JSON.stringify(ignoredSites)
        ) {
          // No changes, skip to prevent storage update loops
          return;
        }
      } catch (e) {}
    }
    const newSettings = {
      trackingEnabled: awareness,
      isPaused: currentIsPaused,
      pauseWhenIdle: idle,
      ignoreSensitiveSites: banking,
      blacklistedDomains: ignoredSites
    };
    syncStorageItem('lifelinkSettings', newSettings);
  }, [awareness, idle, banking, ignoredSites]);

  useEffect(() => {
    syncStorageItem('theme', theme);
    applyTheme(theme);
    window.dispatchEvent(new Event('storage'));
  }, [theme]);

  useEffect(() => {
    syncStorageItem('category_rules', categoryRules);
  }, [categoryRules]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('lifelinkSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAwareness(parsed.trackingEnabled);
          setIdle(parsed.pauseWhenIdle);
          setBanking(parsed.ignoreSensitiveSites);
          setIgnoredSites(parsed.blacklistedDomains || []);
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const handleChromeStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
        if (areaName === 'local' && changes.lifelinkSettings) {
          const val = changes.lifelinkSettings.newValue as any;
          if (val) {
            localStorage.setItem('lifelinkSettings', JSON.stringify(val));
            setAwareness(val.trackingEnabled);
            setIdle(val.pauseWhenIdle);
            setBanking(val.ignoreSensitiveSites);
            setIgnoredSites(val.blacklistedDomains || []);
          }
        }
      };
      chrome.storage.onChanged.addListener(handleChromeStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    }
  }, []);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    const site = newSite.trim();
    if (site) {
      if (!ignoredSites.includes(site)) {
        setIgnoredSites([...ignoredSites, site]);
        setNewSite('');
        showToast(`Added ${site} to hidden zones!`);
      } else {
        showToast('Site is already ignored.', 'error');
      }
    }
  };

  const handleRemoveSite = (site: string) => {
    setIgnoredSites(ignoredSites.filter(s => s !== site));
    showToast(`Removed ${site} from hidden zones.`);
  };

  const handleUpdateRuleCategory = (id: string, newCategory: string) => {
    setCategoryRules(categoryRules.map(rule => 
      rule.id === id ? { ...rule, category: newCategory } : rule
    ));
    showToast('Category rule updated!');
  };

  const handleAdjustAllCategories = () => {
    const allDeepWork = categoryRules.every(r => r.category === 'Deep Work');
    const nextCategory = allDeepWork ? 'Learning' : 'Deep Work';
    setCategoryRules(categoryRules.map(r => ({ ...r, category: nextCategory })));
    showToast(`All categories set to ${nextCategory}!`);
  };

  const handleExportData = () => {
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      settings: {
        gentleAwareness: awareness,
        respectIdle: idle,
        sensitiveProtection: banking,
        theme,
        ignoredSites,
        categoryRules
      },
      dashboardStats: {
        focusScore: 72,
        activeTime: '4h 28m',
        deepWork: '2h 50m',
        driftTime: '1h 12m'
      }
    };
    
    try {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifelink_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (err) {
      showToast('Export failed.', 'error');
    }
  };

  const handleExportActivityData = async () => {
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

  const handleClearTodayActivity = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear today's activity? This will remove all tracked sessions for today."
    );
    if (!confirmed) return;

    try {
      const getLocalDateString = (timestamp: number): string => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayStr = getLocalDateString(Date.now());

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

      const remainingSessions = sessions.filter((s: any) => s.date !== todayStr);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ activitySessions: remainingSessions }, resolve);
        });
      }
      localStorage.setItem('activitySessions', JSON.stringify(remainingSessions));

      showToast("Cleared today's activity!");
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error(err);
      showToast("Failed to clear today's activity.", "error");
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

  const handleDeleteAllData = () => {
    const confirmed = window.confirm(
      'Are you absolutely sure you want to delete all LifeLink data and settings? This action is permanent.'
    );
    if (confirmed) {
      localStorage.clear();
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.clear();
      }
      // Reset state to defaults
      setAwareness(true);
      setIdle(true);
      setBanking(false);
      setTheme('pastel');
      setIgnoredSites(['mail.google.com', 'my-vault.com']);
      setCategoryRules([
        { id: '1', domain: 'github.com', category: 'Deep Work' },
        { id: '2', domain: 'youtube.com', category: 'Learning' }
      ]);
      showToast('All local storage data has been cleared.', 'success');
    }
  };

  return (
    <div className={`app-bg font-body-md selection:bg-secondary-container/30 min-h-screen relative pb-12 ${isDarkTheme ? 'theme-dark-glass' : ''}`}>
      {/* Background Blobs */}
      <div className="liquid-bg">
        <div className="liquid-blob bg-lavender w-[600px] h-[600px] top-[-150px] left-[-150px] absolute" style={{ animationDuration: '35s' }}></div>
        <div className="liquid-blob bg-sky w-[500px] h-[500px] bottom-[-100px] right-[-100px] absolute" style={{ animationDuration: '40s', animationDirection: 'reverse' }}></div>
        <div className="liquid-blob bg-mint w-[400px] h-[400px] top-[30%] right-[20%] absolute" style={{ animationDuration: '45s' }}></div>
      </div>

      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/40 backdrop-blur-3xl border-b border-white/50">
        <nav className="flex justify-between items-center px-container-padding-desktop py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="font-display-lg text-2xl font-bold tracking-tight text-primary-custom">LifeLink</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="newtab.html">Dashboard</a>
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="popup.html">Extension Popup</a>
            <a className="text-primary-custom font-semibold px-4 py-2 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-primary" href="options.html">Settings</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => showToast('Opening focus schedule planner...')} className="material-symbols-outlined text-secondary-custom p-2 hover:bg-black/5 transition-all rounded-full">schedule</button>
            <a href="options.html" className="material-symbols-outlined text-secondary-custom p-2 hover:bg-black/5 transition-all rounded-full">settings</a>
            <div className="ml-2 w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden border border-white/40 shadow-sm">
              <img 
                alt="User profile" 
                className="w-full h-full object-cover" 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
              />
            </div>
          </div>
        </nav>
      </header>

      <main className="pt-32 pb-24 px-container-padding-mobile md:px-container-padding-desktop max-w-7xl mx-auto z-10 relative">
        {/* Header Section */}
        <section className="mb-12">
          <h1 className="text-4xl font-bold text-primary-custom mb-3">Your Space</h1>
          <p className="text-secondary-custom max-w-xl">Personalize how LifeLink nurtures your focus while keeping your digital footprint entirely yours.</p>
        </section>

        {/* Bento Layout Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Tracking & Rules */}
          <div className="lg:col-span-7 space-y-8">
            {/* Tracking Preferences */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-custom">track_changes</span>
                </div>
                <h2 className="text-xl font-bold text-primary-custom">Nurture Patterns</h2>
              </div>
              <div className="space-y-8">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setAwareness(!awareness)}>
                  <div className="pr-8">
                    <p className="font-semibold text-primary-custom">Gentle activity awareness</p>
                    <p className="text-sm text-secondary-custom">Allow LifeLink to quietly observe your focus cycles.</p>
                  </div>
                  <button className="relative focus:outline-none" type="button">
                    <div className={`rounded-full relative w-11 h-6 transition-all duration-300 border ${
                      awareness ? 'active-toggle' : 'inactive-toggle'
                    }`}>
                      <div className={`absolute top-[3px] left-[3px] bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300 ${
                        awareness ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </button>
                </div>
                
                <div className="h-px bg-black/5"></div>
                
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setIdle(!idle)}>
                  <div className="pr-8">
                    <p className="font-semibold text-primary-custom">Respect my idle time</p>
                    <p className="text-sm text-secondary-custom">Automatically pause insights when you step away.</p>
                  </div>
                  <button className="relative focus:outline-none" type="button">
                    <div className={`rounded-full relative w-11 h-6 transition-all duration-300 border ${
                      idle ? 'active-toggle' : 'inactive-toggle'
                    }`}>
                      <div className={`absolute top-[3px] left-[3px] bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300 ${
                        idle ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </button>
                </div>
                
                <div className="h-px bg-black/5"></div>
                
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setBanking(!banking)}>
                  <div className="pr-8">
                    <p className="font-semibold text-primary-custom">Sensitive context protection</p>
                    <p className="text-sm text-secondary-custom">Never observe banking or identity-related moments.</p>
                  </div>
                  <button className="relative focus:outline-none" type="button">
                    <div className={`rounded-full relative w-11 h-6 transition-all duration-300 border ${
                      banking ? 'active-toggle' : 'inactive-toggle'
                    }`}>
                      <div className={`absolute top-[3px] left-[3px] bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300 ${
                        banking ? 'translate-x-5' : ''
                      }`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Category Rules */}
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-custom">category</span>
                  </div>
                  <h2 className="text-xl font-bold text-primary-custom">Flow Categories</h2>
                </div>
                <button onClick={handleAdjustAllCategories} className="text-sm text-secondary-custom font-medium hover:text-primary-custom transition-colors">Adjust All</button>
              </div>
              <div className="space-y-3">
                {categoryRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/30 border border-white/40 hover:bg-white/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary-container/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">
                          {rule.category === 'Deep Work' ? 'code' : 'play_circle'}
                        </span>
                      </div>
                      <span className="font-medium text-primary-custom">{rule.domain}</span>
                    </div>
                    <select 
                      value={rule.category}
                      onChange={(e) => handleUpdateRuleCategory(rule.id, e.target.value)}
                      className="bg-white/20 border border-white/40 rounded-lg text-xs font-semibold uppercase text-primary-custom px-2 py-1.5 focus:outline-none"
                    >
                      <option value="Deep Work" className="text-black">Deep Focus</option>
                      <option value="Learning" className="text-black">Active Learning</option>
                      <option value="Casual" className="text-black">Leisure Browsing</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Security & Privacy */}
          <div className="lg:col-span-5 space-y-8">
            {/* Trust Shield */}
            <div className="glass-card p-8 bg-primary/5 border-primary/10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-4xl text-primary-custom" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <h2 className="text-2xl font-bold text-primary-custom mb-2">Trust Shield</h2>
                <p className="text-secondary-custom text-sm leading-relaxed max-w-[280px]">Your data is local, encrypted, and stays within your sanctuary. We have no eyes on your life.</p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={handleExportData}
                  className="w-full py-4 px-6 pastel-button flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export Settings Backup
                </button>
                <button 
                  onClick={handleExportActivityData}
                  className="w-full py-4 px-6 pastel-button flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export Activity as JSON
                </button>
                <button 
                  onClick={handleClearTodayActivity}
                  className="w-full py-4 px-6 pastel-button-rose flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">today</span>
                  Clear Today's Activity
                </button>
                <button 
                  onClick={handleClearAllActivity}
                  className="w-full py-4 px-6 pastel-button-rose flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">auto_delete</span>
                  Clear All Activity History
                </button>
                <button 
                  onClick={handleDeleteAllData}
                  className="w-full py-4 px-6 pastel-button-rose flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">delete_sweep</span>
                  Reset Everything
                </button>
              </div>
            </div>

            {/* Hidden Zones */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-custom">visibility_off</span>
                </div>
                <h2 className="text-xl font-bold text-primary-custom">Hidden Zones</h2>
              </div>
              <div className="space-y-6">
                <form onSubmit={handleAddSite} className="relative">
                  <input 
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    className="w-full px-6 py-4 pr-16 rounded-2xl inner-recessed focus:outline-none focus:ring-1 focus:ring-primary border-none placeholder:text-secondary-custom/55 text-primary-custom transition-all text-sm" 
                    placeholder="Add a site to ignore quietly..." 
                    type="text"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 pastel-button w-10 h-10 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </form>
                <div className="space-y-2">
                  {ignoredSites.map(site => (
                    <div key={site} className="flex items-center justify-between px-5 py-4 rounded-xl glass-card-sm border border-white/40">
                      <span className="text-sm font-medium text-primary-custom">{site}</span>
                      <button 
                        onClick={() => handleRemoveSite(site)}
                        className="material-symbols-outlined text-secondary-custom/60 hover:text-primary-custom transition-colors"
                      >
                        close
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary-custom">palette</span>
                </div>
                <h2 className="text-xl font-bold text-primary-custom">Ambiance</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setTheme('pastel')}
                  className={`flex flex-col items-center gap-3 p-2.5 rounded-2xl transition-all group relative ${
                    theme === 'pastel' ? 'active-card' : 'inactive-card'
                  }`}
                >
                  {theme === 'pastel' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#7CCBFF] to-[#A7DFFF] text-[8px] font-bold uppercase tracking-wider text-[#172033] shadow-sm z-10 border border-white/50">
                      Selected
                    </div>
                  )}
                  <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#e1e1f5] to-[#baeaff] shadow-inner"></div>
                  <span className={`text-xs font-bold ${
                    theme === 'pastel' ? 'text-primary-custom' : 'text-secondary-custom/70'
                  }`}>Pastel Light</span>
                </button>
                <button 
                  onClick={() => setTheme('dark-glass')}
                  className={`flex flex-col items-center gap-3 p-2.5 rounded-2xl transition-all group relative ${
                    theme === 'dark-glass' ? 'active-card' : 'inactive-card'
                  }`}
                >
                  {theme === 'dark-glass' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#7CCBFF] to-[#A7DFFF] text-[8px] font-bold uppercase tracking-wider text-[#172033] shadow-sm z-10 border border-white/50">
                      Selected
                    </div>
                  )}
                  <div className="w-full aspect-video rounded-xl bg-slate-900 shadow-inner"></div>
                  <span className={`text-xs font-bold ${
                    theme === 'dark-glass' ? 'text-primary-custom' : 'text-secondary-custom/70'
                  }`}>Dark Glass</span>
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center gap-3 p-2.5 rounded-2xl transition-all group relative ${
                    theme === 'system' ? 'active-card' : 'inactive-card'
                  }`}
                >
                  {theme === 'system' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#7CCBFF] to-[#A7DFFF] text-[8px] font-bold uppercase tracking-wider text-[#172033] shadow-sm z-10 border border-white/50">
                      Selected
                    </div>
                  )}
                  <div className="w-full aspect-video rounded-xl bg-gradient-to-tr from-gray-200 to-gray-400 shadow-inner"></div>
                  <span className={`text-xs font-bold ${
                    theme === 'system' ? 'text-primary-custom' : 'text-secondary-custom/70'
                  }`}>System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Quote */}
        <div className="mt-16 w-full h-[320px] rounded-[48px] overflow-hidden relative border border-white/40 shadow-xl group">
          <img 
            alt="Serene desktop" 
            className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-700 group-hover:scale-105" 
            src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-12">
            <div className="max-w-xl backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20">
              <p className="text-2xl font-semibold text-white italic mb-4 leading-snug">"Privacy is not a feature; it's the fundamental right that fuels human creativity."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/30 overflow-hidden bg-gray-200">
                  <img 
                    alt="LifeLink AI" 
                    className="w-full h-full object-cover" 
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=100&auto=format&fit=crop"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">LifeLink Core</p>
                  <p className="text-[10px] text-white/60 tracking-widest uppercase">Secured Node 4.2.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 flex flex-col items-center gap-8 max-w-7xl mx-auto px-container-padding-desktop text-center">
        <div className="w-24 h-px bg-primary/10"></div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-primary-custom">LifeLink</span>
          <span className="text-[10px] text-primary/30 font-bold tracking-widest border border-primary/10 px-2 py-0.5 rounded">INTEL</span>
        </div>
        <div className="flex flex-wrap justify-center gap-10">
          <a onClick={(e) => { e.preventDefault(); showToast('Opening Privacy Policy...'); }} className="text-sm font-medium text-secondary-custom hover:text-primary-custom transition-colors" href="#">Privacy First</a>
          <a onClick={(e) => { e.preventDefault(); showToast('Opening Terms of Service...'); }} className="text-sm font-medium text-secondary-custom hover:text-primary-custom transition-colors" href="#">Terms of Harmony</a>
          <a onClick={(e) => { e.preventDefault(); showToast('Opening Security Ledger audit...'); }} className="text-sm font-medium text-secondary-custom hover:text-primary-custom transition-colors" href="#">Security Ledger</a>
          <a onClick={(e) => { e.preventDefault(); showToast('Opening contact support channels...'); }} className="text-sm font-medium text-secondary-custom hover:text-primary-custom transition-colors" href="#">Reach Out</a>
        </div>
        <p className="text-xs text-muted-custom mt-4">
          © 2024 LifeLink Intelligence. Stored locally on this device.
        </p>
      </footer>

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

export default Settings;

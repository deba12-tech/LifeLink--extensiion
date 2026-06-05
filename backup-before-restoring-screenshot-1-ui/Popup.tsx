import React, { useEffect, useState } from 'react';
import { syncStorageItem } from '../utils/storage';
import { calculateAnalytics, formatDuration, ActivitySession } from '../lib/activityAnalytics';
import { classifyCategory } from '../lib/categoryClassifier';

const shouldIgnore = (url: string, ignoredSites: string[]): boolean => {
  if (!url) return true;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-search://') ||
    url === 'about:blank'
  ) {
    return true;
  }
  const domain = url.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0];
  return ignoredSites.includes(domain);
};

const Popup: React.FC = () => {
  const [time, setTime] = useState('12:45 PM');
  const [isPaused, setIsPaused] = useState(() => {
    const saved = localStorage.getItem('lifelinkSettings');
    if (saved) {
      try {
        return JSON.parse(saved).isPaused === true;
      } catch (e) {}
    }
    return false;
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Active theme configuration
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'pastel';
    return saved === 'midnight' ? 'dark-glass' : saved;
  });

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const active = currentTheme === 'dark-glass' || currentTheme === 'midnight' || 
      (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return active;
  });

  // Tracked activity sessions state
  const [sessions, setSessions] = useState<ActivitySession[]>(() => {
    const saved = localStorage.getItem('activitySessions');
    return saved ? JSON.parse(saved) : [];
  });

  // Current active tab state
  const [currentTab, setCurrentTab] = useState<{ title: string; url: string; domain: string; category: string } | null>(null);

  useEffect(() => {
    const updateDark = () => {
      const active = currentTheme === 'dark-glass' || currentTheme === 'midnight' || 
        (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkTheme(active);
    };
    updateDark();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDark);
    return () => mediaQuery.removeEventListener('change', updateDark);
  }, [currentTheme]);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('theme') || 'pastel';
      setCurrentTheme(savedTheme === 'midnight' ? 'dark-glass' : savedTheme);
      
      const savedSettings = localStorage.getItem('lifelinkSettings');
      if (savedSettings) {
        try {
          setIsPaused(JSON.parse(savedSettings).isPaused === true);
        } catch (e) {}
      }
      
      const savedSessions = localStorage.getItem('activitySessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
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
            if (key === 'activitySessions') {
              setSessions((newValue as ActivitySession[]) || []);
            } else if (key === 'theme') {
              const themeVal = (newValue as string) || 'pastel';
              setCurrentTheme(themeVal === 'midnight' ? 'dark-glass' : themeVal);
            } else if (key === 'lifelinkSettings') {
              if (newValue) {
                setIsPaused((newValue as any).isPaused === true);
              }
            }
          }
        }
      };
      chrome.storage.onChanged.addListener(handleChromeStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleChromeStorageChange);
    }
  }, []);

  // Query current tab
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          const tab = tabs[0];
          const cleanUrl = tab.url!;
          const domain = cleanUrl.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0];
          
          const savedRules = localStorage.getItem('category_rules');
          const rules = savedRules ? JSON.parse(savedRules) : [];
          const category = classifyCategory(domain, rules);
          
          const savedSettings = localStorage.getItem('lifelinkSettings');
          let ignoredSites: string[] = [];
          if (savedSettings) {
            try {
              ignoredSites = JSON.parse(savedSettings).blacklistedDomains || [];
            } catch (e) {}
          }
          
          if (!shouldIgnore(cleanUrl, ignoredSites)) {
            setCurrentTab({
              title: tab.title || domain,
              url: cleanUrl,
              domain: domain,
              category: category
            });
          }
        }
      });
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
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

  const handleTogglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    
    const saved = localStorage.getItem('lifelinkSettings');
    let currentSettings = {
      trackingEnabled: true,
      isPaused: nextState,
      pauseWhenIdle: true,
      ignoreSensitiveSites: true,
      blacklistedDomains: []
    };
    if (saved) {
      try {
        currentSettings = { ...JSON.parse(saved), isPaused: nextState };
      } catch (e) {}
    }
    syncStorageItem('lifelinkSettings', currentSettings);
    showToast(nextState ? 'Tracking Paused' : 'Tracking Resumed');
  };

  // Calculate live analytics
  const analytics = calculateAnalytics(sessions);
  const {
    totalActiveTime,
    deepWorkTime,
    learningTime,
    casualTime,
    focusScore
  } = analytics;

  const handleQuickReceipt = () => {
    const receiptText = `LifeLink Today's Receipt:\n- Deep Work: ${formatDuration(deepWorkTime)}\n- Learning: ${formatDuration(learningTime)}\n- Casual: ${formatDuration(casualTime)}\n- Focus Score: ${focusScore}%`;
    navigator.clipboard.writeText(receiptText)
      .then(() => showToast('Receipt summary copied to clipboard!'))
      .catch(() => showToast('Failed to copy receipt', 'error'));
  };

  const isEmpty = totalActiveTime === 0;

  const productivePct = totalActiveTime > 0 ? Math.round(((deepWorkTime + learningTime) / totalActiveTime) * 100) : 0;
  const distractionPct = totalActiveTime > 0 ? 100 - productivePct : 0;

  return (
    <div className={`app-bg relative flex flex-col text-primary-custom w-[380px] h-[520px] mx-auto overflow-hidden rounded-[28px] shadow-2xl p-0 ${isDarkTheme ? 'theme-dark-glass' : ''}`}>
      {/* Background Blobs (Dashboard Matching Gradient) */}
      <div className="liquid-blob bg-lavender w-72 h-72 -top-24 -left-20 rounded-full absolute"></div>
      <div className="liquid-blob bg-sky w-80 h-80 top-32 -right-24 rounded-full absolute" style={{ animationDelay: '-7s' }}></div>
      <div className="liquid-blob bg-peach w-64 h-64 bottom-0 left-4 rounded-full absolute" style={{ animationDelay: '-12s' }}></div>

      <header className="flex justify-between items-center px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-headline-lg text-[20px] font-bold tracking-tight text-on-surface">LifeLink</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-data-label text-[12px] text-secondary-custom/75">{time}</span>
          <button 
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              } else {
                window.open('options.html', '_blank');
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-pill hover:bg-white/60 transition-all group"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary-custom group-active:scale-90 transition-transform">settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 overflow-y-auto no-scrollbar pb-4 space-y-4 z-10">
        {isEmpty ? (
          <div className="glass-card-sm p-6 text-center flex flex-col items-center justify-center space-y-4 border border-white/50 my-2">
            <div className="w-12 h-12 rounded-full bg-sky/20 flex items-center justify-center text-secondary mb-1 border border-white/40">
              <span className="material-symbols-outlined text-2xl">analytics</span>
            </div>
            <h3 className="text-sm font-bold text-primary-custom">Your dashboard is quiet right now</h3>
            <p className="text-[11px] text-secondary-custom leading-normal max-w-[240px]">
              Start browsing and LifeLink will build your first digital receipt.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Focus Score */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full circular-progress-ring animate-in fade-in zoom-in duration-500" viewBox="0 0 100 100">
                  <circle className="progress-track" cx="50" cy="50" fill="transparent" r="45" strokeWidth="6"></circle>
                  <circle 
                    className="progress-bar" 
                    cx="50" 
                    cy="50" 
                    fill="transparent" 
                    r="45" 
                    strokeWidth="6" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * focusScore) / 100}
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display-lg text-[34px] leading-none text-primary-custom">{focusScore}%</span>
                  <span className="font-data-label text-[10px] uppercase tracking-[0.2em] mt-1 text-secondary-custom/75">Focus</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card-sm p-4 flex flex-col gap-1 border border-white/50">
                <span className="font-data-label text-[10px] text-secondary-custom uppercase">Deep Work</span>
                <span className="font-data-value text-secondary text-[16px]">{formatDuration(deepWorkTime)}</span>
              </div>
              <div className="glass-card-sm p-4 flex flex-col gap-1 border border-white/50">
                <span className="font-data-label text-[10px] text-secondary-custom uppercase">Drift Time</span>
                <span className="font-data-value text-orange-600 text-[16px]">{formatDuration(casualTime)}</span>
              </div>
            </div>

            {/* Current Activity Section */}
            <div className="glass-card-sm p-5 space-y-4 relative overflow-hidden border border-white/50">
              <div className="flex justify-between items-start">
                <div className="flex flex-col max-w-[200px]">
                  <span className="font-data-label text-[10px] text-secondary-custom uppercase mb-1">
                    {isPaused ? 'Tracking Paused' : 'Current Site'}
                  </span>
                  <span className="font-headline-lg text-[18px] font-bold text-primary-custom truncate">
                    {isPaused ? 'Paused' : (currentTab ? currentTab.domain : 'System Page')}
                  </span>
                </div>
                {!isPaused && currentTab && (
                  <div className="bg-sky/35 px-3 py-1 rounded-full border border-white/60">
                    <span className="font-data-label text-[10px] text-secondary-custom font-semibold">
                      {currentTab.category}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-data-label text-[10px] text-secondary-custom/80">Intensity Ratio</span>
                  <span className="font-data-label text-[10px] text-secondary-custom font-semibold">
                    {productivePct}% vs {distractionPct}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/30 rounded-full flex overflow-hidden border border-white/40">
                  <div className="h-full bg-sky" style={{ width: `${productivePct}%` }}></div>
                  <div className="h-full bg-peach" style={{ width: `${distractionPct}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-data-label opacity-60 tracking-wider">
                  <span>PRODUCTIVE</span>
                  <span>DISTRACTION</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleTogglePause}
              className={`h-11 flex items-center justify-center rounded-full active:scale-95 transition-all ${
                !isPaused 
                  ? 'active-pill' 
                  : 'inactive-pill'
              }`}
            >
              {!isPaused && <span className="material-symbols-outlined text-[16px] mr-1.5">check_circle</span>}
              <span className="font-body-md text-[13px] font-bold">
                {isPaused ? 'Resume Tracking' : 'Pause Tracking'}
              </span>
            </button>
            <button 
              onClick={() => {
                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                  chrome.tabs.create({ url: 'newtab.html' });
                } else {
                  window.open('newtab.html', '_blank');
                }
              }}
              className="pastel-button h-11 flex items-center justify-center active:scale-95 transition-all"
            >
              <span className="font-body-md text-[13px] font-bold text-primary-custom">Dashboard</span>
            </button>
          </div>
          <button 
            onClick={handleQuickReceipt} 
            className="pastel-button-secondary h-10 w-full flex items-center justify-center border-dashed border-[#172033]/30 hover:bg-white/80 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px] mr-2 text-primary-custom">analytics</span>
            <span className="font-data-label text-[11px] uppercase tracking-wider text-primary-custom">Quick Receipt</span>
          </button>
        </div>
      </main>

      {/* Footer with Microcopy */}
      <footer className="px-6 py-4 flex flex-col gap-2 items-center border-t border-white/20 z-10">
        <p className="font-body-md text-[11px] text-secondary-custom/75 text-center italic">
          Private by design. Stored on this device.
        </p>
        <div className="flex justify-between w-full opacity-50">
          <span className="font-data-label text-[9px] uppercase tracking-[0.2em]">LifeLink Spatial v1.2</span>
          <span onClick={() => showToast('Opening help desk support...')} className="font-data-label text-[9px] uppercase cursor-pointer hover:underline text-secondary-custom">Support</span>
        </div>
      </footer>

      {/* Reusable Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[100] px-4 py-2 rounded-full shadow-xl backdrop-blur-md border flex items-center gap-2 transform transition-all duration-300 ease-out animate-bounce ${
          toast.type === 'success' 
            ? 'bg-mint/90 border-white/70 text-green-900 shadow-md' 
            : 'bg-rose/90 border-white/70 text-red-900 shadow-md'
        }`}>
          <span className="material-symbols-outlined text-xs">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-[11px] font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Popup;

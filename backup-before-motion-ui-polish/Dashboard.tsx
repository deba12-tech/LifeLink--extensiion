import React, { useEffect, useState } from 'react';
import { syncStorageItem } from '../utils/storage';
import { calculateAnalytics, formatDuration, ActivitySession, getLocalDateString } from '../lib/activityAnalytics';
import { classifyCategory } from '../lib/categoryClassifier';

interface ContinueCardItem {
  id: string;
  title: string;
  url: string;
  fullUrl: string;
  type: string;
  img: string;
}

const getDomain = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

const Dashboard: React.FC = () => {
  const [time, setTime] = useState('12:45 PM');
  const [driftPos, setDriftPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Custom visual state hooks
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(() => localStorage.getItem('focusMode') === 'true');
  const [duplicateCount, setDuplicateCount] = useState(() => {
    const saved = localStorage.getItem('duplicate_count');
    return saved !== null ? parseInt(saved, 10) : 4;
  });
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completedLocal = localStorage.getItem('onboarding_completed') === 'true';
      if (completedLocal) {
        return;
      }
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('onboarding_completed', (res) => {
          if (res && res.onboarding_completed === true) {
            localStorage.setItem('onboarding_completed', 'true');
          } else {
            setShowOnboarding(true);
          }
        });
      } else {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastUpdated(formattedTime);
  }, [sessions]);

  // Real tabs tracking state for Tab Intelligence
  const [realTabsCount, setRealTabsCount] = useState(0);
  const [realDuplicateCount, setRealDuplicateCount] = useState(0);
  const [duplicateTabs, setDuplicateTabs] = useState<{ id?: number; title: string; url: string }[]>([]);
  const [openTabs, setOpenTabs] = useState<{ id?: number; title: string; url: string }[]>([]);

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

  // Listen for storage changes to synchronize settings (e.g. tracking toggle, theme, sessions)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('theme') || 'pastel';
      setCurrentTheme(saved === 'midnight' ? 'dark-glass' : saved);
      setIsFocusMode(localStorage.getItem('focusMode') === 'true');
      
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

  // Query real browser tabs
  const queryTabs = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({}, (tabs) => {
        setRealTabsCount(tabs.length);
        
        // Find duplicates
        const urlCounts: Record<string, number> = {};
        const duplicates: { id?: number; title: string; url: string }[] = [];
        tabs.forEach(tab => {
          if (tab.url) {
            const cleanUrl = tab.url.split('#')[0].split('?')[0];
            urlCounts[cleanUrl] = (urlCounts[cleanUrl] || 0) + 1;
            if (urlCounts[cleanUrl] > 1) {
              duplicates.push({ id: tab.id, title: tab.title || '', url: tab.url });
            }
          }
        });
        setRealDuplicateCount(duplicates.length);
        setDuplicateTabs(duplicates);
      });

      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        setOpenTabs(tabs.slice(0, 5).map(t => ({ id: t.id, title: t.title || '', url: t.url || '' })));
      });
    }
  };

  useEffect(() => {
    queryTabs();
  }, []);

  // Calculate live analytics
  const analytics = calculateAnalytics(sessions);
  const {
    totalActiveTime,
    deepWorkTime,
    learningTime,
    casualTime,
    focusScore,
    topWebsites,
    categoryBreakdown,
    hourlySlots,
    mainCategory,
    todaySessionsCount
  } = analytics;

  const isEmpty = sessions.length === 0;

  const handleToggleFocusMode = () => {
    const nextState = !isFocusMode;
    setIsFocusMode(nextState);
    syncStorageItem('focusMode', nextState);
    showToast(nextState ? 'Focus Mode Enabled!' : 'Focus Mode Disabled!');
  };

  const handleCopySummary = () => {
    const summaryText = `SYSTEM AUDIT - INTERNET RECEIPT:\n- Deep Work: ${formatDuration(deepWorkTime)}\n- Learning: ${formatDuration(learningTime)}\n- Casual: ${formatDuration(casualTime)}\nTOTAL FOCUS: ${focusScore}/100`;
    navigator.clipboard.writeText(summaryText)
      .then(() => showToast('Receipt summary copied to clipboard!'))
      .catch(() => showToast('Failed to copy summary', 'error'));
  };

  const handleSaveReceipt = () => {
    const receiptData = {
      sessionId: `LF-${Date.now().toString().slice(-3)}`,
      terminal: '04',
      date: new Date().toLocaleDateString(),
      totalFocus: focusScore,
      metrics: [
        { category: 'Deep Work', time: formatDuration(deepWorkTime) },
        { category: 'Learning', time: formatDuration(learningTime) },
        { category: 'Casual', time: formatDuration(casualTime) }
      ]
    };
    syncStorageItem('saved_receipt', receiptData);
    showToast('Receipt saved to local storage!');
  };

  const handleOpenCard = (card: ContinueCardItem) => {
    showToast(`Opening ${card.title}...`);
    window.open(card.fullUrl, '_blank');
  };

  const handleCloseDuplicates = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.remove) {
      const tabIds = duplicateTabs.map(t => t.id).filter((id): id is number => id !== undefined);
      if (tabIds.length > 0) {
        chrome.tabs.remove(tabIds, () => {
          setRealDuplicateCount(0);
          setDuplicateTabs([]);
          showToast(`${tabIds.length} duplicate tabs closed successfully!`);
          queryTabs();
        });
      } else {
        showToast('No duplicate tabs to close.');
      }
    } else {
      setDuplicateCount(0);
      syncStorageItem('duplicate_count', 0);
      showToast('All duplicate tabs closed successfully!');
    }
  };

  const handleSaveSession = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const activeTabsSession = tabs.map(t => ({ title: t.title || '', url: t.url || '' }));
        syncStorageItem('saved_tab_session', {
          timestamp: new Date().toISOString(),
          tabsCount: activeTabsSession.length,
          tabs: activeTabsSession
        });
        showToast('Tab session state saved successfully!');
      });
    } else {
      const activeTabsSession = [
        { title: 'React animation article', url: 'https://framer-motion.dev' },
        { title: 'YouTube tutorial', url: 'https://youtube.com' },
        { title: 'GitHub repo: Kodeye', url: 'https://github.com/debangan/kodeye' },
        { title: 'Portfolio inspiration', url: 'https://awwwards.com/sites' }
      ];
      syncStorageItem('saved_tab_session', {
        timestamp: new Date().toISOString(),
        tabsCount: activeTabsSession.length,
        tabs: activeTabsSession
      });
      showToast('Tab session state saved successfully!');
    }
  };

  const handleSmartArchive = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const result = localStorage.getItem('category_rules');
      const rules = result ? JSON.parse(result) : [];
      
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const tabsToClose: number[] = [];
        tabs.forEach(tab => {
          if (tab.url && !tab.active) {
            const domain = getDomain(tab.url);
            const category = classifyCategory(domain, rules);
            if (category === 'Casual') {
              if (tab.id !== undefined) {
                tabsToClose.push(tab.id);
              }
            }
          }
        });

        if (tabsToClose.length > 0) {
          chrome.tabs.remove(tabsToClose, () => {
            showToast(`Archived ${tabsToClose.length} casual tabs to workspace!`);
            queryTabs();
          });
        } else {
          showToast('No background casual tabs to archive.');
        }
      });
    } else {
      showToast('Archived non-focus tabs to workspace!');
    }
  };

  const handleCompleteOnboarding = (goToSettings: boolean) => {
    localStorage.setItem('onboarding_completed', 'true');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ onboarding_completed: true });
    }
    setShowOnboarding(false);
    
    if (goToSettings) {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('options.html', '_blank');
      }
    } else {
      showToast('Welcome to LifeLink! Tracking is active.');
    }
  };

  const initialContinueCards: ContinueCardItem[] = [
    { id: '1', title: 'React animation article', url: 'framer-motion.dev', fullUrl: 'https://framer-motion.dev', type: 'Article', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop' },
    { id: '2', title: 'YouTube tutorial', url: 'youtube.com/design-course', fullUrl: 'https://youtube.com', type: 'Video', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=300&auto=format&fit=crop' },
    { id: '3', title: 'GitHub repo: Kodeye', url: 'github.com/debangan/kodeye', fullUrl: 'https://github.com', type: 'Code', img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=300&auto=format&fit=crop' },
    { id: '4', title: 'Portfolio inspiration', url: 'awwwards.com/sites', fullUrl: 'https://awwwards.com', type: 'Design', img: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=300&auto=format&fit=crop' }
  ];

  const getContinueCardsFromSessions = (): ContinueCardItem[] => {
    const seenUrls = new Set<string>();
    const uniqueSessions: ActivitySession[] = [];
    const sorted = [...sessions].sort((a, b) => b.endTime - a.endTime);
    
    for (const s of sorted) {
      if (!seenUrls.has(s.url)) {
        seenUrls.add(s.url);
        uniqueSessions.push(s);
      }
      if (uniqueSessions.length >= 4) break;
    }
    
    if (uniqueSessions.length === 0) {
      return [];
    }

    const categoryImages: Record<string, string> = {
      'Deep Work': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=300&auto=format&fit=crop',
      'Learning': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=300&auto=format&fit=crop',
      'Casual': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=300&auto=format&fit=crop'
    };

    return uniqueSessions.map((s, index) => {
      const displayUrl = s.url.replace('https://', '').replace('http://', '').replace('www.', '');
      return {
        id: s.id || `card-${index}-${s.startTime}`,
        title: s.title || s.domain,
        url: displayUrl.length > 30 ? displayUrl.substring(0, 30) + '...' : displayUrl,
        fullUrl: s.url,
        type: s.category,
        img: categoryImages[s.category] || categoryImages['Casual']
      };
    });
  };

  const continueCards = getContinueCardsFromSessions();
  const displayCards = continueCards.length > 0 ? continueCards : initialContinueCards;

  const filteredCards = displayCards.filter(card => 
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayTabsCount = typeof chrome !== 'undefined' && chrome.tabs ? realTabsCount : 19 + duplicateCount;
  const displayDuplicateCount = typeof chrome !== 'undefined' && chrome.tabs ? realDuplicateCount : duplicateCount;

  // Pie chart path and offset math
  const learningPct = totalActiveTime > 0 ? Math.round((learningTime / totalActiveTime) * 100) : 0;
  const deepPct = totalActiveTime > 0 ? Math.round((deepWorkTime / totalActiveTime) * 100) : 0;
  const casualPct = totalActiveTime > 0 ? (100 - learningPct - deepPct) : 0;

  const uniqueDomains = Array.from(new Set(sessions.filter(s => s.date === getLocalDateString()).map(s => s.domain))).length;

  if (isLoading) {
    return (
      <div className={`app-bg min-h-screen flex flex-col relative px-6 md:px-container-padding-desktop pb-12 overflow-hidden ${isDarkTheme ? 'theme-dark-glass' : ''}`}>
        <div className="liquid-blob w-[600px] h-[600px] bg-lavender top-[-200px] left-[-100px]" />
        <div className="liquid-blob w-[500px] h-[500px] bg-rose bottom-[-100px] right-[-50px]" />
        <div className="liquid-blob w-[450px] h-[450px] bg-sky top-[30%] right-[15%]" />
        
        <main className="w-full max-w-7xl mx-auto flex flex-col relative z-10 items-center justify-center flex-1 min-h-[85vh]">
          <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6 text-center max-w-md w-full border border-white/50 shadow-2xl">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-primary-custom tracking-tight">Syncing attention database...</h3>
              <p className="text-sm text-secondary-custom">LifeLink is loading your local metrics securely.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-bg min-h-screen flex flex-col relative px-6 md:px-container-padding-desktop pb-12 overflow-hidden selection:bg-secondary/10 ${isDarkTheme ? 'theme-dark-glass' : ''}`}>
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
      <div 
        className="liquid-blob w-[350px] h-[350px] bg-mint bottom-[15%] left-[10%] transition-transform duration-300 ease-out" 
        style={{ 
          transform: `translate(${driftPos.x * 0.8}px, ${driftPos.y * 0.8}px)`,
          animationDelay: '-4s' 
        }}
      />
      <div 
        className="liquid-blob w-[400px] h-[400px] bg-peach top-[10%] right-[40%] transition-transform duration-300 ease-out" 
        style={{ 
          transform: `translate(${driftPos.x * 1.2}px, ${driftPos.y * 1.2}px)`,
          animationDelay: '-18s' 
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
            <a className="text-primary-custom font-semibold px-4 py-2 relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-primary" href="newtab.html">Dashboard</a>
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="popup.html">Extension Popup</a>
            <a className="text-secondary-custom hover:text-primary-custom transition-colors px-4 py-2" href="options.html">Settings</a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <div className="w-full inner-recessed rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/30 focus-within:bg-white/40 transition-all">
              <span className="material-symbols-outlined text-secondary-custom" style={{ fontSize: '18px' }}>search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full text-xs placeholder:text-secondary-custom/60 text-primary-custom" 
                placeholder="Search history, tabs..." 
                type="text"
              />
            </div>
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

        {/* Hero Section */}
        <section className="mb-element-gap">
          <div className="glass-card p-10 flex flex-col md:flex-row items-center justify-between gap-12 group hover:shadow-2xl transition-all duration-500">
            <div className="space-y-6 max-w-xl text-center md:text-left">
              <div className="inline-block px-3 py-1 glass-pill text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-custom">
                Digital Day Overview {lastUpdated && `• Sync ${lastUpdated}`}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-custom tracking-tight">Good evening, Debangan</h1>
              <div className="space-y-2">
                <p className="text-lg text-secondary-custom leading-relaxed">
                  {isEmpty ? (
                    <span>Welcome to LifeLink! Start browsing to build your first digital receipt and analyze your focus score.</span>
                  ) : (
                    <span>Your browser focus score today is <span className="text-secondary font-bold">{focusScore}%</span>. You spent {formatDuration(totalActiveTime)} online across various projects.</span>
                  )}
                </p>
              </div>
            </div>
            {/* Premium Progress Ring */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-white/40" cx="104" cy="104" fill="transparent" r="88" stroke="currentColor" strokeWidth="12"></circle>
                <circle 
                  className="text-secondary transition-all duration-1000 ease-out" 
                  cx="104" 
                  cy="104" 
                  fill="transparent" 
                  r="88" 
                  stroke="currentColor" 
                  strokeDasharray="552.92" 
                  strokeDashoffset={isEmpty ? 552.92 : (552.92 - (552.92 * focusScore) / 100)} 
                  strokeLinecap="round" 
                  strokeWidth="12"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-primary-custom">{isEmpty ? '0' : focusScore}</span>
                <span className="text-[10px] font-bold text-secondary-custom uppercase tracking-widest mt-1">Focus Score</span>
              </div>
            </div>
          </div>
        </section>

        {/* Overview Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-element-gap">
          <div className="glass-card-sm p-6 group hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-lavender/50 flex items-center justify-center text-primary-custom mb-4 border border-white/40">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>timer</span>
            </div>
            <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Active Time</p>
            <p className="text-2xl font-bold text-primary-custom">{formatDuration(totalActiveTime)}</p>
          </div>
          <div className="glass-card-sm p-6 group hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-mint/50 flex items-center justify-center text-primary-custom mb-4 border border-white/40">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bolt</span>
            </div>
            <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Deep Focus</p>
            <p className="text-2xl font-bold text-primary-custom">{formatDuration(deepWorkTime)}</p>
          </div>
          <div className="glass-card-sm p-6 group hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-peach/50 flex items-center justify-center text-primary-custom mb-4 border border-white/40">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>explore</span>
            </div>
            <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Leisure Time</p>
            <p className="text-2xl font-bold text-primary-custom">{formatDuration(casualTime)}</p>
          </div>
          <div className="glass-card-sm p-6 group hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-sky/50 flex items-center justify-center text-primary-custom mb-4 border border-white/40">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>school</span>
            </div>
            <p className="text-[10px] font-bold text-secondary-custom uppercase tracking-wider mb-1">Top Category</p>
            <p className="text-2xl font-bold text-primary-custom">
              {isEmpty ? 'None' : (mainCategory === 'Casual' ? 'Leisure' : mainCategory === 'Learning' ? 'Active Learning' : 'Deep Focus')}
            </p>
          </div>
        </section>

        {/* Main Content Layout */}
        {isEmpty ? (
          <section className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-5 border border-white/50 mb-element-gap relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lavender via-sky to-peach opacity-80"></div>
            <div className="w-16 h-16 rounded-2xl bg-sky/15 flex items-center justify-center text-secondary mb-2 border border-white/40 shadow-sm animate-pulse">
              <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
            </div>
            <h3 className="text-xl font-bold text-primary-custom tracking-tight">Your attention dashboard is empty</h3>
            <p className="text-sm text-secondary-custom max-w-md leading-relaxed">
              No local browsing logs detected for today. Once you browse the web (e.g. GitHub, YouTube, or general sites), LifeLink will automatically generate your spatial charts and daily internet receipt here.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="glass-pill px-4 py-2 text-xs font-bold text-secondary-custom hover:bg-white/40 hover:text-primary-custom transition-all flex items-center gap-1.5 border border-white/40">
                <span className="material-symbols-outlined text-xs">code</span> Browse GitHub
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="glass-pill px-4 py-2 text-xs font-bold text-secondary-custom hover:bg-white/40 hover:text-primary-custom transition-all flex items-center gap-1.5 border border-white/40">
                <span className="material-symbols-outlined text-xs">play_circle</span> Browse YouTube
              </a>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-element-gap mb-element-gap">
            {/* Left Side: Attention & Flow */}
            <div className="lg:col-span-8 flex flex-col gap-element-gap">
              {/* Attention Breakdown */}
              <div className="glass-card p-8">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-xl font-bold text-primary-custom">Where your attention went</h2>
                  <button onClick={() => showToast('Opening Attention Details breakdown...')} className="material-symbols-outlined text-secondary-custom hover:text-primary-custom transition-colors">more_horiz</button>
                </div>
                <div className="flex flex-col md:flex-row gap-16 items-center">
                  <div className="relative w-48 h-48 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="4"></circle>
                      {learningPct > 0 && (
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#A7DFFF" strokeDasharray={`${learningPct}, 100`} strokeDashoffset="0" strokeLinecap="round" strokeWidth="4"></path>
                      )}
                      {deepPct > 0 && (
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#C7B8FF" strokeDasharray={`${deepPct}, 100`} strokeDashoffset={`-${learningPct}`} strokeLinecap="round" strokeWidth="4"></path>
                      )}
                      {casualPct > 0 && (
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FFD6BA" strokeDasharray={`${casualPct}, 100`} strokeDashoffset={`-${learningPct + deepPct}`} strokeLinecap="round" strokeWidth="4"></path>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xs font-bold text-secondary-custom uppercase">Categories</span>
                      <span className="text-xl font-bold text-primary-custom">{uniqueDomains > 0 ? `${uniqueDomains} Sites` : '3 Categories'}</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky"></div>
                        <span className="text-sm font-medium text-secondary-custom">Active Learning</span>
                      </div>
                      <span className="text-sm font-bold text-primary-custom">{learningPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-lavender"></div>
                        <span className="text-sm font-medium text-secondary-custom">Deep Focus</span>
                      </div>
                      <span className="text-sm font-bold text-primary-custom">{deepPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-peach"></div>
                        <span className="text-sm font-medium text-secondary-custom">Leisure Browsing</span>
                      </div>
                      <span className="text-sm font-bold text-primary-custom">{casualPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Websites */}
              <div className="glass-card p-8 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-primary-custom">Top Websites</h2>
                  <span className="text-xs font-bold text-secondary-custom uppercase tracking-wider">Today's Duration</span>
                </div>
                {topWebsites && topWebsites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topWebsites.map((site, idx) => {
                      const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${site.domain}`;
                      return (
                        <div key={site.domain} className="flex items-center justify-between p-4 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/5 rounded-2xl hover:bg-white/45 dark:hover:bg-white/10 transition-all duration-300">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img 
                                src={faviconUrl} 
                                alt={site.domain} 
                                className="w-6 h-6 object-contain animate-fade-in"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLElement).parentElement;
                                  if (parent && !parent.querySelector('.fallback-letter')) {
                                    const fallbackSpan = document.createElement('span');
                                    fallbackSpan.className = 'fallback-letter font-bold text-sm text-secondary-custom dark:text-secondary uppercase';
                                    fallbackSpan.innerText = site.domain.charAt(0);
                                    parent.appendChild(fallbackSpan);
                                  }
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-primary-custom truncate">{site.domain}</p>
                              <p className="text-[10px] text-secondary-custom uppercase tracking-wider mt-0.5">Rank #{idx + 1}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-secondary">{formatDuration(site.duration)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-secondary-custom text-sm font-semibold">
                    No top websites recorded today.
                  </div>
                )}
              </div>

              {/* Attention Flow */}
              <div className="glass-card p-8">
                <h2 className="text-xl font-bold text-primary-custom mb-8">Attention Flow</h2>
                <div className="space-y-6">
                  <div className="relative h-14 inner-recessed rounded-2xl overflow-hidden flex p-1 gap-1">
                    {hourlySlots.map((slot, idx) => {
                      const pct = totalActiveTime > 0 ? (slot.value / totalActiveTime) * 100 : 25;
                      const bgColors = [
                        'bg-sky/35 border-sky/40 text-sky-700',
                        'bg-lavender/35 border-lavender/40 text-purple-700',
                        'bg-peach/35 border-peach/40 text-orange-700',
                        'bg-mint/35 border-mint/40 text-green-700'
                      ];
                      return (
                        <div 
                          key={slot.name}
                          className={`h-full rounded-xl flex items-center px-3 border transition-all ${bgColors[idx % 4]}`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                          title={`${slot.label}: ${formatDuration(slot.value)}`}
                        >
                          {pct > 15 && (
                            <span className="text-[9px] uppercase font-bold tracking-wider truncate">
                              {slot.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-muted-custom px-2 uppercase tracking-widest opacity-80">
                    <span>09:00 AM</span>
                    <span>12:00 PM</span>
                    <span>03:00 PM</span>
                    <span>06:00 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Internet Receipt */}
            <div className="lg:col-span-4">
              <div className="glass-card p-8 h-full shadow-2xl relative overflow-hidden flex flex-col transform hover:rotate-1 transition-transform duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-secondary opacity-25"></div>
                <div className="text-center mb-10">
                  <p className="mono-font text-[10px] font-bold uppercase tracking-[0.3em] text-secondary-custom mb-2">SYSTEM AUDIT — {new Date().getFullYear()}</p>
                  <h3 className="mono-font text-xl font-bold text-primary-custom">INTERNET RECEIPT</h3>
                  <p className="mono-font text-[9px] text-muted-custom mt-1">SESSION_ID: LF-{Date.now().toString().slice(-3)} // TERMINAL_04</p>
                </div>
                <div className="flex-1 space-y-6 mono-font text-xs uppercase text-primary-custom">
                  {deepWorkTime > 0 && (
                    <div className="flex justify-between items-end receipt-dashed pb-2">
                      <span>Deep Focus</span>
                      <span className="font-bold">{formatDuration(deepWorkTime)}</span>
                    </div>
                  )}
                  {learningTime > 0 && (
                    <div className="flex justify-between items-end receipt-dashed pb-2">
                      <span>Active Learning</span>
                      <span className="font-bold">{formatDuration(learningTime)}</span>
                    </div>
                  )}
                  {casualTime > 0 && (
                    <div className="flex justify-between items-end receipt-dashed pb-2">
                      <span>Leisure Browsing</span>
                      <span className="font-bold">{formatDuration(casualTime)}</span>
                    </div>
                  )}
                  {totalActiveTime === 0 && (
                    <div className="flex justify-between items-end receipt-dashed pb-2">
                      <span>No Activity</span>
                      <span className="font-bold">0m</span>
                    </div>
                  )}
                </div>

                {/* Functional Copy / Save receipt elements */}
                <div className="flex gap-2 justify-center mt-6">
                  <button 
                    onClick={handleCopySummary} 
                    className="glass-pill px-3 py-1.5 text-[10px] uppercase font-bold text-secondary-custom hover:bg-white/40 transition-all flex items-center gap-1 border border-white/40"
                  >
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'wght' 600" }}>content_copy</span> Copy Summary
                  </button>
                  <button 
                    onClick={handleSaveReceipt} 
                    className="glass-pill px-3 py-1.5 text-[10px] uppercase font-bold text-secondary-custom hover:bg-white/40 transition-all flex items-center gap-1 border border-white/40"
                  >
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'wght' 600" }}>save</span> Save Receipt
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-dashed border-primary/10">
                  <div className="flex justify-between items-center mb-6">
                    <span className="mono-font text-base font-bold text-primary-custom">TOTAL FOCUS</span>
                    <span className="mono-font text-2xl font-bold text-secondary">{focusScore}/100</span>
                  </div>
                  <p className="mono-font text-[9px] text-center text-secondary-custom italic">Mindful browsing session completed.<br/>LifeLink Spatial Intelligence.</p>
                  <div className="flex justify-center mt-6">
                    <div className="w-full h-10 flex justify-center gap-1 opacity-20 scale-y-125">
                      <div className="bg-primary w-1 h-full"></div><div className="bg-primary w-0.5 h-full"></div><div className="bg-primary w-2 h-full"></div><div className="bg-primary w-0.5 h-full"></div><div className="bg-primary w-1.5 h-full"></div><div className="bg-primary w-0.5 h-full"></div><div className="bg-primary w-3 h-full"></div><div className="bg-primary w-1 h-full"></div><div className="bg-primary w-0.5 h-full"></div><div className="bg-primary w-2 h-full"></div><div className="bg-primary w-0.5 h-full"></div><div className="bg-primary w-1 h-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Continue Section */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-primary-custom mb-8">Pick up where you left off</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <div 
                  key={card.id}
                  onClick={() => handleOpenCard(card)}
                  className="glass-card-sm p-4 group cursor-pointer hover:bg-white/50 transition-all hover:shadow-lg animate-fade-in"
                >
                  <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4 relative bg-white/20">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      src={card.img}
                      alt={card.title}
                    />
                    <div className="absolute top-2 right-2 px-2 py-1 glass-pill text-[9px] font-bold text-primary-custom uppercase">
                      {card.type === 'Deep Work' ? 'Deep Focus' : card.type === 'Learning' ? 'Active Learning' : card.type === 'Casual' ? 'Leisure' : card.type}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary-custom mb-1 truncate">{card.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=32&domain=${getDomain(card.fullUrl)}`} 
                        alt="" 
                        className="w-3.5 h-3.5 object-contain rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <p className="text-[11px] text-secondary-custom truncate">{card.url}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-secondary-custom text-sm font-semibold glass-card-sm">
                No matching tabs, history, or insights found for "{searchQuery}"
              </div>
            )}
          </div>
        </section>

        {/* Tab Intelligence */}
        <section className="mt-12 glass-card p-10 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-sky/30 border border-white/50 rounded-3xl flex items-center justify-center text-secondary flex-shrink-0">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary-custom mb-1">Tab Intelligence</h2>
                <p className="text-secondary-custom">Your digital workspace is lean and optimized.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-white/40 border border-white/60 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-bold text-primary-custom leading-tight">{displayTabsCount}</p>
                <p className="text-[9px] font-bold text-secondary-custom uppercase tracking-wider mt-1">Total</p>
              </div>
              <div className="px-6 py-4 bg-white/40 border border-white/60 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-bold text-rose leading-tight">{displayDuplicateCount}</p>
                <p className="text-[9px] font-bold text-secondary-custom uppercase tracking-wider mt-1">Duplicates</p>
              </div>
              <div className="px-6 py-4 bg-white/40 border border-white/60 rounded-2xl text-center min-w-[100px]">
                <p className="text-2xl font-bold text-secondary leading-tight">7</p>
                <p className="text-[9px] font-bold text-secondary-custom uppercase tracking-wider mt-1">Projects</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsReviewPanelOpen(true)}
                className="pastel-button-secondary px-6 py-4 font-bold text-sm"
              >
                Review Tabs
              </button>
              <button 
                onClick={handleSmartArchive}
                className="pastel-button px-6 py-4 font-bold text-sm"
              >
                Smart Archive
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center py-10 text-muted-custom border-t border-primary/5 mt-auto">
          <div className="mono-font text-[10px] uppercase tracking-[0.3em] mb-4 md:mb-0">© 2024 LifeLink Spatial — V2.4 • Local Sandbox Storage • No Cloud Sync</div>
          <div className="flex gap-10">
            <a className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="privacy.html">Privacy</a>
            <a onClick={(e) => { e.preventDefault(); showToast('Opening Terms of Service...'); }} className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="#">Terms</a>
            <a onClick={(e) => { e.preventDefault(); showToast('Opening System Status dashboard...'); }} className="mono-font text-[10px] uppercase tracking-widest hover:text-primary-custom transition-colors" href="#">System Status</a>
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

      {/* Tab Intelligence Review Modal Drawer */}
      {isReviewPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsReviewPanelOpen(false)}
              className="absolute top-4 right-4 text-secondary-custom hover:text-primary-custom focus:outline-none"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div>
              <h3 className="text-xl font-bold text-primary-custom">Tab Intelligence Review</h3>
              <p className="text-sm text-secondary-custom mt-1">Review active tabs and duplicate sessions observed locally.</p>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              {/* Duplicate tabs list */}
              {displayDuplicateCount > 0 ? (
                <div>
                  <p className="text-xs font-bold text-rose uppercase tracking-wider mb-2">Duplicate Tabs ({displayDuplicateCount})</p>
                  <div className="space-y-2">
                    {typeof chrome !== 'undefined' && chrome.tabs ? (
                      duplicateTabs.map((dt, idx) => (
                        <div key={idx} className="glass-card-sm p-3 flex justify-between items-center text-xs text-primary-custom">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={`https://www.google.com/s2/favicons?sz=32&domain=${getDomain(dt.url)}`} 
                              alt="" 
                              className="w-3.5 h-3.5 object-contain rounded-sm flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="truncate max-w-[240px]">{dt.title || dt.url}</span>
                          </div>
                          <span className="text-[10px] text-red-600 font-semibold uppercase bg-rose/40 px-2 py-0.5 rounded border border-white/30 flex-shrink-0">Duplicate</span>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-2">
                        <div className="glass-card-sm p-3 flex justify-between items-center text-xs text-primary-custom">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={`https://www.google.com/s2/favicons?sz=32&domain=framer-motion.dev`} 
                              alt="" 
                              className="w-3.5 h-3.5 object-contain rounded-sm flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="truncate max-w-[240px]">React animation article — framer-motion.dev</span>
                          </div>
                          <span className="text-[10px] text-red-600 font-semibold uppercase bg-rose/40 px-2 py-0.5 rounded border border-white/30 flex-shrink-0">Duplicate</span>
                        </div>
                        <div className="glass-card-sm p-3 flex justify-between items-center text-xs text-primary-custom">
                          <div className="flex items-center gap-2 min-w-0">
                            <img 
                              src={`https://www.google.com/s2/favicons?sz=32&domain=youtube.com`} 
                              alt="" 
                              className="w-3.5 h-3.5 object-contain rounded-sm flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="truncate max-w-[240px]">YouTube tutorial — youtube.com</span>
                          </div>
                          <span className="text-[10px] text-red-600 font-semibold uppercase bg-rose/40 px-2 py-0.5 rounded border border-white/30 flex-shrink-0">Duplicate</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-700 font-semibold flex items-center gap-2 bg-mint/30 border border-white/40 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  No duplicate tabs found. Workspace is optimized!
                </div>
              )}

              {/* Current Active Session List */}
              <div className="pt-2">
                <p className="text-xs font-bold text-sky uppercase tracking-wider mb-2">Active Tab Session ({displayTabsCount} Tabs)</p>
                <div className="space-y-2 text-xs text-primary-custom">
                  {typeof chrome !== 'undefined' && chrome.tabs && openTabs.length > 0 ? (
                    openTabs.map((t, idx) => (
                      <div key={idx} className="glass-card-sm p-3 flex items-center gap-2">
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=32&domain=${getDomain(t.url)}`} 
                          alt="" 
                          className="w-3.5 h-3.5 object-contain rounded-sm flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="truncate block max-w-full">{t.title || t.url}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="glass-card-sm p-3">
                        <span>React animation article — framer-motion.dev</span>
                      </div>
                      <div className="glass-card-sm p-3">
                        <span>GitHub repo: Kodeye — github.com/debangan/kodeye</span>
                      </div>
                      <div className="glass-card-sm p-3">
                        <span>Portfolio inspiration — awwwards.com/sites</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {displayDuplicateCount > 0 && (
                <button 
                  onClick={handleCloseDuplicates}
                  className="pastel-button-rose px-4 py-2.5 text-xs font-bold flex-1"
                >
                  Close Duplicates
                </button>
              )}
              <button 
                onClick={handleSaveSession}
                className="pastel-button px-4 py-2.5 text-xs font-bold flex-1"
              >
                Save Session
              </button>
              <button 
                onClick={() => setIsReviewPanelOpen(false)}
                className="pastel-button-secondary px-4 py-2.5 text-xs font-bold flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-time Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-card max-w-lg w-full p-10 space-y-8 relative overflow-hidden border border-white/50 shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {/* Background Blobs inside card for depth */}
            <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-lavender/25 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-sky/20 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Header Icon */}
            <div className="w-20 h-20 bg-primary rounded-[28px] flex items-center justify-center text-white shadow-[0_10px_25px_rgba(23,32,51,0.15)] relative z-10">
              <span className="material-symbols-outlined text-4xl">all_inclusive</span>
            </div>

            {/* Content Text */}
            <div className="space-y-4 relative z-10">
              <h2 className="text-3xl font-bold text-primary-custom tracking-tight">Welcome to LifeLink</h2>
              <p className="text-sm text-secondary-custom leading-relaxed">
                LifeLink helps you understand and nurture your browser activity with an aesthetic focus score, real-time attention flow timeline, and a daily internet receipt.
              </p>
              
              {/* Feature Highlights Recess */}
              <div className="grid grid-cols-1 gap-3 text-left pt-2">
                <div className="flex items-center gap-3 p-3 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-sky text-lg">donut_large</span>
                  <span className="text-xs font-semibold text-primary-custom">Aesthetic focus scores &amp; charts</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-lavender text-lg">timeline</span>
                  <span className="text-xs font-semibold text-primary-custom">Real-time foreground attention flow</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/5 rounded-2xl">
                  <span className="material-symbols-outlined text-peach text-lg">receipt_long</span>
                  <span className="text-xs font-semibold text-primary-custom">Memorable spatial daily internet receipts</span>
                </div>
              </div>

              {/* Privacy Note */}
              <div className="flex items-center justify-center gap-2 p-3 bg-mint/15 text-green-950 rounded-2xl border border-white/40 text-xs font-medium mt-4">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span>Privacy-First: All activity history is stored locally on this device.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10 pt-2">
              <button 
                onClick={() => handleCompleteOnboarding(false)}
                className="pastel-button py-4 px-6 font-bold text-sm flex-1 flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                Start Tracking
              </button>
              <button 
                onClick={() => handleCompleteOnboarding(true)}
                className="pastel-button-secondary py-4 px-6 font-bold text-sm flex-1 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">settings</span>
                Open Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

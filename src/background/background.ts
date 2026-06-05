// src/background/background.ts

import { classifyCategory } from '../lib/categoryClassifier';
import { getLocalDateString, ActivitySession } from '../lib/activityAnalytics';

console.log("LifeLink background loaded with message listener");

export const ACTIVITY_RETENTION_DAYS = 90;

let sessionQueue = Promise.resolve();

export async function pruneOldSessions(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }
  return new Promise<void>((resolve, reject) => {
    sessionQueue = sessionQueue.then(async () => {
      try {
        const result = await chrome.storage.local.get('activitySessions');
        const sessions = (result.activitySessions as ActivitySession[]) || [];
        const cutoffTime = Date.now() - (ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        
        // Prune fake debug sessions AND sessions older than retention days
        const prunedSessions = sessions.filter(s => 
          s && 
          s.source !== "debug" && 
          s.title !== "Debug Test" && 
          s.endTime >= cutoffTime
        );
        
        if (prunedSessions.length !== sessions.length) {
          await chrome.storage.local.set({ activitySessions: prunedSessions });
          console.log(`[LifeLink] Pruned ${sessions.length - prunedSessions.length} sessions (debug/older than ${ACTIVITY_RETENTION_DAYS} days).`);
        }
      } catch (error) {
        console.error("[LifeLink] Failed to prune old sessions:", error);
      }
    }).then(resolve, reject);
  });
}




interface CategoryRule {
  id: string;
  domain: string;
  category: string;
}

let cachedRules: CategoryRule[] = [];

// Initialize rules cache
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get('category_rules', (res) => {
    cachedRules = (res.category_rules as CategoryRule[]) || [
      { id: '1', domain: 'github.com', category: 'Deep Work' },
      { id: '2', domain: 'youtube.com', category: 'Learning' }
    ];
  });
  
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.category_rules) {
      cachedRules = (changes.category_rules.newValue as CategoryRule[]) || [];
    }
    if (changes.lifelinkSettings) {
      const oldSettings = changes.lifelinkSettings.oldValue as any;
      const newSettings = changes.lifelinkSettings.newValue as any;
      
      if (newSettings) {
        isPaused = newSettings.isPaused === true;
        
        const wasPaused = oldSettings?.isPaused === true;
        const isNowPaused = newSettings.isPaused === true;
        const wasEnabled = oldSettings?.trackingEnabled !== false;
        const isNowEnabled = newSettings.trackingEnabled !== false;
        
        if ((wasPaused && !isNowPaused) || (!wasEnabled && isNowEnabled)) {
          scheduleStartTracking();
        } else if (isNowPaused || !isNowEnabled) {
          stopTracking("paused-via-settings-change");
        }
      }
    }
  });
}

async function initializeSettings() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }
  const result = await chrome.storage.local.get('lifelinkSettings');
  const defaultSettings = {
    trackingEnabled: true,
    isPaused: false,
    pauseWhenIdle: true,
    ignoreSensitiveSites: true,
    blacklistedDomains: []
  };
  const settings = {
    ...defaultSettings,
    ...(result.lifelinkSettings || {})
  };
  await chrome.storage.local.set({ lifelinkSettings: settings });
}

const classifyDomain = (domain: string, title: string = '', url: string = ''): string => {
  return classifyCategory(domain, cachedRules, title, url);
};

let currentSession: {
  tabId?: number;
  url: string;
  domain: string;
  title: string;
  category: string;
  startTime: number;
} | null = null;

let isPaused = false;
let isUserIdle = false;
let isBrowserFocused = true;

// Helper to extract domain from URL
const getDomain = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

// Get the ignore reason for a URL
const getIgnoreReason = (url: string): string | null => {
  if (!url) return "Empty or undefined URL";
  const urlLower = url.toLowerCase();
  if (urlLower.startsWith('chrome://extensions')) return "chrome://extensions page";
  if (urlLower.startsWith('chrome://newtab')) return "chrome://newtab page";
  if (urlLower.startsWith('chrome://')) return "System page (chrome://)";
  if (urlLower.startsWith('chrome-extension://')) return "Extension page (chrome-extension://)";
  if (urlLower.startsWith('edge://')) return "System page (edge://)";
  if (urlLower.startsWith('about:')) return "System page (about:)";
  if (urlLower.startsWith('file://')) return "Local file (file://)";
  if (urlLower.startsWith('devtools://') || urlLower.includes('devtools')) return "DevTools page";
  return null;
};

// Trackable URL helper
function isTrackableUrl(url: string): boolean {
  return !getIgnoreReason(url);
}

// Save a session helper
const saveSession = (session: ActivitySession): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    sessionQueue = sessionQueue.then(async () => {
      try {
        const result = await chrome.storage.local.get('activitySessions');
        const sessions = (result.activitySessions as ActivitySession[]) || [];
        
        // Skip duplicate session if same ID or same url/startTime already exists
        const isDuplicate = sessions.some(s => 
          s.id === session.id ||
          (s.url === session.url && s.startTime === session.startTime)
        );
        
        if (isDuplicate) {
          console.warn("Skipped saving duplicate session:", session);
          return;
        }
        
        sessions.push(session);
        await chrome.storage.local.set({ activitySessions: sessions });
      } catch (error) {
        console.error("[LifeLink] Failed to save session in queue:", error);
      }
    }).then(resolve, reject);
  });
};

// Stop current tracking session
const stopTracking = async (reason?: string) => {
  if (!currentSession) return;

  const sessionToSave = currentSession;
  currentSession = null; // Set currentSession = null before async save

  const endTime = Date.now();
  const durationMs = endTime - sessionToSave.startTime;

  if (durationMs > 1000) { // Save sessions only if durationMs > 1000
    const sessionDate = getLocalDateString(sessionToSave.startTime);

    const savedSession: ActivitySession = {
      id: crypto.randomUUID(),
      url: sessionToSave.url,
      domain: sessionToSave.domain,
      title: sessionToSave.title,
      category: sessionToSave.category,
      startTime: sessionToSave.startTime,
      endTime,
      durationMs,
      date: sessionDate
    };

    try {
      await saveSession(savedSession);
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  }
};

let startTimer: any = null;

function scheduleStartTracking() {
  if (startTimer) clearTimeout(startTimer);
  startTimer = setTimeout(() => {
    startTrackingCurrentTab().catch(err => {
      console.error("Error in startTrackingCurrentTab:", err);
    });
  }, 300);
}

// // Start tracking the current active tab actual implementation
async function startTrackingCurrentTab() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }

  const storageResult = await chrome.storage.local.get('lifelinkSettings') as any;
  const defaultSettings = {
    trackingEnabled: true,
    isPaused: false,
    pauseWhenIdle: true,
    ignoreSensitiveSites: true,
    blacklistedDomains: []
  };
  const settings = {
    ...defaultSettings,
    ...(storageResult.lifelinkSettings || {})
  };

  isPaused = settings.isPaused === true;

  try {
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if ((!tabs || tabs.length === 0) && chrome.windows && chrome.windows.getLastFocused) {
      const lastFocusedWin = await chrome.windows.getLastFocused({ populate: true });
      if (lastFocusedWin && lastFocusedWin.tabs) {
        const activeTab = lastFocusedWin.tabs.find(t => t.active);
        if (activeTab) {
          tabs = [activeTab];
        }
      }
    }

    if (!tabs || tabs.length === 0) {
      tabs = await chrome.tabs.query({ active: true });
    }

    const tab = tabs[0];
    const url = tab?.url || '';
    const isHttpOrHttps = url.startsWith("http://") || url.startsWith("https://");

    // Determine browser focus dynamically
    let isBrowserFocusedActual = isBrowserFocused;
    if (chrome.windows && (chrome.windows.getLastFocused || chrome.windows.getCurrent)) {
      try {
        const lastFocusedWin = chrome.windows.getLastFocused
          ? await chrome.windows.getLastFocused()
          : await chrome.windows.getCurrent();
        if (lastFocusedWin) {
          isBrowserFocusedActual = lastFocusedWin.focused === true;
        }
      } catch (e) {
        console.error("Error determining window focus:", e);
      }
    }

    const isFocusedAllowed = isBrowserFocusedActual || isHttpOrHttps;

    if (settings.trackingEnabled === false || settings.isPaused === true || isUserIdle === true || !isFocusedAllowed) {
      await stopTracking("paused-or-unfocused");
      return;
    }

    if (!tab) {
      return;
    }

    if (tab.incognito) {
      return;
    }

    const reason = getIgnoreReason(tab.url || '');

    if (reason) {
      return;
    }

    const domain = new URL(url).hostname.replace(/^www\./, "");

    if (currentSession && currentSession.url === url && currentSession.tabId === tab.id) {
      return;
    }

    await stopTracking("switch-before-start");

    currentSession = {
      tabId: tab.id,
      url,
      domain,
      title: tab.title || domain,
      category: classifyDomain(domain, tab.title || domain, url),
      startTime: Date.now()
    };
  } catch (error) {
    console.error("startTrackingCurrentTab failed:", error);
  }
}

// Add defensive listeners if chrome API exists
if (typeof chrome !== 'undefined') {
  if (chrome.tabs) {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      if (currentSession && currentSession.tabId !== activeInfo.tabId) {
        await stopTracking("tab-activated");
      }
      scheduleStartTracking();
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tab.active && (changeInfo.url || changeInfo.status === 'complete' || changeInfo.title)) {
        if (currentSession && currentSession.tabId === tabId && tab.url && currentSession.url !== tab.url) {
          await stopTracking("tab-url-changed");
        }
        scheduleStartTracking();
      }
    });
  }

  if (chrome.windows) {
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        isBrowserFocused = false;
        await stopTracking("window-focus-lost");
      } else {
        try {
          const win = await chrome.windows.get(windowId);
          if (win && (win.type === 'normal' || win.type === 'popup')) {
            isBrowserFocused = true;
            scheduleStartTracking();
          }
        } catch (e) {
          // Window query failed or window is devtools
        }
      }
    });
  }

  if (chrome.idle) {
    chrome.idle.setDetectionInterval(30);
    chrome.idle.onStateChanged.addListener(async (newState) => {
      const result = await chrome.storage.local.get('lifelinkSettings') as any;
      const settings = result.lifelinkSettings || { pauseWhenIdle: true };
      const respectIdle = settings.pauseWhenIdle !== false;
      
      isUserIdle = respectIdle && (newState === 'idle' || newState === 'locked');
      if (isUserIdle) {
        await stopTracking("idle-state");
      } else {
        scheduleStartTracking();
      }
    });
  }

  if (chrome.runtime) {
    chrome.runtime.onStartup.addListener(async () => {
      await initializeSettings();
      await pruneOldSessions();
      scheduleStartTracking();
    });

    chrome.runtime.onInstalled.addListener(async () => {
      const result = await chrome.storage.local.get('category_rules');
      
      if (!result.category_rules) {
        await chrome.storage.local.set({
          category_rules: [
            { id: '1', domain: 'github.com', category: 'Deep Work' },
            { id: '2', domain: 'youtube.com', category: 'Learning' }
          ]
        });
      }
      
      await initializeSettings();
      await pruneOldSessions();
      scheduleStartTracking();
    });
  }

  if (chrome.alarms) {
    chrome.alarms.create('lifelink-daily-prune-alarm', {
      periodInMinutes: 1440 // 24 hours
    });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'lifelink-daily-prune-alarm') {
        pruneOldSessions().catch(err => {
          console.error("[LifeLink] Alarm prune failed:", err);
        });
      }
    });
  }

  // Run cleanup unconditionally on service worker reload/boot
  pruneOldSessions().catch(err => {
    console.error("[LifeLink] Startup prune failed:", err);
  });
}

  if (chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "LIFELINK_RESUME_TRACKING") {
        chrome.storage.local.get("lifelinkSettings", (result) => {
          const settings = result.lifelinkSettings || {
            trackingEnabled: true,
            isPaused: false,
            pauseWhenIdle: true,
            ignoreSensitiveSites: true,
            blacklistedDomains: []
          };

          const newSettings = {
            ...settings,
            isPaused: false,
            trackingEnabled: true
          };

          chrome.storage.local.set({ lifelinkSettings: newSettings }, () => {
            isPaused = false;
            isBrowserFocused = true;
            
            startTrackingCurrentTab().then(() => {
              sendResponse({ ok: true });
            }).catch(err => {
              console.error("Resume tracking failed:", err);
              sendResponse({ ok: false, error: String(err) });
            });
          });
        });
        return true;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
      return true;
    });
  }

  // Initialize on load
initializeSettings().then(() => {
  scheduleStartTracking();
});

export { isTrackableUrl };

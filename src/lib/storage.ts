// src/lib/storage.ts

export const getStorageItem = async <T>(key: string, defaultValue: T): Promise<T> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] !== undefined ? (result[key] as T) : defaultValue);
      });
    });
  } else {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
};

export const setStorageItem = async <T>(key: string, value: T): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  } else {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
};

export const syncStorageItem = (key: string, value: any) => {
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [key]: value });
  }
};

export const initializeLocalStorage = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await new Promise<Record<string, any>>((resolve) => {
      chrome.storage.local.get(null, (res) => resolve(res || {}));
    });
    for (const [key, val] of Object.entries(data)) {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }
};

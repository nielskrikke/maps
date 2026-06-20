
import React from 'react';
import ReactDOM from 'react-dom/client';

// Inline global storage safety wrapper to prevent third-party iframe SecurityErrors
(() => {
  const testStorage = (type: 'localStorage' | 'sessionStorage') => {
    try {
      const storage = window[type];
      const testKey = `__storage_test_${type}__`;
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const createMemoryStorage = () => {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string): string | null => store[key] !== undefined ? store[key] : null,
      setItem: (key: string, value: string): void => { store[key] = String(value); },
      removeItem: (key: string): void => { delete store[key]; },
      clear: (): void => { for (const k in store) { delete store[k]; } },
      key: (index: number): string | null => Object.keys(store)[index] || null,
      get length(): number { return Object.keys(store).length; }
    };
  };

  if (!testStorage('localStorage')) {
    console.warn("localStorage is blocked or unavailable. Applying memory-storage fallback.");
    try {
      Object.defineProperty(window, 'localStorage', {
        value: createMemoryStorage(),
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (err) {
      console.error("Critical: Could not polyfill local storage.", err);
    }
  }

  if (!testStorage('sessionStorage')) {
    console.warn("sessionStorage is blocked or unavailable. Applying memory-storage fallback.");
    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: createMemoryStorage(),
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (err) {
      console.error("Critical: Could not polyfill session storage.", err);
    }
  }
})();

import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

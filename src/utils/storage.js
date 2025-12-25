(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const DEFAULT_SETTINGS = {
    showTimestamp: false,
    sidebarWidth: 280,
    language: "auto",
    sidebarPosition: "right"
  };

  function getChromeStorage() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      return null;
    }
    return chrome.storage.local;
  }

  let inMemorySettings = { ...DEFAULT_SETTINGS };

  function getDefaultSettings() {
    return { ...DEFAULT_SETTINGS };
  }

  function getSettings() {
    const storage = getChromeStorage();
    if (!storage) {
      return Promise.resolve({ ...inMemorySettings });
    }

    return new Promise((resolve) => {
      storage.get(DEFAULT_SETTINGS, (items) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn("ACN: storage.get error", chrome.runtime.lastError);
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }
        inMemorySettings = { ...DEFAULT_SETTINGS, ...items };
        resolve({ ...inMemorySettings });
      });
    });
  }

  function setSettings(partial) {
    const storage = getChromeStorage();
    if (!storage) {
      inMemorySettings = { ...inMemorySettings, ...partial };
      return Promise.resolve({ ...inMemorySettings });
    }

    return new Promise((resolve) => {
      storage.set(partial, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn("ACN: storage.set error", chrome.runtime.lastError);
        }
        inMemorySettings = { ...inMemorySettings, ...partial };
        resolve(partial);
      });
    });
  }

  function onSettingsChanged(callback) {
    if (!chrome.storage || !chrome.storage.onChanged) {
      return () => {};
    }

    const handler = (changes, area) => {
      if (area !== "local") {
        return;
      }
      const updated = {};
      Object.keys(changes).forEach((key) => {
        updated[key] = changes[key].newValue;
      });
      callback(updated);
    };

    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }

  root.ACN = root.ACN || {};
  root.ACN.Storage = {
    getDefaultSettings,
    getSettings,
    setSettings,
    onSettingsChanged
  };
})();

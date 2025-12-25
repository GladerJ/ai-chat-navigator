(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const acn = root.ACN || {};
  const Storage = acn.Storage;
  const MessageScanner = acn.MessageScanner;
  const Navigator = acn.Navigator;
  const I18n = acn.I18n;

  if (!Storage || !MessageScanner || !Navigator) {
    console.error("ACN: missing dependencies");
    return;
  }

  const { getSettings, setSettings, onSettingsChanged } = Storage;

  const isTopFrame = root.top === root;
  const alreadyLoaded = Boolean(root.__acnLoaded);

  if (!isTopFrame) {
    console.info("ACN: skip iframe");
    return;
  }
  if (alreadyLoaded) {
    console.info("ACN: already initialized");
    return;
  }

  root.__acnLoaded = true;

  const state = {
    settings: null,
    navigator: null,
    scanner: null,
    messages: [],
    loading: false,
    scannerActive: false,
    removeSettingsListener: null,
    scrollHandler: null,
    lastUrl: location.href
  };

  function isEditableTarget(target) {
    if (!target) {
      return false;
    }
    const tag = target.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      return true;
    }
    return target.isContentEditable;
  }

  // Track which message is closest to the top of the viewport.
  function updateActiveFromScroll() {
    if (!state.navigator || !state.navigator.isVisible() || !state.messages.length) {
      return;
    }

    let active = null;
    let bestDistance = Infinity;
    let lastAbove = null;

    for (const msg of state.messages) {
      if (!msg.element || !msg.element.isConnected) {
        continue;
      }
      const rect = msg.element.getBoundingClientRect();
      if (rect.bottom < 0) {
        lastAbove = msg;
        continue;
      }

      if (rect.top > window.innerHeight && active) {
        break;
      }

      const distance = Math.abs(rect.top);
      if (distance < bestDistance) {
        bestDistance = distance;
        active = msg;
      }
    }

    const next = active || lastAbove;
    if (next) {
      state.navigator.setActiveMessage(next.id);
    }
  }

  // Throttle scroll events to one update per frame.
  function bindScrollTracking() {
    if (state.scrollHandler) {
      return;
    }
    let ticking = false;
    state.scrollHandler = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateActiveFromScroll();
      });
    };
    window.addEventListener("scroll", state.scrollHandler, { passive: true });
  }

  function handleMessages(messages) {
    state.messages = messages;
    state.navigator.setMessages(messages);
    if (state.loading && state.navigator.isVisible()) {
      state.loading = false;
      state.navigator.setLoading(false);
    }
    bindScrollTracking();
    updateActiveFromScroll();
  }

  function handleSettingsUpdate(partial) {
    state.settings = { ...state.settings, ...partial };
    if (partial && Object.prototype.hasOwnProperty.call(partial, "language")) {
      if (I18n && typeof I18n.setLocale === "function") {
        I18n.setLocale(partial.language || "auto");
      }
      if (state.navigator && typeof state.navigator.updateTexts === "function") {
        state.navigator.updateTexts();
      }
    }
    state.navigator.updateSettings(state.settings);
  }

  // SPA route changes can replace the conversation container.
  function handleRouteChange() {
    state.navigator.setMessages([]);
    state.messages = [];
    if (state.navigator.isVisible()) {
      state.loading = true;
      state.navigator.setLoading(true);
      scheduleScan();
    }
  }

  function watchUrlChanges() {
    setInterval(() => {
      if (location.href !== state.lastUrl) {
        state.lastUrl = location.href;
        handleRouteChange();
      }
    }, 800);
  }

  function bindShortcuts() {
    window.addEventListener("keydown", (event) => {
      if (event.altKey && event.key.toLowerCase() === "n") {
        if (isEditableTarget(document.activeElement)) {
          return;
        }
        event.preventDefault();
        setSidebarVisible(!state.navigator.isVisible());
      }
    });
  }

  function bindMessaging() {
    if (!chrome.runtime || !chrome.runtime.onMessage) {
      return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || !state.navigator) {
        return;
      }
      if (message.type === "ACN_TOGGLE_VISIBILITY") {
        const next = !state.navigator.isVisible();
        setSidebarVisible(next);
        sendResponse({ visible: next });
        return;
      }
      if (message.type === "ACN_SET_VISIBILITY") {
        const next = Boolean(message.visible);
        setSidebarVisible(next);
        sendResponse({ visible: next });
      }
    });
  }

  function scheduleScan() {
    if (!state.scanner) {
      return;
    }
    const run = () => {
      if (!state.scanner) {
        return;
      }
      state.scanner.scan();
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 1200 });
    } else {
      setTimeout(run, 0);
    }
  }

  function activateScanner() {
    if (!state.scanner || state.scannerActive) {
      return;
    }
    state.scanner.start({ immediate: false });
    state.scannerActive = true;
  }

  function deactivateScanner() {
    if (!state.scanner || !state.scannerActive) {
      return;
    }
    state.scanner.stop();
    state.scannerActive = false;
  }

  function setSidebarVisible(visible) {
    if (!state.navigator) {
      return;
    }
    const next = Boolean(visible);
    state.navigator.setVisible(next);

    if (!next) {
      state.loading = false;
      state.navigator.setLoading(false);
      deactivateScanner();
      return;
    }

    activateScanner();

    if (state.messages.length) {
      state.navigator.setMessages(state.messages);
      state.loading = false;
      state.navigator.setLoading(false);
    } else {
      state.loading = true;
      state.navigator.setLoading(true);
    }

    scheduleScan();
  }

  async function init() {
    try {
      state.settings = await getSettings();
      if (I18n && typeof I18n.setLocale === "function") {
        I18n.setLocale(state.settings.language || "auto");
      }
      state.navigator = new Navigator({
        settings: state.settings,
        onStateChange: (partial) => setSettings(partial),
        visible: false
      });
      state.navigator.mount();

      state.scanner = new MessageScanner({
        onUpdate: handleMessages,
        debounceMs: 200
      });

      state.removeSettingsListener = onSettingsChanged(handleSettingsUpdate);
      watchUrlChanges();
      bindShortcuts();
      bindMessaging();
    } catch (error) {
      console.error("ACN: failed to initialize", error);
    }
  }

  init();
})();

(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const MESSAGES = {
    en: {
      sidebarTitle: "Navigator",
      searchPlaceholder: "Search messages...",
      loading: "Loading...",
      popupTitle: "AI Chat Navigator",
      popupSubtitle: "Sidebar navigation for long AI chat threads.",
      showTimestamp: "Show timestamps in the list",
      actionsTitle: "Actions",
      toggleSidebar: "Show/Hide sidebar",
      shortcutsTitle: "Shortcuts",
      shortcutToggle: "Toggle sidebar",
      statusShown: "Sidebar shown",
      statusHidden: "Sidebar hidden",
      statusNoTab: "Active tab not available",
      statusNoReceiver: "Sidebar not available on this page",
      statusToggleFailed: "Failed to toggle sidebar",
      statusUpdatedTimestamps: "Updated timestamps",
      languageLabel: "Language",
      languageAuto: "Auto",
      languageEnglish: "English",
      languageChinese: "Chinese",
      sidebarPositionLabel: "Sidebar position",
      sidebarPositionLeft: "Left",
      sidebarPositionRight: "Right"
    },
    zh: {
      sidebarTitle: "导航",
      searchPlaceholder: "搜索消息...",
      loading: "加载中...",
      popupTitle: "AI 聊天导航",
      popupSubtitle: "为长对话提供侧边栏导航。",
      showTimestamp: "列表中显示时间戳",
      actionsTitle: "操作",
      toggleSidebar: "显示/隐藏侧边栏",
      shortcutsTitle: "快捷键",
      shortcutToggle: "切换侧边栏",
      statusShown: "侧边栏已显示",
      statusHidden: "侧边栏已隐藏",
      statusNoTab: "未找到可用标签页",
      statusNoReceiver: "此页面未加载侧边栏",
      statusToggleFailed: "切换侧边栏失败",
      statusUpdatedTimestamps: "已更新时间戳显示",
      languageLabel: "语言",
      languageAuto: "自动",
      languageEnglish: "英语",
      languageChinese: "中文",
      sidebarPositionLabel: "侧边栏位置",
      sidebarPositionLeft: "左侧",
      sidebarPositionRight: "右侧"
    }
  };

  function normalizeLocale(locale) {
    if (!locale) {
      return "en";
    }
    const lower = String(locale).toLowerCase();
    if (lower.startsWith("zh")) {
      return "zh";
    }
    return "en";
  }

  function detectLocale() {
    if (root.chrome && chrome.i18n && typeof chrome.i18n.getUILanguage === "function") {
      return chrome.i18n.getUILanguage();
    }
    return root.navigator?.language || "en";
  }

  function resolveLocale(locale) {
    if (!locale || locale === "auto") {
      return normalizeLocale(detectLocale());
    }
    return normalizeLocale(locale);
  }

  let currentLocale = resolveLocale("auto");

  function setLocale(locale) {
    currentLocale = resolveLocale(locale);
  }

  function getLocale() {
    return currentLocale;
  }

  function t(key, fallback) {
    const value =
      (MESSAGES[currentLocale] && MESSAGES[currentLocale][key]) ||
      (MESSAGES.en && MESSAGES.en[key]);
    if (value) {
      return value;
    }
    return fallback || key;
  }

  function applyTranslations(rootElement = document) {
    if (!rootElement || !rootElement.querySelectorAll) {
      return;
    }

    rootElement.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) {
        return;
      }
      const text = t(key, element.textContent || "");
      if (text) {
        element.textContent = text;
      }
    });

    rootElement.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      if (!key) {
        return;
      }
      const placeholder = element.getAttribute("placeholder") || "";
      const text = t(key, placeholder);
      if (text) {
        element.setAttribute("placeholder", text);
      }
    });
  }

  root.ACN = root.ACN || {};
  root.ACN.I18n = {
    t,
    setLocale,
    getLocale,
    applyTranslations
  };
})();

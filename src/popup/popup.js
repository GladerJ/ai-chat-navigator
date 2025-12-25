(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Storage = root.ACN && root.ACN.Storage;
  const I18n = root.ACN && root.ACN.I18n;

  if (!Storage || !I18n) {
    console.error("ACN: storage unavailable in popup");
    return;
  }

  const { getSettings, setSettings } = Storage;
  const { t, applyTranslations } = I18n;

  const showTimestampInput = document.getElementById("showTimestamp");
  const toggleSidebarButton = document.getElementById("toggleSidebar");
  const languageSelect = document.getElementById("languageSelect");
  const sidebarPosition = document.getElementById("sidebarPosition");
  const status = document.getElementById("status");

  function showStatus(message) {
    status.textContent = message;
    if (message) {
      setTimeout(() => {
        status.textContent = "";
      }, 1600);
    }
  }

  function toggleSidebar() {
    if (!chrome.tabs || !chrome.tabs.query) {
      showStatus(t("statusToggleFailed", "Failed to toggle sidebar"));
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || typeof tab.id !== "number") {
        showStatus(t("statusNoTab", "Active tab not available"));
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "ACN_TOGGLE_VISIBILITY" }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          showStatus(t("statusNoReceiver", "Sidebar not available on this page"));
          return;
        }
        if (response && typeof response.visible === "boolean") {
          showStatus(
            response.visible
              ? t("statusShown", "Sidebar shown")
              : t("statusHidden", "Sidebar hidden")
          );
        } else {
          showStatus(t("statusToggleFailed", "Failed to toggle sidebar"));
        }
      });
    });
  }

  async function loadSettings() {
    const settings = await getSettings();
    showTimestampInput.checked = Boolean(settings.showTimestamp);
    if (languageSelect) {
      languageSelect.value = settings.language || "auto";
    }
    if (sidebarPosition) {
      sidebarPosition.value = settings.sidebarPosition || "right";
    }
    I18n.setLocale(settings.language || "auto");
    return settings;
  }

  showTimestampInput.addEventListener("change", async () => {
    await setSettings({ showTimestamp: showTimestampInput.checked });
    showStatus(t("statusUpdatedTimestamps", "Updated timestamps"));
  });

  if (sidebarPosition) {
    sidebarPosition.addEventListener("change", async () => {
      const value = sidebarPosition.value || "right";
      await setSettings({ sidebarPosition: value });
    });
  }

  if (languageSelect) {
    languageSelect.addEventListener("change", async () => {
      const value = languageSelect.value || "auto";
      await setSettings({ language: value });
      I18n.setLocale(value);
      applyTranslations(document);
      document.title = t("popupTitle", document.title);
    });
  }

  if (toggleSidebarButton) {
    toggleSidebarButton.addEventListener("click", toggleSidebar);
  }

  loadSettings().then(() => {
    applyTranslations(document);
    document.title = t("popupTitle", document.title);
  });
})();

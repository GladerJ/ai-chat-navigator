(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const i18n = root.ACN && root.ACN.I18n;
  const t = (key, fallback) =>
    i18n && typeof i18n.t === "function" ? i18n.t(key, fallback) : fallback || key;

  const SIDEBAR_ID = "acn-sidebar";
  const DEFAULT_ITEM_HEIGHT = 56;
  const ICON_USER = "\u{1F464}";
  const ICON_AI = "\u{1F916}";
  const MIN_WIDTH = 220;
  const MAX_WIDTH = 520;

  function debounce(fn, wait) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), wait);
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createSummary(content) {
    const trimmed = content.replace(/\s+/g, " ").trim();
    if (trimmed.length <= 20) {
      return trimmed;
    }
    const sentenceMatch = trimmed.match(/^(.{10,80}?)[.!?]/);
    if (sentenceMatch) {
      return `${sentenceMatch[1]}...`;
    }
    return `${trimmed.slice(0, 20)}...`;
  }

  class Navigator {
    constructor({ settings, onStateChange, visible = false } = {}) {
      this.settings = { ...settings };
      this.onStateChange = onStateChange;
      this.visible = Boolean(visible);

      this.messages = [];
      this.filteredMessages = [];
      this.messageMap = new Map();
      this.activeId = null;
      this.filterText = "";

      this.root = null;
      this.listViewport = null;
      this.itemsContainer = null;
      this.topSpacer = null;
      this.bottomSpacer = null;
      this.searchInput = null;
      this.titleCount = null;
      this.titleEl = null;
      this.loadingEl = null;
      this.loadingLabel = null;
      this.loading = false;
      this.needsFilter = false;

      this.itemHeight = DEFAULT_ITEM_HEIGHT;
      this.renderScheduled = false;
      this.forceRender = false;
      this.lastRange = { start: 0, end: 0 };
    }

    mount() {
      if (this.root) {
        return;
      }

      const existing = document.getElementById(SIDEBAR_ID);
      if (existing) {
        this.root = existing;
        return;
      }

      this.root = document.createElement("div");
      this.root.id = SIDEBAR_ID;
      this.root.className = "acn-sidebar";
      this.root.style.width = `${this.settings.sidebarWidth || 280}px`;
      this.applyVisibility();
      this.applyPosition();

      // Drag handle for resizing the sidebar width.
      const resizer = document.createElement("div");
      resizer.className = "acn-resizer";

      const inner = document.createElement("div");
      inner.className = "acn-inner";

      const header = document.createElement("div");
      header.className = "acn-header";

      const title = document.createElement("div");
      title.className = "acn-title";
      title.textContent = t("sidebarTitle", "Navigator");
      this.titleEl = title;

      this.titleCount = document.createElement("span");
      this.titleCount.className = "acn-count";
      this.titleCount.textContent = "0";

      const headerLeft = document.createElement("div");
      headerLeft.className = "acn-header-left";
      headerLeft.appendChild(title);
      headerLeft.appendChild(this.titleCount);

      header.appendChild(headerLeft);

      const searchWrap = document.createElement("div");
      searchWrap.className = "acn-search";

      this.searchInput = document.createElement("input");
      this.searchInput.type = "search";
      this.searchInput.placeholder = t("searchPlaceholder", "Search messages...");
      this.searchInput.setAttribute(
        "aria-label",
        t("searchPlaceholder", "Search messages")
      );

      searchWrap.appendChild(this.searchInput);

      // Virtualized list viewport.
      this.listViewport = document.createElement("div");
      this.listViewport.className = "acn-list";
      this.listViewport.setAttribute("role", "list");

      this.topSpacer = document.createElement("div");
      this.topSpacer.className = "acn-spacer";

      this.itemsContainer = document.createElement("div");
      this.itemsContainer.className = "acn-items";

      this.bottomSpacer = document.createElement("div");
      this.bottomSpacer.className = "acn-spacer";

      this.listViewport.appendChild(this.topSpacer);
      this.listViewport.appendChild(this.itemsContainer);
      this.listViewport.appendChild(this.bottomSpacer);

      const loading = document.createElement("div");
      loading.className = "acn-loading";

      const spinner = document.createElement("div");
      spinner.className = "acn-loading-spinner";

      const loadingText = document.createElement("div");
      loadingText.className = "acn-loading-text";
      loadingText.textContent = t("loading", "Loading...");

      loading.appendChild(spinner);
      loading.appendChild(loadingText);

      this.loadingEl = loading;
      this.loadingLabel = loadingText;

      this.listViewport.appendChild(loading);

      inner.appendChild(header);
      inner.appendChild(searchWrap);
      inner.appendChild(this.listViewport);

      this.root.appendChild(resizer);
      this.root.appendChild(inner);
      document.body.appendChild(this.root);
      this.updateTexts();
      this.setLoading(false);
      this.bindEvents(resizer);
    }

    bindEvents(resizer) {
      const handleSearch = debounce((event) => {
        this.filterText = event.target.value.toLowerCase();
        this.listViewport.scrollTop = 0;
        this.applyFilter();
      }, 150);

      this.searchInput.addEventListener("input", handleSearch);

      // Re-render visible rows on scroll (virtual list).
      this.listViewport.addEventListener("scroll", () => {
        this.scheduleRender();
      });

      this.listViewport.addEventListener("click", (event) => {
        const item = event.target.closest(".acn-item");
        if (!item) {
          return;
        }
        const id = item.dataset.id;
        if (id) {
          this.scrollToMessage(id);
        }
      });

      // Resize logic keeps the sidebar lightweight and responsive.
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      const onMove = (event) => {
        if (!isResizing) {
          return;
        }
        const delta = startX - event.clientX;
        const nextWidth = clamp(startWidth + delta, MIN_WIDTH, MAX_WIDTH);
        this.root.style.width = `${nextWidth}px`;
        this.settings.sidebarWidth = nextWidth;
      };

      const onUp = () => {
        if (!isResizing) {
          return;
        }
        isResizing = false;
        document.body.classList.remove("acn-resizing");
        this.persistSettings({ sidebarWidth: this.settings.sidebarWidth });
      };

      resizer.addEventListener("mousedown", (event) => {
        isResizing = true;
        startX = event.clientX;
        startWidth = this.root.getBoundingClientRect().width;
        document.body.classList.add("acn-resizing");
      });

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }

    applyVisibility() {
      if (!this.root) {
        return;
      }

      this.root.classList.toggle("acn-hidden", !this.visible);
    }

    setLoading(value) {
      this.loading = Boolean(value);
      if (!this.loadingEl) {
        return;
      }
      this.loadingEl.classList.toggle("acn-loading--active", this.loading);
      if (this.listViewport) {
        this.listViewport.setAttribute("aria-busy", this.loading ? "true" : "false");
      }
    }

    updateSettings(nextSettings) {
      this.settings = { ...this.settings, ...nextSettings };
      if (this.settings.sidebarWidth) {
        const width = clamp(this.settings.sidebarWidth, MIN_WIDTH, MAX_WIDTH);
        this.settings.sidebarWidth = width;
        this.root.style.width = `${width}px`;
      }
      this.applyPosition();
      this.updateTexts();
      this.applyVisibility();
      if (this.visible) {
        this.applyFilter();
      } else {
        this.needsFilter = true;
      }
    }

    applyPosition() {
      if (!this.root) {
        return;
      }
      const position = this.settings.sidebarPosition === "left" ? "left" : "right";
      if (position === "left") {
        this.root.classList.add("acn-left");
        this.root.style.left = "0";
        this.root.style.right = "auto";
      } else {
        this.root.classList.remove("acn-left");
        this.root.style.right = "0";
        this.root.style.left = "auto";
      }
    }

    updateTexts() {
      if (this.titleEl) {
        this.titleEl.textContent = t("sidebarTitle", "Navigator");
      }
      if (this.searchInput) {
        const placeholder = t("searchPlaceholder", "Search messages...");
        this.searchInput.placeholder = placeholder;
        this.searchInput.setAttribute("aria-label", placeholder);
      }
      if (this.loadingLabel) {
        this.loadingLabel.textContent = t("loading", "Loading...");
      }
    }

    persistSettings(partial) {
      if (this.onStateChange) {
        this.onStateChange(partial);
      }
    }

    setVisible(value) {
      const next = Boolean(value);
      if (this.visible === next) {
        return;
      }
      this.visible = next;
      this.applyVisibility();
      if (this.visible) {
        if (this.needsFilter) {
          this.needsFilter = false;
          this.applyFilter();
        } else {
          this.scheduleRender(true);
        }
      }
    }

    isVisible() {
      return Boolean(this.visible);
    }

    setMessages(messages) {
      this.messages = messages;
      this.messageMap = new Map(messages.map((msg) => [msg.id, msg]));
      this.titleCount.textContent = String(messages.length);

      if (!this.visible) {
        this.needsFilter = true;
        return;
      }

      this.applyFilter();
    }

    applyFilter() {
      if (!this.filterText) {
        this.filteredMessages = [...this.messages];
      } else {
        this.filteredMessages = this.messages.filter((msg) =>
          msg.content.toLowerCase().includes(this.filterText)
        );
      }
      this.scheduleRender(true);
    }

    scheduleRender(force = false) {
      if (!this.visible) {
        this.forceRender = this.forceRender || force;
        return;
      }
      if (this.renderScheduled && !force) {
        return;
      }
      this.forceRender = this.forceRender || force;
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.renderScheduled = false;
        this.render();
      });
    }

    render() {
      if (!this.listViewport || !this.visible) {
        return;
      }

      const force = this.forceRender;
      this.forceRender = false;
      const total = this.filteredMessages.length;
      const viewportHeight = this.listViewport.clientHeight || 1;
      const scrollTop = this.listViewport.scrollTop;

      // Render only the visible slice to keep large chats snappy.
      const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 4);
      const endIndex = Math.min(
        total,
        Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + 4
      );

      if (!force && startIndex === this.lastRange.start && endIndex === this.lastRange.end) {
        return;
      }

      this.lastRange = { start: startIndex, end: endIndex };
      this.topSpacer.style.height = `${startIndex * this.itemHeight}px`;
      this.bottomSpacer.style.height = `${(total - endIndex) * this.itemHeight}px`;

      const fragment = document.createDocumentFragment();
      const activeId = this.activeId;

      for (let i = startIndex; i < endIndex; i += 1) {
        const msg = this.filteredMessages[i];
        if (!msg) {
          continue;
        }
        const item = document.createElement("div");
        item.className = "acn-item";
        item.dataset.id = msg.id;
        item.setAttribute("role", "listitem");
        if (msg.id === activeId) {
          item.classList.add("acn-item--active");
        }

        const icon = document.createElement("div");
        icon.className = "acn-item-icon";
        icon.textContent = msg.role === "user" ? ICON_USER : ICON_AI;

        const body = document.createElement("div");
        body.className = "acn-item-body";

        const summary = document.createElement("div");
        summary.className = "acn-item-summary";
        summary.textContent = createSummary(msg.content);

        body.appendChild(summary);

        if (this.settings.showTimestamp && msg.timestamp) {
          const meta = document.createElement("div");
          meta.className = "acn-item-meta";
          meta.textContent = msg.timestamp;
          body.appendChild(meta);
        }

        item.appendChild(icon);
        item.appendChild(body);
        fragment.appendChild(item);
      }

      this.itemsContainer.replaceChildren(fragment);
      this.updateItemMetrics();
    }

    updateItemMetrics() {
      const sample = this.itemsContainer.querySelector(".acn-item");
      if (!sample) {
        return;
      }
      const itemHeight = sample.getBoundingClientRect().height;
      const styles = getComputedStyle(this.itemsContainer);
      const gapValue = styles.rowGap || styles.gap || "0";
      const gap = parseFloat(gapValue) || 0;
      const nextHeight = Math.max(1, itemHeight + gap);
      if (Math.abs(nextHeight - this.itemHeight) > 0.5) {
        this.itemHeight = nextHeight;
        this.scheduleRender(true);
      }
    }

    scrollToMessage(id) {
      const msg = this.messageMap.get(id);
      if (!msg || !msg.element) {
        return;
      }
      msg.element.scrollIntoView({ behavior: "smooth", block: "start" });
      const highlightTarget =
        msg.highlightElement && msg.highlightElement.isConnected
          ? msg.highlightElement
          : msg.element;
      this.flashMessage(highlightTarget);
      this.setActiveMessage(id);
    }

    flashMessage(element) {
      element.classList.add("acn-message-highlight");
      setTimeout(() => element.classList.remove("acn-message-highlight"), 1400);
    }

    setActiveMessage(id) {
      if (this.activeId === id) {
        return;
      }
      this.activeId = id;
      this.scheduleRender(true);
    }
  }

  root.ACN = root.ACN || {};
  root.ACN.Navigator = Navigator;
})();

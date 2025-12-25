(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const platformApi = root.ACN && root.ACN.Platforms;

  if (!platformApi || !platformApi.getPlatformConfig) {
    console.warn("ACN: platform config unavailable");
    return;
  }

  const { getPlatformConfig } = platformApi;

  // Debounce rapid DOM updates from MutationObserver.
  function debounce(fn, wait) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), wait);
    };
  }

  // Fast, non-cryptographic hash for change detection.
  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function normalizeRole(raw) {
    if (!raw) {
      return "ai";
    }
    const value = String(raw).toLowerCase();
    if (value.includes("user") || value.includes("human") || value.includes("you")) {
      return "user";
    }
    if (value.includes("assistant") || value.includes("ai") || value.includes("bot")) {
      return "ai";
    }
    return "ai";
  }

  function findFirstElement(rootElement, selectors) {
    for (const selector of selectors) {
      const match = rootElement.querySelector(selector);
      if (match) {
        return match;
      }
    }
    return null;
  }

  function extractContent(element, selectors) {
    const target = selectors.length ? findFirstElement(element, selectors) : null;
    const text = (target || element).textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  function extractTimestamp(element, selectors) {
    const target = selectors.length ? findFirstElement(element, selectors) : null;
    if (!target) {
      return "";
    }
    return target.getAttribute("datetime") || target.textContent?.trim() || "";
  }

  function extractRole(element, roleAttributes) {
    for (const attr of roleAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        return normalizeRole(value);
      }
    }

    const roleData = element.getAttribute("data-role") || element.getAttribute("data-author-role");
    if (roleData) {
      return normalizeRole(roleData);
    }

    return "ai";
  }

  function findHighlightElement(element, selectors) {
    if (!selectors || !selectors.length) {
      return element;
    }
    for (const selector of selectors) {
      const match = element.querySelector(selector);
      if (match) {
        return match;
      }
      if (element.matches && element.matches(selector)) {
        return element;
      }
    }
    return element;
  }

  function getMessageId(element, index, content) {
    const attrId =
      element.getAttribute("data-message-id") ||
      element.getAttribute("data-id") ||
      element.getAttribute("id");
    if (attrId) {
      return attrId;
    }
    return `acn-${index}-${hashString(content)}`;
  }

  function filterNestedCandidates(elements) {
    return elements.filter(
      (element) => !elements.some((other) => other !== element && element.contains(other))
    );
  }

  class MessageScanner {
    constructor({ onUpdate, debounceMs = 250 } = {}) {
      this.onUpdate = onUpdate;
      this.debounceMs = debounceMs;
      this.observer = null;
      this.lastSignature = "";
      this.scheduleScan = debounce(() => this.scan(), this.debounceMs);
    }

    start({ immediate = true } = {}) {
      if (this.observer) {
        return;
      }

      const ready = () => {
        if (!document.body) {
          setTimeout(ready, 50);
          return;
        }
        // Observe subtree changes and batch scans.
        this.observer = new MutationObserver(() => this.scheduleScan());
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
        if (immediate) {
          this.scan();
        }
      };

      ready();
    }

    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    scan() {
      const platform = getPlatformConfig();
      const selectorList = platform.selectors.message || [];
      const selector = selectorList.join(", ");
      let elements = selector ? Array.from(document.querySelectorAll(selector)) : [];

      if (!elements.length) {
        elements = Array.from(document.querySelectorAll("div[data-message-author-role], article"));
      }

      elements = filterNestedCandidates(Array.from(new Set(elements)));

      const messages = elements
        .map((element, index) => {
          const content = extractContent(element, platform.selectors.content || []);
          if (!content) {
            return null;
          }
          const role =
            typeof platform.roleResolver === "function"
              ? platform.roleResolver(element, extractRole)
              : extractRole(element, platform.selectors.roleAttribute || []);
          const timestamp = extractTimestamp(element, platform.selectors.timestamp || []);
          const id = getMessageId(element, index, content);
          const highlightElement = findHighlightElement(
            element,
            (platform.selectors && platform.selectors.highlight) || []
          );

          element.classList.add("acn-message-target");

          return {
            id,
            role,
            content,
            element,
            highlightElement,
            timestamp
          };
        })
        .filter(Boolean);

      // Only emit updates if content changed to keep UI work minimal.
      const signature = messages.map((msg) => `${msg.id}:${hashString(msg.content)}`).join("|");
      if (signature === this.lastSignature) {
        return;
      }

      this.lastSignature = signature;
      if (this.onUpdate) {
        this.onUpdate(messages);
      }
    }
  }

  root.ACN = root.ACN || {};
  root.ACN.MessageScanner = MessageScanner;
})();

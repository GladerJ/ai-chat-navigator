(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Platforms = root.ACN && root.ACN.Platforms;

  if (!Platforms || typeof Platforms.registerPlatform !== "function") {
    return;
  }

  Platforms.registerPlatform({
    id: "gemini",
    name: "Gemini",
    hostnames: ["gemini.google.com"],
    selectors: {
      message: [
        "div.query-content",
        "div[id^='user-query-content-']",
        "div.response-container-content",
        "div.presented-response-container",
        "message-content",
        "div[data-message-id]",
        "div[data-message-author-role]",
        "div[data-message-text]",
        "article"
      ],
      content: [
        ".query-text",
        ".query-text-line",
        "message-content .markdown",
        "message-content .markdown-main-panel",
        "message-content",
        ".markdown-main-panel",
        ".markdown",
        ".prose",
        "[data-message-text]"
      ],
      highlight: [
        ".user-query-bubble-with-background",
        ".query-text-line",
        ".query-text",
        ".markdown-main-panel",
        "message-content",
        ".model-response-text",
        ".response-content",
        ".response-container-content"
      ],
      roleAttribute: ["data-message-author-role", "data-role"],
      timestamp: ["time"]
    },
    roleResolver: (element, fallback) => {
      const id = element.getAttribute("id") || "";
      if (id.startsWith("user-query-content-") || element.classList.contains("query-content")) {
        return "user";
      }
      if (
        element.classList.contains("response-container-content") ||
        element.classList.contains("presented-response-container")
      ) {
        return "ai";
      }
      if (element.tagName && element.tagName.toLowerCase() === "message-content") {
        return "ai";
      }
      if (
        element.closest &&
        element.closest(".presented-response-container, .response-container-content, message-content")
      ) {
        return "ai";
      }
      return fallback(element, ["data-message-author-role", "data-role"]);
    }
  });
})();

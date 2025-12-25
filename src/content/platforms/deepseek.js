(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Platforms = root.ACN && root.ACN.Platforms;

  if (!Platforms || typeof Platforms.registerPlatform !== "function") {
    return;
  }

  Platforms.registerPlatform({
    id: "deepseek",
    name: "DeepSeek",
    hostnames: ["chat.deepseek.com"],
    selectors: {
      message: ["div.ds-message", "div.ds-markdown"],
      content: ["div.ds-markdown", "p.ds-markdown-paragraph", "div.fbb737a4", "div.ds-message"],
      highlight: ["div.ds-markdown", "div.fbb737a4", "div.ds-message"],
      roleAttribute: ["data-message-author-role", "data-role"],
      timestamp: ["time"]
    },
    roleResolver: (element, fallback) => {
      if (
        element.classList.contains("ds-markdown") ||
        (element.querySelector && element.querySelector(".ds-markdown"))
      ) {
        return "ai";
      }
      if (element.classList.contains("ds-message") || element.closest(".ds-message")) {
        return "user";
      }
      return fallback(element, ["data-message-author-role", "data-role"]);
    }
  });
})();

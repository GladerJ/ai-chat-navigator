(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Platforms = root.ACN && root.ACN.Platforms;

  if (!Platforms || typeof Platforms.registerPlatform !== "function") {
    return;
  }

  Platforms.registerPlatform({
    id: "claude",
    name: "Claude",
    hostnames: ["claude.ai"],
    selectors: {
      message: [
        "div[data-testid='user-message']",
        "div.font-claude-response",
        "div.standard-markdown",
        "div[data-test-id='chat-message']",
        "div[data-testid='chat-message']",
        "div[data-message-id]"
      ],
      content: [
        "div[data-testid='user-message']",
        ".font-user-message",
        ".font-claude-response-body",
        ".standard-markdown",
        ".progressive-markdown",
        "div[data-test-id='chat-message-text']",
        "div[data-testid='chat-message-text']",
        ".prose",
        ".markdown"
      ],
      highlight: [
        ".font-claude-response",
        ".standard-markdown",
        ".progressive-markdown",
        "div[data-testid='user-message']"
      ],
      roleAttribute: ["data-message-author-role", "data-author-role", "data-is-user"],
      timestamp: ["time", "span[data-test-id='timestamp']"]
    },
    roleResolver: (element, fallback) => {
      if (element.closest && element.closest("div[data-testid='user-message']")) {
        return "user";
      }
      if (element.closest && element.closest("div.font-claude-response")) {
        return "ai";
      }
      return fallback(element, ["data-message-author-role", "data-author-role", "data-is-user"]);
    }
  });
})();

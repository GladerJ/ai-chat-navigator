(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Platforms = root.ACN && root.ACN.Platforms;

  if (!Platforms || typeof Platforms.registerPlatform !== "function") {
    return;
  }

  Platforms.registerPlatform({
    id: "chatgpt",
    name: "ChatGPT",
    hostnames: ["chat.openai.com", "chatgpt.com"],
    selectors: {
      message: [
        "article[data-testid^='conversation-turn']",
        "article[data-testid='conversation-turn']",
        "div[data-message-id]",
        "div[data-message-author-role]"
      ],
      content: [".markdown", ".prose"],
      roleAttribute: ["data-message-author-role"],
      timestamp: ["time"]
    }
  });
})();

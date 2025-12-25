(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const Platforms = root.ACN && root.ACN.Platforms;

  if (!Platforms || typeof Platforms.registerPlatform !== "function") {
    return;
  }

  Platforms.registerPlatform({
    id: "doubao",
    name: "Doubao",
    hostnames: ["www.doubao.com", "doubao.com"],
    selectors: {
      message: ["div[data-testid='message_text_content']"],
      content: [
        ".flow-markdown-body",
        ".paragraph-element",
        "p",
        "ol",
        "li",
        "div"
      ],
      highlight: [
        ".flow-markdown-body",
        "div[data-testid='message_text_content']",
        ".paragraph-element"
      ],
      roleAttribute: ["data-message-author-role", "data-role"],
      timestamp: ["time"]
    },
    roleResolver: (element, fallback) => {
      if (
        element.classList.contains("flow-markdown-body") ||
        element.closest(".flow-markdown-body, .mdbox-theme-next")
      ) {
        return "ai";
      }
      if (
        element.classList.contains("bg-s-color-bg-trans") ||
        element.classList.contains("text-s-color-text-secondary") ||
        element.closest(".justify-end")
      ) {
        return "user";
      }
      return fallback(element, ["data-message-author-role", "data-role"]);
    }
  });
})();

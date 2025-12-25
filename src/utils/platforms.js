(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const platforms = [];

  const DEFAULT_PLATFORM = {
    id: "generic",
    name: "Generic",
    hostnames: [],
    selectors: {
      message: [
        "div[data-message-author-role]",
        "div[data-message-id]",
        "article",
        "div[class*='message']"
      ],
      content: [".markdown", ".prose"],
      roleAttribute: ["data-message-author-role", "data-role", "data-author-role"],
      timestamp: ["time"]
    }
  };

  function matchesHostname(hostname, platformHostnames) {
    return platformHostnames.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  }

  function registerPlatform(platform) {
    if (!platform || !platform.id) {
      return;
    }
    platforms.push(platform);
  }

  function getPlatformConfig(hostname = window.location.hostname) {
    const match = platforms.find((platform) =>
      matchesHostname(hostname, platform.hostnames || [])
    );
    return match || DEFAULT_PLATFORM;
  }

  function getAllPlatforms() {
    return [...platforms];
  }

  root.ACN = root.ACN || {};
  root.ACN.Platforms = {
    registerPlatform,
    getPlatformConfig,
    getAllPlatforms,
    DEFAULT_PLATFORM
  };
})();

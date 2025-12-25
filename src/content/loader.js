(() => {
  if (window.__acnLoaderLoaded) {
    return;
  }
  window.__acnLoaderLoaded = true;

  const moduleUrl = chrome.runtime.getURL("src/content/content.js");

  import(moduleUrl).catch((error) => {
    console.error("ACN: failed to load module", error);
  });
})();

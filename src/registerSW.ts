export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          console.error("[PWA] service worker registration failed", err);
        });
    });
  }
}

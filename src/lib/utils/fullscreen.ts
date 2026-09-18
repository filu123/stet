/**
 * Native browser fullscreen, best-effort.
 *
 * Focus mode hides Stet's own chrome; asking the browser for fullscreen on top
 * of that also hides the URL bar, which is what makes it worthwhile on a
 * tablet. Every call is optional — the request needs a user gesture and some
 * browsers (notably iOS Safari) refuse it outright, so a rejection just means
 * focus mode runs without it.
 */

export function requestBrowserFullscreen(): void {
  const element = document.documentElement;
  if (document.fullscreenElement || typeof element.requestFullscreen !== "function") return;
  void element.requestFullscreen().catch(() => {
    /* denied or unsupported — focus mode still applies */
  });
}

export function exitBrowserFullscreen(): void {
  if (!document.fullscreenElement || typeof document.exitFullscreen !== "function") return;
  void document.exitFullscreen().catch(() => {
    /* already exiting */
  });
}

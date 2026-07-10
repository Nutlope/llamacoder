type ScheduleRepaintRestore = (
  callback: () => void,
  delayMs: number,
) => number;

/**
 * Force Chromium to allocate a fresh raster for a sandboxed srcdoc iframe.
 * A one-pixel geometry change invalidates the whole frame; restoring the
 * width after a sampled interval creates a second full layout boundary.
 */
export function nudgePreviewIframeGeometry(
  iframe: HTMLIFrameElement | null,
  scheduleRestore: ScheduleRepaintRestore = (callback, delayMs) =>
    window.setTimeout(callback, delayMs),
) {
  if (!iframe) return;

  iframe.style.width = "calc(100% - 1px)";
  void iframe.offsetWidth;

  scheduleRestore(() => {
    iframe.style.width = "";
    void iframe.offsetWidth;
  }, 250);
}

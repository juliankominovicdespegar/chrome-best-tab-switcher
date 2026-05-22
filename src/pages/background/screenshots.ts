import {
  initThumbnailStore,
  putThumbnail,
  getThumbnailDataUrl,
  getAllThumbnailUrls,
  evictOldest,
} from "@src/lib/thumbnailStore";

const MAX_URL_SCREENSHOTS = 100;

// In-memory caches for fast synchronous reads during a SW lifetime
const screenshotCache = new Map<number, string>();
const urlScreenshotCache = new Map<
  string,
  { dataUrl: string; capturedAt: number }
>();

let captureTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTabId: number | null = null;
let pendingWindowId: number | null = null;

function isPersistableUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function getScreenshotByUrl(url: string): string | undefined {
  if (!url) return undefined;
  return urlScreenshotCache.get(url)?.dataUrl;
}

export async function getScreenshotForTab(
  tabId: number,
): Promise<string | undefined> {
  const fromTab = screenshotCache.get(tabId);
  if (fromTab) return fromTab;

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) return getScreenshotByUrl(tab.url);
  } catch {
    // Tab gone
  }
  return undefined;
}

export function removeScreenshot(tabId: number) {
  screenshotCache.delete(tabId);
}

async function persistForUrl(url: string, dataUrl: string) {
  if (!isPersistableUrl(url)) return;

  const capturedAt = Date.now();
  urlScreenshotCache.set(url, { dataUrl, capturedAt });

  try {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    await putThumbnail(url, blob, capturedAt);
  } catch (err) {
    console.warn("[tab-switcher] Failed to persist thumbnail for", url, err);
  }

  if (urlScreenshotCache.size > MAX_URL_SCREENSHOTS) {
    evictMemoryCache();
    evictOldest().catch((err) =>
      console.warn("[tab-switcher] eviction error", err),
    );
  }
}

function evictMemoryCache() {
  if (urlScreenshotCache.size <= MAX_URL_SCREENSHOTS) return;

  const sorted = [...urlScreenshotCache.entries()].sort(
    (a, b) => a[1].capturedAt - b[1].capturedAt,
  );
  const toRemove = sorted.length - MAX_URL_SCREENSHOTS;
  for (let i = 0; i < toRemove; i++) {
    urlScreenshotCache.delete(sorted[i][0]);
  }
}

export async function initScreenshots() {
  await initThumbnailStore();

  // Populate in-memory cache from IndexedDB
  const stored = await getAllThumbnailUrls();
  for (const [url, entry] of stored) {
    urlScreenshotCache.set(url, entry);
  }

  chrome.tabs.onActivated.addListener((activeInfo) => {
    pendingTabId = activeInfo.tabId;
    pendingWindowId = activeInfo.windowId;
    scheduleCapture();
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    removeScreenshot(tabId);
    if (pendingTabId === tabId) {
      pendingTabId = null;
      pendingWindowId = null;
    }
  });
}

function scheduleCapture() {
  if (captureTimer) clearTimeout(captureTimer);
  captureTimer = setTimeout(capturePending, 300);
}

async function capturePending() {
  const tabId = pendingTabId;
  const windowId = pendingWindowId;
  if (tabId == null || windowId == null) return;

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "png",
      quality: 1,
    });
    screenshotCache.set(tabId, dataUrl);

    const tab = await chrome.tabs.get(tabId);
    if (tab.url) {
      await persistForUrl(tab.url, dataUrl);
    }
  } catch {
    // Restricted pages or tab not ready — skip silently
  }
}

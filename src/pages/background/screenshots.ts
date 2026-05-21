const STORAGE_KEY = "urlScreenshots";
const MAX_URL_SCREENSHOTS = 100;

type UrlScreenshotEntry = {
  dataUrl: string;
  capturedAt: number;
};

const screenshotCache = new Map<number, string>();
const urlScreenshotCache = new Map<string, UrlScreenshotEntry>();

let captureTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
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

function persistForUrl(url: string, dataUrl: string) {
  if (!isPersistableUrl(url)) return;
  urlScreenshotCache.set(url, { dataUrl, capturedAt: Date.now() });
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToStorage, 500);
}

function evictOldestEntries() {
  if (urlScreenshotCache.size <= MAX_URL_SCREENSHOTS) return;

  const sorted = [...urlScreenshotCache.entries()].sort(
    (a, b) => a[1].capturedAt - b[1].capturedAt,
  );
  const toRemove = sorted.length - MAX_URL_SCREENSHOTS;
  for (let i = 0; i < toRemove; i++) {
    urlScreenshotCache.delete(sorted[i][0]);
  }
}

async function flushToStorage() {
  evictOldestEntries();
  const record: Record<string, UrlScreenshotEntry> = {};
  for (const [url, entry] of urlScreenshotCache) {
    record[url] = entry;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: record });
}

export async function initScreenshots() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const record = (stored[STORAGE_KEY] ?? {}) as Record<
    string,
    UrlScreenshotEntry
  >;
  for (const [url, entry] of Object.entries(record)) {
    if (entry?.dataUrl) {
      urlScreenshotCache.set(url, entry);
    }
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
      format: "jpeg",
      quality: 1,
    });
    screenshotCache.set(tabId, dataUrl);

    const tab = await chrome.tabs.get(tabId);
    if (tab.url) {
      persistForUrl(tab.url, dataUrl);
    }
  } catch {
    // Restricted pages or tab not ready — skip silently
  }
}

const screenshotCache = new Map<number, string>();
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTabId: number | null = null;
let pendingWindowId: number | null = null;

export function getScreenshot(tabId: number): string | undefined {
  return screenshotCache.get(tabId);
}

export function removeScreenshot(tabId: number) {
  screenshotCache.delete(tabId);
}

export function initScreenshots() {
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
      format: 'jpeg',
      quality: 50,
    });
    screenshotCache.set(tabId, dataUrl);
  } catch {
    // Restricted pages or tab not ready — skip silently
  }
}

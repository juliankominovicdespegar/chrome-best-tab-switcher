const STORAGE_KEY = 'tabLastActive';

let lastActiveMap = new Map<number, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getLastActiveAt(tabId: number): number {
  return lastActiveMap.get(tabId) ?? 0;
}

export function touchTab(tabId: number, at = Date.now()) {
  lastActiveMap.set(tabId, at);
  scheduleFlush();
}

export function removeTab(tabId: number) {
  lastActiveMap.delete(tabId);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToStorage, 500);
}

async function flushToStorage() {
  const record: Record<string, number> = {};
  for (const [tabId, ts] of lastActiveMap) {
    record[String(tabId)] = ts;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: record });
}

export async function initTracking() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const record = (stored[STORAGE_KEY] ?? {}) as Record<string, number>;
  for (const [tabId, ts] of Object.entries(record)) {
    lastActiveMap.set(Number(tabId), ts);
  }

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    if (tab.id == null) continue;
    if (!lastActiveMap.has(tab.id)) {
      lastActiveMap.set(tab.id, tab.active ? now : 0);
    }
  }

  chrome.tabs.onActivated.addListener((activeInfo) => {
    touchTab(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
      touchTab(tabId);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    removeTab(tabId);
  });
}

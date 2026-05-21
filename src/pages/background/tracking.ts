const STORAGE_KEY = 'tabLastVisited';

let lastVisitedMap = new Map<number, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getLastVisitedAt(tabId: number): number {
  return lastVisitedMap.get(tabId) ?? 0;
}

export function touchTab(tabId: number, at = Date.now()) {
  lastVisitedMap.set(tabId, at);
  scheduleFlush();
}

export function removeTab(tabId: number) {
  lastVisitedMap.delete(tabId);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushToStorage, 500);
}

async function flushToStorage() {
  const record: Record<string, number> = {};
  for (const [tabId, ts] of lastVisitedMap) {
    record[String(tabId)] = ts;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: record });
}

export async function initTracking() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const record = (stored[STORAGE_KEY] ?? {}) as Record<string, number>;
  for (const [tabId, ts] of Object.entries(record)) {
    lastVisitedMap.set(Number(tabId), ts);
  }

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    if (tab.id == null) continue;
    if (!lastVisitedMap.has(tab.id)) {
      lastVisitedMap.set(tab.id, tab.active ? now : 0);
    }
  }

  chrome.tabs.onActivated.addListener((activeInfo) => {
    touchTab(activeInfo.tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    removeTab(tabId);
  });
}

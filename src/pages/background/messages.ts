import type {
  BackgroundRequest,
  BackgroundResponse,
  HistoryItem,
  RecentlyClosedItem,
  TabItem,
} from '@src/lib/messages';
import { getLastActiveAt } from './tracking';
import { getScreenshotByUrl, getScreenshotForTab } from './screenshots';

async function listTabs(): Promise<TabItem[]> {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();

  const items = await Promise.all(
    tabs
      .filter((tab): tab is chrome.tabs.Tab & { id: number } => tab.id != null)
      .map(async (tab) => ({
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        lastActiveAt: getLastActiveAt(tab.id) || (tab.active ? now : 0),
        active: Boolean(tab.active),
        screenshot: await getScreenshotForTab(tab.id),
      })),
  );

  return items.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

async function listRecentlyClosed(): Promise<RecentlyClosedItem[]> {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
  const items: RecentlyClosedItem[] = [];

  for (const [index, session] of sessions.entries()) {
    if (session.tab) {
      const url = session.tab.url || '';
      items.push({
        id: `${session.sessionId}-${index}`,
        sessionId: session.sessionId,
        title: session.tab.title || 'Untitled',
        url,
        lastModified: session.tab.lastAccessed,
        screenshot: getScreenshotByUrl(url),
      });
    }
  }

  return items;
}

async function searchHistory(query: string): Promise<HistoryItem[]> {
  const results = await chrome.history.search({
    text: query,
    maxResults: 50,
    startTime: Date.now() - 90 * 24 * 60 * 60 * 1000,
  });

  return results
    .filter((item) => item.url && !item.url.startsWith('chrome://'))
    .map((item) => {
      const url = item.url!;
      return {
        id: String(item.id ?? url),
        title: item.title || url || 'Untitled',
        url,
        lastVisitTime: item.lastVisitTime ?? 0,
        screenshot: getScreenshotByUrl(url),
      };
    });
}

export function initMessageHandler() {
  chrome.runtime.onMessage.addListener(
    (request: BackgroundRequest, _sender, sendResponse: (response: BackgroundResponse) => void) => {
      void handleRequest(request)
        .then(sendResponse)
        .catch((err: Error) => {
          sendResponse({ type: 'ERROR', message: err.message });
        });
      return true;
    },
  );
}

async function handleRequest(request: BackgroundRequest): Promise<BackgroundResponse> {
  switch (request.type) {
    case 'LIST_TABS':
      return { type: 'LIST_TABS', tabs: await listTabs() };

    case 'LIST_RECENTLY_CLOSED':
      return { type: 'LIST_RECENTLY_CLOSED', items: await listRecentlyClosed() };

    case 'SEARCH_HISTORY':
      return { type: 'SEARCH_HISTORY', items: await searchHistory(request.query) };

    case 'GET_SCREENSHOT':
      return {
        type: 'GET_SCREENSHOT',
        screenshot: await getScreenshotForTab(request.tabId),
      };

    case 'ACTIVATE_TAB':
      await chrome.tabs.update(request.tabId, { active: true });
      await chrome.windows.update(request.windowId, { focused: true });
      return { type: 'ACTIVATE_TAB', ok: true };

    case 'CLOSE_TAB':
      await chrome.tabs.remove(request.tabId);
      return { type: 'CLOSE_TAB', ok: true };

    case 'RESTORE_SESSION':
      await chrome.sessions.restore(request.sessionId);
      return { type: 'RESTORE_SESSION', ok: true };

    case 'OPEN_URL':
      await chrome.tabs.create({ url: request.url, active: true });
      return { type: 'OPEN_URL', ok: true };

    default:
      return { type: 'ERROR', message: 'Unknown request' };
  }
}

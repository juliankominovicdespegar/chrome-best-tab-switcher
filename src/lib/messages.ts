export type TabItem = {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  lastActiveAt: number;
  active: boolean;
  screenshot?: string;
};

export type RecentlyClosedItem = {
  sessionId: string;
  title: string;
  url: string;
  lastModified?: number;
};

export type HistoryItem = {
  id: string;
  title: string;
  url: string;
  lastVisitTime: number;
};

export type BackgroundRequest =
  | { type: 'LIST_TABS' }
  | { type: 'LIST_RECENTLY_CLOSED' }
  | { type: 'SEARCH_HISTORY'; query: string }
  | { type: 'ACTIVATE_TAB'; tabId: number; windowId: number }
  | { type: 'CLOSE_TAB'; tabId: number }
  | { type: 'RESTORE_SESSION'; sessionId: string }
  | { type: 'OPEN_URL'; url: string }
  | { type: 'GET_SCREENSHOT'; tabId: number };

export type BackgroundResponse =
  | { type: 'LIST_TABS'; tabs: TabItem[] }
  | { type: 'LIST_RECENTLY_CLOSED'; items: RecentlyClosedItem[] }
  | { type: 'SEARCH_HISTORY'; items: HistoryItem[] }
  | { type: 'ACTIVATE_TAB'; ok: true }
  | { type: 'CLOSE_TAB'; ok: true }
  | { type: 'RESTORE_SESSION'; ok: true }
  | { type: 'OPEN_URL'; ok: true }
  | { type: 'GET_SCREENSHOT'; screenshot?: string }
  | { type: 'ERROR'; message: string };

export type ContentMessage = { type: 'TOGGLE_SWITCHER' };

export function sendToBackground<T extends BackgroundResponse>(
  request: BackgroundRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response: T | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('No response from background'));
        return;
      }
      if (response.type === 'ERROR') {
        reject(new Error(response.message));
        return;
      }
      resolve(response);
    });
  });
}

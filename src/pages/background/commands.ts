import { ensureContentScriptAndSend, isRestrictedTabUrl } from '@src/lib/contentScript';
import type { ContentMessage } from '@src/lib/messages';

export function initCommands() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-switcher') return;

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;

    if (isRestrictedTabUrl(activeTab.url)) {
      console.warn('[tab-switcher] Cannot open on restricted page:', activeTab.url);
      return;
    }

    const message: ContentMessage = { type: 'TOGGLE_SWITCHER' };
    const ok = await ensureContentScriptAndSend(activeTab.id, message);
    if (!ok) {
      console.warn('[tab-switcher] Failed to open switcher on tab', activeTab.id);
    }
  });
}

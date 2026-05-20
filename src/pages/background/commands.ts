import type { ContentMessage } from '@src/lib/messages';

export function initCommands() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-switcher') return;

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;

    const message: ContentMessage = { type: 'TOGGLE_SWITCHER' };
    try {
      await chrome.tabs.sendMessage(activeTab.id, message);
    } catch (err) {
      console.warn('[tab-switcher] Cannot open on this page:', err);
    }
  });
}

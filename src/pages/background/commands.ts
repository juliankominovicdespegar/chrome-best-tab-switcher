export function initCommands() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-switcher') return;

    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.warn('[tab-switcher] Failed to open popup:', error);
    }
  });
}

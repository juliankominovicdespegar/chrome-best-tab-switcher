import type { ContentMessage } from '@src/lib/messages';

export function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return true;

  try {
    const parsed = new URL(url);
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'devtools:'];
    if (restrictedProtocols.includes(parsed.protocol)) return true;
    if (parsed.hostname === 'chrome.google.com' && parsed.pathname.includes('/webstore')) return true;
    return false;
  } catch {
    return true;
  }
}

function getContentScriptFiles(): string[] {
  return chrome.runtime.getManifest().content_scripts?.flatMap((cs) => cs.js ?? []) ?? [];
}

async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return response?.type === 'PONG';
  } catch {
    return false;
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  const files = getContentScriptFiles();
  if (files.length === 0) throw new Error('No content scripts in manifest');

  await chrome.scripting.executeScript({ target: { tabId }, files });
}

async function sendToContentScript(tabId: number, message: ContentMessage): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    return false;
  }
}

export async function ensureContentScriptAndSend(
  tabId: number,
  message: ContentMessage,
): Promise<boolean> {
  if (await sendToContentScript(tabId, message)) return true;

  if (!(await pingContentScript(tabId))) {
    try {
      await injectContentScript(tabId);
    } catch {
      return false;
    }
  }

  const delays = [0, 50, 100, 150, 250, 400];
  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (await sendToContentScript(tabId, message)) return true;
  }

  return false;
}

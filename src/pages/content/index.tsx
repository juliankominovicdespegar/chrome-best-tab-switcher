import { createRoot, type Root } from 'react-dom/client';
import { isExtensionContextValid } from '@src/lib/extensionContext';
import { injectPageKeyboardBlocker } from '@src/lib/injectPageKeyboardBlocker';
import { SWITCHER_HOST_ID } from '@src/lib/switcherHost';
import styles from './styles.css?inline';
import App from './App';

const GLOBAL_KEY = '__bestTabSwitcherCS';
const RELOAD_BANNER_ID = 'best-tab-switcher-reload';

type ContentScriptHandle = {
  destroy: () => void;
};

declare global {
  interface Window {
    [GLOBAL_KEY]?: ContentScriptHandle;
  }
}

let hostEl: HTMLDivElement | null = null;
let reactRoot: Root | null = null;
let dispatchToggle: (() => void) | undefined;
let pendingToggle = false;

function showStaleExtensionNotice() {
  document.getElementById(RELOAD_BANNER_ID)?.remove();

  const el = document.createElement('div');
  el.id = RELOAD_BANNER_ID;
  el.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  el.innerHTML = `
    <div style="max-width:320px;padding:20px;border-radius:12px;background:#fafafa;border:1px solid rgba(0,0,0,0.12);box-shadow:0 16px 40px rgba(0,0,0,0.15);text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#171717;">Extension updated</p>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#525252;">Reload this page to keep using Best Tab Switcher.</p>
      <button type="button" style="padding:8px 14px;border:none;border-radius:8px;background:#171717;color:#fafafa;font-size:13px;font-weight:500;cursor:pointer;">
        Reload page
      </button>
    </div>
  `;

  el.querySelector('button')?.addEventListener('click', () => location.reload());
  el.addEventListener('click', (event) => {
    if (event.target === el) el.remove();
  });

  document.documentElement.appendChild(el);
}

function destroy() {
  try {
    chrome.runtime.onMessage.removeListener(messageListener);
  } catch {
    // Extension context already invalidated.
  }

  reactRoot?.unmount();
  reactRoot = null;
  hostEl?.remove();
  hostEl = null;
  dispatchToggle = undefined;
  pendingToggle = false;
  delete window[GLOBAL_KEY];
}

function messageListener(
  message: { type: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: () => void,
) {
  if (!isExtensionContextValid()) {
    showStaleExtensionNotice();
    return false;
  }

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }

  if (message.type === 'TOGGLE_SWITCHER') {
    if (dispatchToggle) {
      dispatchToggle();
    } else {
      pendingToggle = true;
    }
    sendResponse();
    return true;
  }

  return false;
}

function mount() {
  window[GLOBAL_KEY]?.destroy();

  if (!isExtensionContextValid()) {
    showStaleExtensionNotice();
    return;
  }

  if (document.getElementById(SWITCHER_HOST_ID)) return;

  hostEl = document.createElement('div');
  hostEl.id = SWITCHER_HOST_ID;
  hostEl.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(styles);
  shadow.adoptedStyleSheets = [styleSheet];

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  reactRoot = createRoot(mountPoint);
  reactRoot.render(
    <App
      registerToggle={(toggle) => {
        dispatchToggle = toggle;
        if (pendingToggle) {
          pendingToggle = false;
          toggle();
        }
      }}
    />,
  );

  window[GLOBAL_KEY] = { destroy };
}

chrome.runtime.onMessage.addListener(messageListener);
injectPageKeyboardBlocker();
mount();

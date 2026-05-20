import { SWITCHER_HOST_ID, SWITCHER_OPEN_ATTR } from '@src/lib/switcherHost';

const MARKER = 'data-best-tab-switcher-kb-blocker';

export function injectPageKeyboardBlocker(): void {
  if (document.documentElement.hasAttribute(MARKER)) return;

  const script = document.createElement('script');
  script.textContent = `
(function () {
  if (window.__bestTabSwitcherKeyboardBlockerInstalled) return;
  window.__bestTabSwitcherKeyboardBlockerInstalled = true;

  var HOST_ID = ${JSON.stringify(SWITCHER_HOST_ID)};
  var OPEN_ATTR = ${JSON.stringify(SWITCHER_OPEN_ATTR)};
  var REDISPATCH = '__bestTabSwitcherKeyboardRedispatch';
  var TYPES = ['keydown', 'keyup', 'keypress'];

  function getHost() {
    return document.getElementById(HOST_ID);
  }

  function isOpen() {
    var host = getHost();
    return Boolean(host && host.hasAttribute(OPEN_ATTR));
  }

  function getSwitcherInput() {
    var host = getHost();
    if (!host || !host.shadowRoot) return null;
    return host.shadowRoot.querySelector('input');
  }

  function cloneKeyboardEvent(event) {
    return new KeyboardEvent(event.type, {
      key: event.key,
      code: event.code,
      location: event.location,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
      isComposing: event.isComposing,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
  }

  function intercept(event) {
    if (event[REDISPATCH]) return;
    if (!isOpen()) return;

    var host = getHost();
    if (!host) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var path = event.composedPath();
    var target =
      path.indexOf(host) !== -1 && path[0] instanceof Element
        ? path[0]
        : getSwitcherInput();

    if (!(target instanceof Element)) return;

    var clone = cloneKeyboardEvent(event);
    clone[REDISPATCH] = true;
    target.dispatchEvent(clone);

    if (typeof target.focus === 'function' && document.activeElement !== target) {
      target.focus();
    }
  }

  for (var i = 0; i < TYPES.length; i++) {
    window.addEventListener(TYPES[i], intercept, { capture: true, passive: false });
  }
})();
`.trim();

  (document.head || document.documentElement).appendChild(script);
  script.remove();
  document.documentElement.setAttribute(MARKER, '');
}

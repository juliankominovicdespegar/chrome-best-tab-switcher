import { SWITCHER_HOST_ID } from "@src/lib/switcherHost";

const CAPTURE_OPTIONS: AddEventListenerOptions = {
  capture: true,
  passive: false,
};

const BLOCKED_EVENT_TYPES = [
  "keydown",
  "keyup",
  "keypress",
  "pointerdown",
  "pointerup",
  "pointermove",
  "mousedown",
  "mouseup",
  "mousemove",
  "click",
  "dblclick",
  "auxclick",
  "wheel",
  "touchstart",
  "touchmove",
  "touchend",
  "contextmenu",
] as const;

function getHost(): HTMLElement | null {
  return document.getElementById(SWITCHER_HOST_ID);
}

function isSwitcherEvent(event: Event): boolean {
  const host = getHost();
  if (!host) return false;
  return event.composedPath().includes(host);
}

export type PageInteractionBlocker = {
  release: () => void;
};

// Content scripts run in an isolated world: stopPropagation here does not
// block listeners registered by the page. Keyboard isolation is handled by
// injectPageKeyboardBlocker.ts in the page context; this covers pointer/focus.
export function installPageInteractionBlocker(
  onFocusStolen?: () => void,
): PageInteractionBlocker {
  const block = (event: Event) => {
    if (isSwitcherEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const onFocusIn = (event: FocusEvent) => {
    if (isSwitcherEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onFocusStolen?.();
  };

  for (const type of BLOCKED_EVENT_TYPES) {
    window.addEventListener(type, block, CAPTURE_OPTIONS);
  }
  document.addEventListener("focusin", onFocusIn, CAPTURE_OPTIONS);

  return {
    release: () => {
      for (const type of BLOCKED_EVENT_TYPES) {
        window.removeEventListener(type, block, CAPTURE_OPTIONS);
      }
      document.removeEventListener("focusin", onFocusIn, CAPTURE_OPTIONS);
    },
  };
}

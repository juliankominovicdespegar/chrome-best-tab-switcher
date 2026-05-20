export const SWITCHER_HOST_ID = 'best-tab-switcher-host';
export const SWITCHER_OPEN_ATTR = 'data-switcher-open';

export function setPageInert(inert: boolean) {
  if (document.body) {
    document.body.inert = inert;
  }
}

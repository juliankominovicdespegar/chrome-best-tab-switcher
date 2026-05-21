export function faviconUrlForPage(pageUrl: string): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}

export function isExtensionFaviconUrl(url: string): boolean {
  return url.startsWith(chrome.runtime.getURL('/_favicon/'));
}

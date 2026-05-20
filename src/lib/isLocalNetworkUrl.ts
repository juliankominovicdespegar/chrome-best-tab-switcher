/**
 * Detects URLs that resolve (or very likely resolve) to the user's local
 * network or loopback.
 *
 * Loading <img> / <link> / fetch() from a public-origin page (e.g. github.com)
 * to a local-network destination triggers Chrome 142+'s Local Network Access
 * permission prompt. We never want the tab switcher to silently cause that, so
 * any URL pointing at one of these address spaces is treated as un-loadable
 * and falls back to a generic icon.
 *
 * Address spaces covered (per the LNA spec):
 *  - IPv4 loopback: 127.0.0.0/8
 *  - IPv4 private:  10/8, 172.16/12, 192.168/16
 *  - IPv4 link-local: 169.254/16
 *  - IPv6 loopback: ::1
 *  - IPv6 unique-local: fc00::/7
 *  - IPv6 link-local: fe80::/10
 *  - Hostnames: "localhost", any "*.local" mDNS name
 *  - Single-label hostnames (no dot), which can only resolve via local
 *    DNS / mDNS / hosts file (e.g. http://router/, http://nas/).
 *
 * Also flags non-http(s) schemes that have no business being loaded as <img>
 * from a content script (file://, ftp://, data: with suspect content, etc.).
 */
export function isLocalNetworkUrl(url: string | undefined): boolean {
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return parsed.protocol !== 'data:' && parsed.protocol !== 'chrome:';
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return true;

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname.endsWith('.local')) return true;

  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return isLocalIPv6(hostname.slice(1, -1));
  }
  if (hostname.includes(':')) return isLocalIPv6(hostname);

  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return isLocalIPv4(hostname);

  if (!hostname.includes('.')) return true;

  return false;
}

function isLocalIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;

  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isLocalIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe80::')) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  return false;
}

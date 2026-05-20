# Best Tab Switcher

Fast Chrome tab switcher inspired by Raycast / Command-K. Search open tabs, recently closed tabs, and (lazily) browsing history.

## Features

- **Ctrl+Shift+K** (or **Cmd+Shift+K** on Mac) opens a centered overlay on the current page
- Search by title or URL across open tabs and recently closed tabs
- History search runs only when no open/recent matches are found (lazy, debounced)
- Tab list sorted by last activity
- Favicons, JPEG thumbnails (when the tab was active), title, URL, last-active time
- Keyboard: arrows, Enter to open, Escape to close, **Ctrl/Cmd+Backspace** or **Delete** to close highlighted tab
- Mouse: click row to open, X to close

## Keyboard shortcut

Default: **Ctrl+Shift+K** (Windows/Linux) or **Cmd+Shift+K** (Mac).

Chrome **does not allow** `Ctrl+Alt+*` in `manifest.json` (AltGr conflict), so `Ctrl+Alt+K` cannot be the built-in default. You can try rebinding manually at [chrome://extensions/shortcuts](chrome://extensions/shortcuts) — e.g. **Alt+Shift+K** is valid if you prefer Alt-based shortcuts.

If the overlay does not open after install, confirm the binding under **Best Tab Switcher** → **Open tab switcher**.

## Where it works (and where it does not)

The UI is a **content script overlay**. It works on normal `http://` and `https://` pages.

It **does not** run on:

- `chrome://` pages (including the new tab page if it is a Chrome internal URL)
- Chrome Web Store
- `file://` URLs
- Built-in PDF viewer

On those pages the shortcut does nothing (the background script cannot inject the overlay).

## Development

```bash
bun install
bun run dev:chrome   # watch build → dist_chrome/
```

Load unpacked extension from `dist_chrome/` at [chrome://extensions](chrome://extensions).

Production build:

```bash
bun run build:chrome
```

## Thumbnails

Screenshots are captured with `chrome.tabs.captureVisibleTab` when you **activate** a tab. Tabs you have never focused since installing the extension show a favicon placeholder instead.

## Tech stack

- React 19, TypeScript, Vite, `@crxjs/vite-plugin`
- Tailwind CSS 4, shadcn-style `Command` (cmdk), lucide-react
- MV3 service worker: tab activity tracking, screenshot cache, message bridge

## Project layout

| Path | Role |
|------|------|
| `src/pages/background/` | Service worker: commands, tracking, screenshots, API handlers |
| `src/pages/content/` | Overlay UI (Shadow DOM + React) |
| `src/lib/messages.ts` | Typed `runtime.sendMessage` protocol |
| `src/components/ui/` | shadcn-adapted Command + Button |

See [SPEC.md](./SPEC.md) for product requirements.

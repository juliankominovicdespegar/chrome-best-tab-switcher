import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Globe, ImageOff } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@src/components/ui/command";
import { Button } from "@src/components/ui/button";
import { formatTimeAgo } from "@src/lib/timeAgo";
import {
  sendToBackground,
  type HistoryItem,
  type RecentlyClosedItem,
  type TabItem,
} from "@src/lib/messages";
import { isExtensionContextInvalidatedError } from "@src/lib/extensionContext";
import { installPageInteractionBlocker } from "@src/lib/pageInteractionBlocker";
import { isLocalNetworkUrl } from "@src/lib/isLocalNetworkUrl";
import { cn } from "@src/lib/utils";

function safeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return isLocalNetworkUrl(url) ? undefined : url;
}

type SwitcherProps = {
  onClose: () => void;
};

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

function Favicon({ url, className }: { url?: string; className?: string }) {
  const safeUrl = safeImageUrl(url);
  if (safeUrl) {
    return (
      <img
        src={safeUrl}
        alt=""
        className={cn("h-5 w-5 shrink-0 rounded-sm object-contain", className)}
      />
    );
  }
  return (
    <Globe
      className={cn("h-5 w-5 shrink-0 text-muted-foreground", className)}
    />
  );
}

function Thumbnail({ src, favIconUrl }: { src?: string; favIconUrl?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-20 w-36 shrink-0 rounded border border-border object-cover object-top bg-muted"
      />
    );
  }
  const safeFavIcon = safeImageUrl(favIconUrl);
  return (
    <div className="flex h-20 w-36 shrink-0 items-center justify-center rounded border border-border bg-muted">
      {safeFavIcon ? (
        <img src={safeFavIcon} alt="" className="h-8 w-8 opacity-60" />
      ) : (
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

export default function Switcher({ onClose }: SwitcherProps) {
  const [query, setQuery] = useState("");
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [recentlyClosed, setRecentlyClosed] = useState<RecentlyClosedItem[]>(
    [],
  );
  const [historyResults, setHistoryResults] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExtensionError = useCallback((error: unknown) => {
    if (isExtensionContextInvalidatedError(error)) {
      setNeedsReload(true);
      return true;
    }
    console.warn("[tab-switcher]", error);
    return false;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNeedsReload(false);
    try {
      const [tabsRes, closedRes] = await Promise.all([
        sendToBackground({ type: "LIST_TABS" }),
        sendToBackground({ type: "LIST_RECENTLY_CLOSED" }),
      ]);
      if (tabsRes.type === "LIST_TABS") setTabs(tabsRes.tabs);
      if (closedRes.type === "LIST_RECENTLY_CLOSED")
        setRecentlyClosed(closedRes.items);
    } catch (error) {
      handleExtensionError(error);
    } finally {
      setLoading(false);
    }
  }, [handleExtensionError]);

  useEffect(() => {
    void loadData();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [loadData]);

  useEffect(() => {
    const blocker = installPageInteractionBlocker(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => blocker.release();
  }, []);

  const q = query.trim().toLowerCase();

  const filteredTabs = useMemo(() => {
    if (!q) return tabs;
    return tabs.filter(
      (t) => matchesQuery(t.title, q) || matchesQuery(t.url, q),
    );
  }, [tabs, q]);

  const filteredClosed = useMemo(() => {
    if (!q) return recentlyClosed;
    return recentlyClosed.filter(
      (t) => matchesQuery(t.title, q) || matchesQuery(t.url, q),
    );
  }, [recentlyClosed, q]);

  const localMatchCount = filteredTabs.length + filteredClosed.length;

  useEffect(() => {
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);

    if (!q || localMatchCount > 0) {
      setHistoryResults([]);
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    historyDebounceRef.current = setTimeout(() => {
      void sendToBackground({ type: "SEARCH_HISTORY", query: q })
        .then((res) => {
          if (res.type === "SEARCH_HISTORY") setHistoryResults(res.items);
        })
        .catch(handleExtensionError)
        .finally(() => setLoadingHistory(false));
    }, 150);

    return () => {
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [q, localMatchCount, handleExtensionError]);

  const activateTab = async (tab: TabItem) => {
    try {
      await sendToBackground({
        type: "ACTIVATE_TAB",
        tabId: tab.id,
        windowId: tab.windowId,
      });
      onClose();
    } catch (error) {
      handleExtensionError(error);
    }
  };

  const closeTab = async (tabId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await sendToBackground({ type: "CLOSE_TAB", tabId });
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
    } catch (error) {
      handleExtensionError(error);
    }
  };

  const restoreSession = async (sessionId: string) => {
    try {
      await sendToBackground({ type: "RESTORE_SESSION", sessionId });
      onClose();
    } catch (error) {
      handleExtensionError(error);
    }
  };

  const openHistoryUrl = async (url: string) => {
    try {
      await sendToBackground({ type: "OPEN_URL", url });
      onClose();
    } catch (error) {
      handleExtensionError(error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (
      e.key === "Delete" ||
      (e.key === "Backspace" && (e.metaKey || e.ctrlKey))
    ) {
      const selected = document.querySelector(
        '[cmdk-item][data-selected="true"]',
      );
      const tabId = selected?.getAttribute("data-tab-id");
      if (tabId) {
        e.preventDefault();
        void closeTab(Number(tabId));
      }
    }
  };

  const showHistory = q.length > 0 && localMatchCount === 0;
  const isEmpty =
    !loading &&
    filteredTabs.length === 0 &&
    filteredClosed.length === 0 &&
    (!showHistory || (!loadingHistory && historyResults.length === 0));

  return (
    <div
      className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-white/25 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-black/20 border-solid bg-neutral-50 shadow-2xl shadow-black/10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          onKeyDown={handleKeyDown}
          className="h-full bg-transparent"
        >
          <CommandInput
            ref={inputRef}
            placeholder="Search tabs by title or URL…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {needsReload && (
              <div className="py-10 px-6 text-center text-sm">
                <p className="font-medium mb-2">Extension was updated</p>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Reload this page to keep using the tab switcher.
                </p>
                <Button type="button" onClick={() => location.reload()}>
                  Reload page
                </Button>
              </div>
            )}

            {!needsReload && loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading tabs…
              </div>
            )}

            {!needsReload && !loading && filteredTabs.length > 0 && (
              <CommandGroup heading="Open tabs">
                {filteredTabs.map((tab) => (
                  <CommandItem
                    key={`tab-${tab.id}`}
                    value={`tab-${tab.id}`}
                    data-tab-id={tab.id}
                    onSelect={() => void activateTab(tab)}
                    className="group"
                  >
                    <Favicon url={tab.favIconUrl} />
                    <Thumbnail
                      src={tab.screenshot}
                      favIconUrl={tab.favIconUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{tab.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tab.url}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {tab.lastActiveAt
                          ? formatTimeAgo(tab.lastActiveAt)
                          : "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => void closeTab(tab.id, e)}
                      aria-label="Close tab"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!needsReload && !loading && filteredClosed.length > 0 && (
              <>
                {filteredTabs.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Recently closed">
                  {filteredClosed.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => void restoreSession(item.sessionId)}
                    >
                      <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="h-14 w-24 shrink-0 rounded border border-dashed border-border bg-muted/50" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.url}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          Recently closed
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {!needsReload && showHistory && (
              <>
                {(filteredTabs.length > 0 || filteredClosed.length > 0) && (
                  <CommandSeparator />
                )}
                <CommandGroup heading="History">
                  {loadingHistory && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Searching history…
                    </div>
                  )}
                  {!loadingHistory &&
                    historyResults.map((item) => (
                      <CommandItem
                        key={`history-${item.id}`}
                        value={`history-${item.id}`}
                        onSelect={() => void openHistoryUrl(item.url)}
                      >
                        <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="h-14 w-24 shrink-0 rounded border border-dashed border-border bg-muted/50" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.url}
                          </p>
                          <p className="text-xs text-muted-foreground/80">
                            {item.lastVisitTime
                              ? formatTimeAgo(item.lastVisitTime)
                              : "—"}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}

            {!needsReload && isEmpty && (
              <CommandEmpty>No matching tabs or pages.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

export default function Popup() {
  return (
    <div className="w-[280px] p-4 text-sm text-foreground bg-background/90 backdrop-blur-md">
      <p className="font-medium mb-2">Best Tab Switcher</p>
      <p className="text-muted-foreground leading-relaxed">
        Press <kbd className="px-1 py-0.5 rounded bg-muted text-foreground">Ctrl+Shift+K</kbd> on
        any page to open the switcher.
      </p>
      <p className="text-muted-foreground/80 mt-3 text-xs">
        If the shortcut conflicts with Chrome, rebind it at{' '}
        <span className="text-muted-foreground">chrome://extensions/shortcuts</span>
      </p>
    </div>
  );
}

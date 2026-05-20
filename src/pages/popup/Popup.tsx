export default function Popup() {
  return (
    <div className="w-[280px] p-4 text-sm text-neutral-200 bg-neutral-900">
      <p className="font-medium mb-2">Best Tab Switcher</p>
      <p className="text-neutral-400 leading-relaxed">
        Press <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-200">Ctrl+Shift+K</kbd> on
        any page to open the switcher.
      </p>
      <p className="text-neutral-500 mt-3 text-xs">
        If the shortcut conflicts with Chrome, rebind it at{' '}
        <span className="text-neutral-400">chrome://extensions/shortcuts</span>
      </p>
    </div>
  );
}

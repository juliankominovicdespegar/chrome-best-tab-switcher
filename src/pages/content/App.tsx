import { useCallback, useEffect, useState } from 'react';
import type { ContentMessage } from '@src/lib/messages';
import Switcher from './Switcher';

export default function App() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const listener = (
      message: ContentMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: () => void,
    ) => {
      if (message.type === 'TOGGLE_SWITCHER') {
        toggle();
        sendResponse();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [toggle]);

  if (!open) return null;

  return <Switcher onClose={close} />;
}

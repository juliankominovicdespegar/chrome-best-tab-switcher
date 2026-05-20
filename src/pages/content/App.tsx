import { useCallback, useEffect, useState } from 'react';
import { SWITCHER_HOST_ID, SWITCHER_OPEN_ATTR, setPageInert } from '@src/lib/switcherHost';
import Switcher from './Switcher';

type AppProps = {
  registerToggle: (toggle: () => void) => void;
};

function syncSwitcherOpenState(open: boolean) {
  const host = document.getElementById(SWITCHER_HOST_ID);
  if (!host) return;

  if (open) {
    host.setAttribute(SWITCHER_OPEN_ATTR, '');
    setPageInert(true);
  } else {
    host.removeAttribute(SWITCHER_OPEN_ATTR);
    setPageInert(false);
  }
}

export default function App({ registerToggle }: AppProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((previous) => {
      const next = !previous;
      syncSwitcherOpenState(next);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    syncSwitcherOpenState(false);
    setOpen(false);
  }, []);

  useEffect(() => {
    registerToggle(toggle);
    return () => registerToggle(() => {});
  }, [toggle, registerToggle]);

  useEffect(() => {
    return () => syncSwitcherOpenState(false);
  }, []);

  if (!open) return null;

  return <Switcher onClose={close} />;
}

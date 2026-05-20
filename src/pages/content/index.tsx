import { createRoot, type Root } from 'react-dom/client';
import styles from './styles.css?inline';
import App from './App';

const HOST_ID = 'best-tab-switcher-host';

let hostEl: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

function mount() {
  if (hostEl) return;

  hostEl = document.createElement('div');
  hostEl.id = HOST_ID;
  hostEl.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(styles);
  shadow.adoptedStyleSheets = [styleSheet];

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  reactRoot = createRoot(mountPoint);
  reactRoot.render(<App />);
}

mount();

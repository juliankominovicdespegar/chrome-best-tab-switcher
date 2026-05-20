import { initTracking } from './tracking';
import { initScreenshots } from './screenshots';
import { initCommands } from './commands';
import { initMessageHandler } from './messages';

void initTracking();
initScreenshots();
initCommands();
initMessageHandler();

console.log('[tab-switcher] background ready');

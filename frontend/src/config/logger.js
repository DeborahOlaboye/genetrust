import { APP_CONFIG } from './app.js';

const prefix = '[GeneTrust]';

export const logger = {
  debug: (...args) => {
    if (APP_CONFIG.enableDebugLogs) console.debug(prefix, ...args);
  },
  info: (...args) => {
    if (APP_CONFIG.enableDebugLogs) console.info(prefix, ...args);
  },
  warn: (...args) => console.warn(prefix, ...args),
  error: (...args) => console.error(prefix, ...args),
};

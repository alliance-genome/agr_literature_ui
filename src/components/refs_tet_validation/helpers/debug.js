// Lightweight debug logging for the TET validation grid. All console output is
// silenced unless REACT_APP_DEBUG === 'true', so production builds stay quiet
// while developers can opt in by setting the env var (matches the existing
// REACT_APP_* convention used elsewhere in the UI).
/* eslint-disable no-console */
const enabled = process.env.REACT_APP_DEBUG === 'true';

export const debug = {
  log: (...args) => {
    if (enabled) console.log(...args);
  },
  warn: (...args) => {
    if (enabled) console.warn(...args);
  },
  error: (...args) => {
    if (enabled) console.error(...args);
  },
};

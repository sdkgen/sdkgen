export function setupPolyfills(): void {
  // eslint-disable-next-line global-require
  window.Buffer = require("buffer");
}

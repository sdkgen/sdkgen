/* eslint-disable camelcase */
import { ConfigEnvs } from ".";

export function setupServiceWorker(configEnvs: ConfigEnvs): void {
  if (!configEnvs.isProductionBuild) {
    return;
  } // Should not use service worker on development mode

  // eslint-disable-next-line global-require
  const runtime = require("offline-plugin/runtime");

  runtime.install({
    onUpdateReady: () => runtime.applyUpdate(),
    // Tslint:disable-next-line: deprecation
    onUpdated: () => window.location.reload(true),
  });

  try {
    if (localStorage.getItem("build") !== __webpack_hash__) {
      localStorage.setItem("build", __webpack_hash__);
      runtime.update();
    }
  } catch {
    runtime.update();
  }
}

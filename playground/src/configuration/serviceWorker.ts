/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import type { ConfigEnvs } from ".";

export function setupServiceWorker(configEnvs: ConfigEnvs): void {
  if (!configEnvs.isProductionBuild) {
    return;
  } // Should not use service worker on development mode

  const runtime = require("offline-plugin/runtime");

  runtime.install({
    onUpdateReady: () => runtime.applyUpdate(),
    onUpdated: () => window.location.reload(),
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

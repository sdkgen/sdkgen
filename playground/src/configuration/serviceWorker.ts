import { ConfigEnvs } from ".";

export function setupServiceWorker(configEnvs: ConfigEnvs) {
  if (!configEnvs.isProductionBuild) return; //should not use service worker on development mode

  const runtime = require("offline-plugin/runtime");
  runtime.install({
    onUpdateReady: () => runtime.applyUpdate(),
    // tslint:disable-next-line: deprecation
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

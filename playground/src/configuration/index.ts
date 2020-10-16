import { setupPolyfills } from "./polyfills";
import { setupServiceWorker } from "./serviceWorker";

// IS BUILDING FOR PRODUCTION
const isProductionBuild = process.env.NODE_ENV === "production";

export interface ConfigEnvs {
  isProductionBuild: boolean;
}

export function setupConfiguration(): void {
  const configEnvs: ConfigEnvs = {
    isProductionBuild,
  };

  setupPolyfills();
  setupServiceWorker(configEnvs);
}

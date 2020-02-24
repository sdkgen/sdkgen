import { setupAnalytics } from "./analytics";
import { setupEndpoint } from "./endpoint";
import { setupPolyfills } from "./polyfills";
import { setupSentry } from "./sentry";
import { setupServiceWorker } from "./serviceWorker";

// IS BUILDING FOR PRODUCTION
const isProductionBuild = process.env.NODE_ENV === "production";

// API ENDPOINT, BE AWARE OF DANGER
const isMaster = process.env.CI_COMMIT_REF_NAME === "master";
const isStaging = process.env.CI_COMMIT_REF_NAME === "staging";
const isDevelop = process.env.CI_COMMIT_REF_NAME === "develop";

export interface ConfigEnvs {
	isProductionBuild: boolean;
	isMaster: boolean;
	isStaging: boolean;
	isDevelop: boolean;
	edition: Edition;
}

export type Edition = "enterprise" | "admin";

export function setupConfiguration(edition: Edition) {
	const configEnvs: ConfigEnvs = {
		isProductionBuild,
		isMaster,
		isStaging,
		isDevelop,
		edition,
	};
	setupEndpoint(configEnvs);
	setupPolyfills();
	setupAnalytics(configEnvs);
	setupSentry(configEnvs);
	setupServiceWorker(configEnvs);
}

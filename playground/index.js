import { join } from "path";
import { fileURLToPath } from "url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

// eslint-disable-next-line
export const PLAYGROUND_PUBLIC_PATH = join(currentDir, "./dist");

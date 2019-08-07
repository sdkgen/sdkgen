import { BaseApiConfig } from "./config";

export abstract class SdkgenServer {
    constructor(protected apiConfig: BaseApiConfig) {}
}

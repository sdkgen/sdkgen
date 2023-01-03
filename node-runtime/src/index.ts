export { BaseApiConfig } from "./api-config.js";
export type { Middleware as SdkgenMiddleware } from "./api-config.js";
export type { Context, ContextReply, ContextRequest } from "./context.js";
export { decode, encode } from "./encode-decode.js";
export { Fatal, SdkgenError, SdkgenErrorWithData } from "./error.js";
export { SdkgenHttpClient } from "./http-client.js";
export { SdkgenHttpServer } from "./http-server.js";
export { apiTestWrapper } from "./test-wrapper.js";
export {
  startSdkgenServer,
  createSdkgenEndpoint,
  createSdkgenType,
  createSdkgenTestClient,
  Uuid,
  Int,
  UInt,
  encodeValue,
  decodeValue,
  type TypeSpec,
  type GenerateTyping,
  type GenerateTypingFromFields,
} from "./new-interface.js";

export interface DefaultExtraContext {}

import type { IncomingHttpHeaders, OutgoingHttpHeader } from "http";
import type { Readable } from "stream";

export interface ContextRequest {
  args: Record<string, unknown>;
  deviceInfo: {
    id: string;
    language: string | null;
    platform: unknown;
    timezone: string | null;
    type: string;
    version: string | null;
    fingerprint: string | null;
  };
  extra: Record<string, unknown>;
  headers: IncomingHttpHeaders;
  id: string;
  ip: string;
  name: string;
  version: number;
  files: Array<{
    name: string;
    contents: Readable;
  }>;
}

export interface ContextReply {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
  result?: unknown;
}

export interface ContextResponse {
  statusCode?: number;
  headers: Map<string, OutgoingHttpHeader>;
}

export interface Context {
  request: ContextRequest;
  response: ContextResponse;
}

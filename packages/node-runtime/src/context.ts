import type { IncomingHttpHeaders } from "http";
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
  error?: any;
  result?: unknown;
}

export interface Context {
  request: ContextRequest;
}

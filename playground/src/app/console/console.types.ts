export enum ConsoleItemType {
  INFO = "info",
  ERROR = "error",
  WARN = "warn",
  DEBUG = "debug",
  NETWORK = "network",
}

export interface ConsoleItem {
  type: ConsoleItemType;
  message: string;
  details?: any;
}

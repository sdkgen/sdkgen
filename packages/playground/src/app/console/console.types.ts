export enum ConsoleItemType {
  INFO = "info",
  ERROR = "error",
  NETWORK = "network",
}

export interface ConsoleItem {
  type: ConsoleItemType;
  message: string;
  details?: any;
}

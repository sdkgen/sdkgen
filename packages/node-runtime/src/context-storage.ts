import { AsyncLocalStorage } from "async_hooks";

import type { Context } from "./context";

export const contextStorage = new AsyncLocalStorage<Context>();

export function useSdkgenContext<ExtraContextT = unknown>() {
  const context = contextStorage.getStore() as (Context & ExtraContextT) | undefined;

  if (!context) {
    throw new Error("An sdkgen context isn't available at this scope");
  }

  return context;
}

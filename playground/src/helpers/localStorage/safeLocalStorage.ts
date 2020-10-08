import { storageFactory } from "storage-factory";

export const safeLocalStorage = storageFactory(() => localStorage);

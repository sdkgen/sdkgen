import { Injectable } from "@angular/core";

const storageKey = "sdkgenPlaygroundGlobalExtras";

/**
 * Extras sent with every request, from every tab. Per-request extras take
 * precedence over these.
 */
@Injectable({ providedIn: "root" })
export class GlobalExtrasService {
  /** The editor text, kept exactly as the user wrote it. */
  public text = "";

  public extras: Record<string, unknown> = {};

  constructor() {
    const stored = this.readStorage();

    if (stored === null) {
      return;
    }

    this.text = stored;

    try {
      this.extras = this.parseExtras(stored);
    } catch {
      // A bad stored value must not stop the playground from opening.
    }
  }

  public get count() {
    return Object.keys(this.extras).length;
  }

  /** Replaces the global extras. Throws if the text isn't a JSON object. */
  public save(text: string) {
    this.extras = this.parseExtras(text);
    this.text = text;
    this.writeStorage(text);
  }

  private parseExtras(text: string): Record<string, unknown> {
    if (!text.trim()) {
      return {};
    }

    const parsed: unknown = JSON.parse(text);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Os extras globais precisam ser um objeto JSON.");
    }

    return parsed as Record<string, unknown>;
  }

  private readStorage() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  private writeStorage(text: string) {
    try {
      if (text.trim()) {
        localStorage.setItem(storageKey, text);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Private mode, blocked storage, etc: carry on in memory only.
    }
  }
}

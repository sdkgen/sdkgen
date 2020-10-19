export class SdkgenError extends Error {
  get type(): string {
    return this.constructor.name;
  }

  public toJSON(): { message: string; type: string } {
    return {
      message: this.message,
      type: this.type,
    };
  }
}

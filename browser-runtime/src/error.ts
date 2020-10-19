export abstract class SdkgenError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }

  public toJSON(): { message: string; type: string } {
    return {
      message: this.message,
      type: this.constructor.name,
    };
  }
}

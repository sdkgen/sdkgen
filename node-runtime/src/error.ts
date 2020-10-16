export class SdkgenError extends Error {
  get type() {
    return this.constructor.name;
  }

  public toJSON() {
    return {
      message: this.message,
      type: this.type,
    };
  }
}

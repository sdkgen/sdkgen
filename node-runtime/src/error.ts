export abstract class SdkgenError extends Error {
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
export abstract class SdkgenErrorWithData<DataType> extends SdkgenError {
  constructor(
    message: string,
    public data: DataType,
  ) {
    super(message);
  }

  public toJSON(): { data: DataType; message: string; type: string } {
    return {
      data: this.data,
      message: this.message,
      type: this.type,
    };
  }
}

export class Fatal extends SdkgenError {}

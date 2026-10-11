export abstract class SdkgenError extends Error {
  type: string;

  constructor(message: string, type: string) {
    super(message);
    this.message = message;
    this.type = type;
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
    type: string,
    public data: DataType,
  ) {
    super(message, type);
  }

  public toJSON(): { data: DataType; message: string; type: string } {
    return {
      data: this.data,
      message: this.message,
      type: this.type,
    };
  }
}

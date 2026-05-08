import { encode } from "../src/encode-decode";

type Uint8ArrayWithBase64 = Uint8Array & {
  toBase64?(): string;
};

describe("Encode/Decode", () => {
  test("encodes small bytes ArrayBuffer as base64", () => {
    const bytes = new Uint8Array([65, 66, 67, 255, 0]);

    const encoded = encode({}, "test", "bytes", bytes.buffer);

    expect(encoded).toBe("QUJD/wA=");
    expect(atob(encoded as string).length).toBe(5);
  });

  test("encodes bytes ArrayBuffer larger than the function argument limit", () => {
    const buffer = new ArrayBuffer(100000);

    new Uint8Array(buffer).fill(65);

    const encoded = encode({}, "test", "bytes", buffer);

    expect(typeof encoded).toBe("string");
    expect(atob(encoded as string).length).toBe(100000);
    expect(encoded).toBe(Buffer.from(new Uint8Array(buffer)).toString("base64"));
  });

  test("encodes bytes Uint8Array as base64", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);

    expect(encode({}, "test", "bytes", bytes)).toBe("SGVsbG8=");
  });

  test("uses native Uint8Array base64 encoding when available", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]) as Uint8ArrayWithBase64;

    bytes.toBase64 = jest.fn(() => "SGVsbG8=");

    expect(encode({}, "test", "bytes", bytes)).toBe("SGVsbG8=");
    expect(bytes.toBase64).toHaveBeenCalledTimes(1);
  });
});

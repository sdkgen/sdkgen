import { SdkgenError } from "../src";

class TestError extends SdkgenError {}

describe("Error", () => {
  test("SdkgenError behaves as expected", () => {
    const err1 = new TestError("the error message");

    expect(err1.message).toEqual("the error message");
    expect(err1.type).toEqual("TestError");
    expect(JSON.parse(JSON.stringify(err1))).toEqual({ type: "TestError", message: "the error message" });
  });
});

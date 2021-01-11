/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { decode, encode } from "../src";

describe("Encode/Decode", () => {
  test("Process CPF", () => {
    expect(encode({}, "", "cpf", "067.183.145-36")).toBe("06718314536");
    expect(decode({}, "", "cpf", "06718314536")).toBe("067.183.145-36");
    expect(() => {
      encode({}, "", "cpf", "067.183.145-35");
    }).toThrow();
    expect(() => {
      decode({}, "", "cpf", "06718314535");
    }).toThrow();
  });

  test("Process CNPJ", () => {
    expect(encode({}, "", "cnpj", "18.571.767/0001-36")).toBe("18571767000136");
    expect(decode({}, "", "cnpj", "18571767000136")).toBe("18.571.767/0001-36");
    expect(() => {
      encode({}, "", "cnpj", "18.571.767/0001-35");
    }).toThrow();
    expect(() => {
      decode({}, "", "cnpj", "18571767000135");
    }).toThrow();
  });

  test("Process URL", () => {
    expect(encode({}, "", "url", "https://cubos.io/")).toBe("https://cubos.io/");
    expect(decode({}, "", "url", "https://cubos.io/")).toBe("https://cubos.io/");
    expect(encode({}, "", "url", " https:cubos.io/  ")).toBe("https://cubos.io/");
    expect(encode({}, "", "url", " https:cubos.io  ")).toBe("https://cubos.io/");
    expect(() => {
      encode({}, "", "url", "dfbdfb");
    }).toThrow();
    expect(() => {
      decode({}, "", "url", "hhh.com");
    }).toThrow();
  });

  test("Process Base64", () => {
    expect(encode({}, "", "base64", "c3VyZS4=")).toBe("c3VyZS4=");
    expect(encode({}, "", "base64", "")).toBe("");
    expect(() => {
      encode({}, "", "base64", "c3VyZS4");
    }).toThrow();
    expect(() => {
      encode({}, "", "base64", " c3VyZS4=");
    }).toThrow();
    expect(decode({}, "", "base64", "c3VyZS4=")).toBe("c3VyZS4=");
    expect(decode({}, "", "base64", "")).toBe("");
    expect(() => {
      decode({}, "", "base64", "c3VyZS4");
    }).toThrow();
    expect(() => {
      decode({}, "", "base64", " c3VyZS4=");
    }).toThrow();
  });

  test("Process Date", () => {
    expect(encode({}, "", "date", new Date("2020-11-10T00:00:00Z"))).toBe("2020-11-10");
    expect(encode({}, "", "date", new Date("2020-11-10T15:34:50Z"))).toBe("2020-11-10");
    expect(encode({}, "", "date", "2020-11-10")).toBe("2020-11-10");
    expect(() => {
      encode({}, "", "date", "2020-11-10T15:34:50Z");
    }).toThrow();
    expect(() => {
      encode({}, "", "date", "hello world");
    }).toThrow();
    expect(() => {
      decode({}, "", "date", "2020-02-30");
    }).toThrow();
  });

  test("Process Datetime", () => {
    expect(encode({}, "", "datetime", new Date("2020-11-10T15:34:50Z"))).toBe("2020-11-10T15:34:50.000");
    expect(encode({}, "", "datetime", "2020-11-10T15:34:50Z")).toBe("2020-11-10T15:34:50.000");
    expect(encode({}, "", "datetime", "2020-11-10T15:34:50.999")).toBe("2020-11-10T15:34:50.999");
    expect(encode({}, "", "datetime", "2020-11-10T15:34:50+01:00")).toBe("2020-11-10T14:34:50.000");
    expect(encode({}, "", "datetime", "2020-11-10T15:34:50.999+01:00")).toBe("2020-11-10T14:34:50.999");
    expect(() => {
      encode({}, "", "datetime", "2020-11-10");
    }).toThrow();
    expect(() => {
      encode({}, "", "datetime", "hello world");
    }).toThrow();
    expect(() => {
      encode({}, "", "datetime", "2020-11-10T15:34:50.999$01:00");
    }).toThrow();
    expect(() => {
      decode({}, "", "datetime", "2020-11-10T15:34:50.999$01:00");
    }).toThrow();
    expect(decode({}, "", "datetime", "2020-11-10T15:34:50Z").getTime()).toBe(new Date("2020-11-10T15:34:50Z").getTime());
    expect(decode({}, "", "datetime", "2020-11-10T15:34:50.000").getTime()).toBe(new Date("2020-11-10T15:34:50Z").getTime());
  });

  test("Process BigInt", () => {
    expect(encode({}, "", "bigint", BigInt(10))).toBe("10");
    expect(() => {
      encode({}, "", "bigint", 10);
    }).toThrow();
    expect(() => {
      encode({}, "", "bigint", "10");
    }).toThrow();
    expect(decode({}, "", "bigint", 10)).toBe(BigInt(10));
    expect(decode({}, "", "bigint", "10")).toBe(BigInt(10));
    expect(() => {
      decode({}, "", "bigint", "hello world");
    }).toThrow();
  });
});

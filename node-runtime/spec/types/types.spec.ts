import { decode, encode } from "../../src";

describe("Encode/Decode", () => {
    test("Process CPF", async () => {
        expect(encode({}, "", "cpf", "067.183.145-36")).toBe("06718314536");
        expect(decode({}, "", "cpf", "06718314536")).toBe("067.183.145-36");
        expect(() => {
            encode({}, "", "cpf", "067.183.145-35");
        }).toThrow();
        expect(() => {
            decode({}, "", "cpf", "06718314535");
        }).toThrow();
    });

    test("Process CNPJ", async () => {
        expect(encode({}, "", "cnpj", "18.571.767/0001-36")).toBe("18571767000136");
        expect(decode({}, "", "cnpj", "18571767000136")).toBe("18.571.767/0001-36");
        expect(() => {
            encode({}, "", "cnpj", "18.571.767/0001-35");
        }).toThrow();
        expect(() => {
            decode({}, "", "cnpj", "18571767000135");
        }).toThrow();
    });

    test("Process URL", async () => {
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

    test("Process Base64", async () => {
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
});

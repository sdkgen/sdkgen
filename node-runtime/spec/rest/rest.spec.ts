import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";
import { unlinkSync, writeFileSync } from "fs";
import { Context, SdkgenHttpServer } from "../../src";

const ast = new Parser(`${__dirname}/api.sdkgen`).parse();

writeFileSync(`${__dirname}/api.ts`, generateNodeServerSource(ast, {}).replace("@sdkgen/node-runtime", "../../src"));
const { api } = require(`${__dirname}/api.ts`);
unlinkSync(`${__dirname}/api.ts`);

api.fn.add = async (ctx: Context, { first, second }: { first: number; second: string }) => {
    return `${first}${second}`;
};

api.fn.maybe = async (ctx: Context, { bin }: { bin: string | null }) => {
    return bin !== null ? Buffer.from(bin, "hex") : null;
};

api.fn.hex = async (ctx: Context, { bin }: { bin: Buffer }) => {
    return bin.toString("hex");
};

api.fn.obj = async (ctx: Context, { obj }: { obj: { val: number } }) => {
    if (obj.val === 0) {
        throw "Value is zero ~ spec error";
    }
    return obj;
};

writeFileSync(
    `${__dirname}/nodeClient.ts`,
    generateNodeClientSource(ast, {}).replace("@sdkgen/node-runtime", "../../src"),
);
const { ApiClient: NodeApiClient } = require(`${__dirname}/nodeClient.ts`);
unlinkSync(`${__dirname}/nodeClient.ts`);

const nodeClient = new NodeApiClient("http://localhost:8001");

const server = new SdkgenHttpServer(api, { aaa: true });

describe("Rest API", () => {
    beforeAll(() => {
        server.listen(8001);
    });

    afterAll(async () => {
        await server.close();
    });

    test("add with sdkgen", async () => {
        expect(await nodeClient.add(null, { first: 1, second: "aa" })).toEqual("1aa");
    });

    const table = [
        { method: "GET", path: "/add1/1/aa", result: "1aa" },
        { method: "GET", path: "/add1/1/aa/", result: "1aa" },
        {
            method: "GET",
            path: "/add1/1/aa",
            result: '"1aa"',
            headers: {
                accept: "application/json",
            },
        },
        { method: "GET", path: "/add2?second=aa&first=1", result: "1aa" },
        { method: "GET", path: "/add2?first=1&second=aa", result: "1aa" },
        {
            method: "GET",
            path: "/add3?first=1",
            result: "1aa",
            headers: {
                "x-second": "aa",
            },
        },
        {
            method: "GET",
            path: "/add3?first=1",
            result: '"1aa"',
            headers: {
                accept: "application/json",
                "x-second": "aa",
            },
        },
        {
            method: "POST",
            path: "/add4",
            result: "1aa",
            headers: {
                "x-second": "aa",
            },
            data: "1",
        },
        {
            method: "POST",
            path: "/add4",
            result: '"1aa"',
            headers: {
                accept: "application/json",
                "x-second": "aa",
            },
            data: "1",
        },
        {
            method: "POST",
            path: "/add5",
            result: "1aa",
            headers: {
                "x-first": "1",
            },
            data: "aa",
        },
        {
            method: "POST",
            path: "/add5",
            result: "1aa",
            headers: {
                "content-type": "application/json",
                "x-first": "1",
            },
            data: '"aa"',
        },
        {
            method: "POST",
            path: "/add5",
            result: '"1aa"',
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "x-first": "1",
            },
            data: '"aa"',
        },
        {
            method: "GET",
            path: "/maybe",
            result: "",
            statusCode: 404,
        },
        {
            method: "GET",
            path: "/maybe?bin=4d546864",
            result: "MThd",
            resultHeaders: {
                "content-type": "audio/midi",
            },
        },
        {
            method: "GET",
            path: "/maybe?bin=61",
            result: "a",
            resultHeaders: {
                "content-type": "application/octet-stream",
            },
        },
        {
            method: "GET",
            path: "/maybe?bin=61",
            result: '"YQ=="',
            headers: {
                accept: "application/json",
            },
        },
        {
            method: "POST",
            path: "/maybe",
            result: "",
            statusCode: 204,
        },
        {
            method: "POST",
            path: "/maybe",
            result: "a",
            resultHeaders: {
                "content-type": "application/octet-stream",
            },
            data: "61",
        },
        {
            method: "POST",
            path: "/hex",
            result: "61",
            data: "a",
        },
        {
            method: "POST",
            path: "/obj",
            result: `{"val":15}`,
            data: `{"val":15}`,
            resultHeaders: {
                "content-type": "application/json",
            },
        },
        {
            method: "POST",
            path: "/obj",
            result: `{"message":"Value is zero ~ spec error","type":"Fatal"}`,
            data: `{"val":0}`,
            statusCode: 400,
            resultHeaders: {
                "content-type": "application/json",
            },
        },
    ];

    for (const { method, path, result, headers, data, statusCode, resultHeaders } of table) {
        test(`${method} ${path}` + (headers ? ` with headers ${JSON.stringify(headers)}` : ""), async () => {
            const response = await axios.request({
                url: "http://localhost:8001" + path,
                method: method as any,
                transformResponse: [data => data],
                headers,
                data,
                validateStatus: () => true,
            });

            expect(response.data).toEqual(result);
            expect(response.status).toEqual(statusCode ?? 200);
            expect(response.headers).toMatchObject(resultHeaders ?? {});
        });
    }
});

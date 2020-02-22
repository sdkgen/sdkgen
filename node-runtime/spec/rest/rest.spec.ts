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

writeFileSync(
    `${__dirname}/nodeClient.ts`,
    generateNodeClientSource(ast, {}).replace("@sdkgen/node-runtime", "../../src"),
);
const { ApiClient: NodeApiClient } = require(`${__dirname}/nodeClient.ts`);
unlinkSync(`${__dirname}/nodeClient.ts`);

const nodeClient = new NodeApiClient("http://localhost:8001");

const server = new SdkgenHttpServer(api, { aaa: true });

function get(path: string, headers?: any) {
    return axios.get("http://localhost:8001" + path, {
        transformResponse: [
            data => {
                return data;
            },
        ],
        headers,
    });
}

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
    ];

    for (const { method, path, result, headers, data } of table) {
        test(`${method} ${path}` + (headers ? ` with headers ${JSON.stringify(headers)}` : ""), async () => {
            expect(
                await axios.request({
                    url: "http://localhost:8001" + path,
                    method: method as any,
                    transformResponse: [data => data],
                    headers,
                    data,
                }),
            ).toMatchObject({
                data: result,
            });
        });
    }
});

import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import { unlinkSync, writeFileSync } from "fs";
import { Context, SdkgenHttpServer } from "../../src";
import axios from "axios";

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

describe("Rest API", () => {
    beforeAll(() => {
        server.listen(8001);
    });

    afterAll(async () => {
        await server.close();
    });

    test("add with sdkgen", async () => {
        expect(await nodeClient.add(null, { first: 1, second: "aa" })).toEqual("1aa");

        expect(
            await axios.get("http://localhost:8001/add/1/aa", {
                transformResponse: [
                    data => {
                        return data;
                    },
                ],
            }),
        ).toMatchObject({
            data: "1aa",
        });

        expect(
            await axios.get("http://localhost:8001/add/1/aa", {
                transformResponse: [
                    data => {
                        return data;
                    },
                ],
                headers: {
                    accept: "application/json",
                },
            }),
        ).toMatchObject({
            data: '"1aa"',
        });

        expect(
            await axios.get("http://localhost:8001/add2?second=aa&first=1", {
                transformResponse: [
                    data => {
                        return data;
                    },
                ],
            }),
        ).toMatchObject({
            data: "1aa",
        });
    });
});

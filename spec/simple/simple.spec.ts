// execSync(`../../cubos/sdkgen/sdkgen ${__dirname + "/api.sdkgen"} -o ${__dirname + "/legacyNodeClient.ts"} -t typescript_nodeclient`);
writeFileSync(__dirname + "/api.ts", generateNodeServerSource(new Parser(__dirname + "/api.sdkgen").parse(), {}).replace("@sdkgen/node-runtime", "../../src"));
writeFileSync(__dirname + "/nodeClient.ts", generateNodeClientSource(new Parser(__dirname + "/api.sdkgen").parse(), {}).replace("@sdkgen/node-runtime", "../../src"));

import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { Context, SdkgenHttpServer } from "../../src";
import { AllTypes, ApiConfig } from "./api";
import { ApiClient as NodeLegacyApiClient } from "./legacyNodeClient";
import { ApiClient as NodeApiClient } from "./nodeClient";

const api = new ApiConfig<{aaa: boolean}>();

let lastCallCtx: Context & {aaa: boolean} = null as any;
api.fn.getUser = async (ctx: Context & { aaa: boolean }, { id }: { id: string }) => {
    lastCallCtx = ctx;
    return {
        age: 1,
        name: id
    };
};

api.fn.identity = async (ctx: Context & { aaa: boolean }, { types }: { types: any }) => {
    lastCallCtx = ctx;
    return types;
};

const nodeLegacyClient = new NodeLegacyApiClient("http://localhost:8000");
const nodeClient = new NodeApiClient("http://localhost:8000");

const server = new SdkgenHttpServer(api, {aaa: true});

describe("Simple API", () => {
    beforeAll(() => {
        server.listen();
    });

    afterAll(() => {
        server.close();
    });

    test("Healthcheck on any GET route", async () => {
        expect(await axios.get("http://localhost:8000/")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/egesg")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/erh/eh/erh/erh/er")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/oqpfnaewilfewigbwugbhlbiuas")).toMatchObject({data: {ok: true}});
    });

    test("Can make a call from legacy node client", async () => {
        expect(await nodeLegacyClient.getUser("abc")).toEqual({age: 1, name: "abc"});
        expect(await nodeLegacyClient.getUser("5hdr")).toEqual({age: 1, name: "5hdr"});

        expect(lastCallCtx.request).toMatchObject({name: "getUser", deviceInfo: {type: "node"}});
        expect(lastCallCtx.aaa).toBe(true);
    });

    test("Can make a call from newer node client", async () => {
        expect(await nodeClient.getUser(null, {id: "abc"})).toEqual({ age: 1, name: "abc" });
        expect(await nodeClient.getUser(null, {id: "5hdr"})).toEqual({ age: 1, name: "5hdr" });

        expect(lastCallCtx.request).toMatchObject({ name: "getUser", deviceInfo: { type: "node" } });
    });

    test("Can process all types as identity", async () => {
        const types: AllTypes = {
            int: -25,
            uint: 243,
            float: 22235.6,
            string: "efvregare",
            uuid: "f84c4d20-eed8-4004-b236-74aaa71fbeca",
            bool: true,
            any: [{a: 23, b: "odcbu"}],
            hex: "f84c4d20",
            base64: "SGVsbG8K",
            money: 356,
            latlng: {lat: 24.26, lng: -123.1346},
            enum: "aa",
            struct: {aa: 42},
            optional1: null,
            optional2: 2525,
            array: [1, 2, 3],
            arrayOfOptionals: [1, null, 3],
            bytes: randomBytes(23),
            date: new Date(2019, 12, 3),
            datetime: new Date()
        };
        expect(await nodeClient.identity(null, { types })).toEqual(types);
    });
});

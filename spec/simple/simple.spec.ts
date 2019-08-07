import { Parser } from "@sdkgen/parser";
import { generateNodeClientSource, generateNodeServerSource } from "@sdkgen/typescript-generator";
import axios from "axios";
import { unlinkSync, writeFileSync } from "fs";
import { Context, SdkgenHttpServer } from "../../src";

writeFileSync(__dirname + "/api.ts", generateNodeServerSource(new Parser(__dirname + "/api.sdkgen").parse(), {}).replace("@sdkgen/node-runtime", "../../src"));
const { api } = require(__dirname + "/api.ts");
unlinkSync(__dirname + "/api.ts");

let lastCallCtx: Context = null as any;
api.fn.getUser = async (ctx: Context, { id }: { id: string }) => {
    lastCallCtx = ctx;
    return {
        age: 1,
        name: id
    }
};

const server = new SdkgenHttpServer(api);
server.listen();

// execSync(`../../cubos/sdkgen/sdkgen ${__dirname + "/api.sdkgen"} -o ${__dirname + "/legacyNodeClient.ts"} -t typescript_nodeclient`);
const { ApiClient: NodeLegacyApiClient } = require(__dirname + "/legacyNodeClient.ts");
const nodeLegacyClient = new NodeLegacyApiClient("http://localhost:8000");

writeFileSync(__dirname + "/nodeClient.ts", generateNodeClientSource(new Parser(__dirname + "/api.sdkgen").parse(), {}).replace("@sdkgen/node-runtime", "../../src"));
const { ApiClient: NodeApiClient } = require(__dirname + "/nodeClient.ts");
unlinkSync(__dirname + "/nodeClient.ts");
const nodeClient = new NodeApiClient("http://localhost:8000");

describe("Simple API", () => {
    test("Healthcheck on any GET route", async () => {
        expect(await axios.get("http://localhost:8000/")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/egesg")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/erh/eh/erh/erh/er")).toMatchObject({data: {ok: true}});
        expect(await axios.get("http://localhost:8000/oqpfnaewilfewigbwugbhlbiuas")).toMatchObject({data: {ok: true}});
    });

    afterAll(() => {
        server.close();
    });

    test("Can make a call from legacy node client", async () => {
        expect(await nodeLegacyClient.getUser("abc")).toEqual({age: 1, name: "abc"});
        expect(await nodeLegacyClient.getUser("5hdr")).toEqual({age: 1, name: "5hdr"});

        expect(lastCallCtx.request).toMatchObject({name: "getUser", deviceInfo: {type: "node"}});
    });

    test("Can make a call from newer node client", async () => {
        expect(await nodeClient.getUser(null, {id: "abc"})).toEqual({ age: 1, name: "abc" });
        expect(await nodeClient.getUser(null, {id: "5hdr"})).toEqual({ age: 1, name: "5hdr" });

        expect(lastCallCtx.request).toMatchObject({ name: "getUser", deviceInfo: { type: "node" } });
    });
});
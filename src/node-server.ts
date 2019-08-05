import { AstRoot } from "@sdkgen/parser";
import { writeFileSync } from "fs";
import { generateTypescriptEnum, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

interface Options {
    outputFile: string
}

export function generateNodeServerSource(ast: AstRoot, options: Options) {
    let code = "";

    code += `import { Context, SdkgenHttpServer, BaseApiConfig } from "@sdkgen/node-runtime";

`;

    for (const type of ast.enumTypes) {
        code += generateTypescriptEnum(type);
    }
    code += "\n";

    for (const type of ast.structTypes) {
        code += generateTypescriptInterface(type);
        code += "\n";
    }

    const typeTable: any = {};

    for (const { name, fields } of ast.structTypes) {
        const obj: any = typeTable[name] = {};
        for (const field of fields) {
            obj[field.name] = field.type.name;
        }
    }

    for (const { name, values } of ast.enumTypes) {
        typeTable[name] = values;
    }

    const functions: any = {}
    for (const op of ast.operations) {
        const args: any = {};
        for (const arg of op.args) {
            args[arg.name] = arg.type.name
        }
        functions[op.prettyName] = {
            args,
            ret: op.returnType.name
        }
    }

    code += `class ApiConfig extends BaseApiConfig {
    fn: {${
        ast.operations.map(op => `
        ${op.prettyName}?: (ctx: Context, args: {${op.args.map(arg =>
            `${arg.name}: ${generateTypescriptTypeName(arg.type)}`
        ).join(", ")}}) => Promise<${generateTypescriptTypeName(op.returnType)}>`).join("")}
    } = {}

    typeTable = ${JSON.stringify(typeTable, null, 4).replace(/"(\w+)":/g, '$1:').replace(/\n/g, "\n    ")}

    functions = ${JSON.stringify(functions, null, 4).replace(/"(\w+)":/g, '$1:').replace(/\n/g, "\n    ")}
}

export const api = new ApiConfig();
const server = new SdkgenHttpServer(api);

export function start() {
    server.listen();
}
`;

    writeFileSync(options.outputFile, code);
}

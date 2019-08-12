import { AstRoot, astToJson } from "@sdkgen/parser";
import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

interface Options {
}

export function generateNodeClientSource(ast: AstRoot, options: Options) {
    let code = "";

    code += `import { Context, SdkgenHttpClient } from "@sdkgen/node-runtime";

`;

    for (const type of ast.enumTypes) {
        code += generateTypescriptEnum(type);
    }
    code += "\n";

    for (const type of ast.structTypes) {
        code += generateTypescriptInterface(type);
        code += "\n";
    }

    for (const error of ast.errors) {
        code += generateTypescriptErrorClass(error);
        code += "\n";
    }

    code += `export class ApiClient extends SdkgenHttpClient {
    constructor(baseUrl: string) {
        super(baseUrl, astJson, errClasses);
    }
${ast.operations.map(op => `
    ${op.prettyName}(ctx: Context | null, args: {${op.args.map(arg =>
        `${arg.name}${arg.type.name.endsWith("?") ? "?" : ""}: ${generateTypescriptTypeName(arg.type)}`
    ).join(", ")}}): Promise<${generateTypescriptTypeName(op.returnType)}> { return this.makeRequest(ctx, "${op.prettyName}", args); }`).join("")}
}\n\n`;

    code += `const errClasses = {\n${ast.errors.map(err => `    ${err},\n`)}};\n\n`;

    code += `const astJson = ${JSON.stringify(astToJson(ast), null, 4).replace(/"(\w+)":/g, '$1:')}`;

    return code;
}

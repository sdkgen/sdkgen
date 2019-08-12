import { AstRoot, astToJson } from "@sdkgen/parser";
import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

interface Options {
}

export function generateBrowserClientSource(ast: AstRoot, options: Options) {
    let code = "";

    code += `import { SdkgenHttpClient } from "@sdkgen/browser-runtime";

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
        super(baseUrl, astJson);
    }
${ast.operations.map(op => `
    ${op.prettyName}(args: {${op.args.map(arg =>
        `${arg.name}${arg.type.name.endsWith("?") ? "?" : ""}: ${generateTypescriptTypeName(arg.type)}`
    ).join(", ")}}): Promise<${generateTypescriptTypeName(op.returnType)}> { return this.makeRequest("${op.prettyName}", args); }`).join("")}
}\n\n`;

    code += `const astJson = ${JSON.stringify(astToJson(ast), null, 4).replace(/"(\w+)":/g, '$1:')}`;

    return code;
}

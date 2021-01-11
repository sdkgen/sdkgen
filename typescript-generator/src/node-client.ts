import type { AstRoot } from "@sdkgen/parser";
import { astToJson, HiddenAnnotation, VoidPrimitiveType } from "@sdkgen/parser";

import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

export function generateNodeClientSource(ast: AstRoot): string {
  let code = "";

  const hasErrorWithData = ast.errors.some(err => !(err.dataType instanceof VoidPrimitiveType));

  code += `/* eslint-disable */
import { Context, SdkgenError${hasErrorWithData ? ", SdkgenErrorWithData" : ""}, SdkgenHttpClient } from "@sdkgen/node-runtime";

`;

  for (const type of ast.enumTypes) {
    code += generateTypescriptEnum(type);
    code += "\n";
  }

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
${ast.operations
  .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
  .map(
    op => `
    ${op.prettyName}(ctx: Context | null, args: {${op.args
      .map(arg => `${arg.name}${arg.type.name.endsWith("?") ? "?" : ""}: ${generateTypescriptTypeName(arg.type)}`)
      .join(", ")}}): Promise<${generateTypescriptTypeName(op.returnType)}> { return this.makeRequest(ctx, "${op.prettyName}", args); }`,
  )
  .join("")}
}\n\n`;

  code += `const errClasses = {\n${ast.errors.map(err => `    ${err.name}`).join(",\n")}\n};\n\n`;

  code += `const astJson = ${JSON.stringify(astToJson(ast), null, 4).replace(/"(?<key>\w+)":/gu, "$<key>:")} as const;\n`;

  return code;
}

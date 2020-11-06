import { AstRoot, astToJson } from "@sdkgen/parser";
import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

export function generateNodeServerSource(ast: AstRoot): string {
  let code = "";

  code += `import { BaseApiConfig, Context, SdkgenError } from "@sdkgen/node-runtime";

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

  code += `export class ApiConfig<ExtraContextT> extends BaseApiConfig<ExtraContextT> {
    fn!: {${ast.operations
      .map(
        op => `
        ${op.prettyName}: (ctx: Context & ExtraContextT, args: {${op.args
          .map(arg => `${arg.name}: ${generateTypescriptTypeName(arg.type)}`)
          .join(", ")}}) => Promise<${generateTypescriptTypeName(op.returnType)}>`,
      )
      .join("")}
    }

    /** @deprecated api.err shouldn't be used. Import and throw errors directly. */
    err = {${ast.errors
      .map(
        err => `
        ${err}(message: string = "") { throw new ${err}(message); }`,
      )
      .join(",")}
    }

    astJson = ${JSON.stringify(astToJson(ast), null, 4)
      .replace(/"(?<key>\w+)":/gu, "$<key>:")
      .replace(/\n/gu, "\n    ")}
}

export const api = new ApiConfig<{}>();
`;

  return code;
}

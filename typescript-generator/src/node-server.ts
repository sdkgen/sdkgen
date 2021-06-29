import type { AstRoot } from "@sdkgen/parser";
import { astToJson, VoidPrimitiveType } from "@sdkgen/parser";

import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface, generateTypescriptTypeName } from "./helpers";

export function generateNodeServerSource(ast: AstRoot): string {
  let code = "";

  const hasErrorWithData = ast.errors.some(err => !(err.dataType instanceof VoidPrimitiveType));
  const hasErrorWithoutData = ast.errors.filter(err => err.name !== "Fatal").some(err => err.dataType instanceof VoidPrimitiveType);

  code += `/* eslint-disable */
import { BaseApiConfig, Context, Fatal${hasErrorWithoutData ? ", SdkgenError" : ""}${
    hasErrorWithData ? ", SdkgenErrorWithData" : ""
  } } from "@sdkgen/node-runtime";
export { Fatal } from "@sdkgen/node-runtime";

`;

  for (const type of ast.enumTypes) {
    code += generateTypescriptEnum(type);
    code += "\n";
  }

  for (const type of ast.structTypes) {
    code += generateTypescriptInterface(type, false);
    code += "\n";
  }

  for (const error of ast.errors) {
    if (error.name === "Fatal") {
      continue;
    }

    code += generateTypescriptErrorClass(error, false);
    code += "\n";
  }

  code += `export class ApiConfig<ExtraContextT> extends BaseApiConfig<ExtraContextT> {
    fn!: {${ast.operations
      .map(
        op => `
        ${op.name}: (args: {${op.args
          .map(arg => `${arg.name}: ${generateTypescriptTypeName(arg.type, false)}`)
          .join(", ")}}) => Promise<${generateTypescriptTypeName(op.returnType, false)}>`,
      )
      .join("")}
    }

    astJson = ${JSON.stringify(astToJson(ast), null, 4)
      .replace(/"(?<key>\w+)":/gu, "$<key>:")
      .replace(/\n/gu, "\n    ")} as const
}

export const api = new ApiConfig<{}>();
`;

  return code;
}

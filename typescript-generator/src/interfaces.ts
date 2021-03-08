import type { AstRoot } from "@sdkgen/parser";

import { generateTypescriptEnum, generateTypescriptInterface } from "./helpers";

export function generateTypescriptInterfaces(ast: AstRoot): string {
  let code = "";

  for (const type of ast.enumTypes) {
    code += generateTypescriptEnum(type);
  }

  code += "\n";

  for (const type of ast.structTypes) {
    code += generateTypescriptInterface(type, false);
    code += "\n";
  }

  return code;
}

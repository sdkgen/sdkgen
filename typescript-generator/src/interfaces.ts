import { AstRoot } from "@sdkgen/parser";
import { generateTypescriptEnum, generateTypescriptInterface } from "./helpers";

interface Options {}

export function generateTypescriptInterfaces(ast: AstRoot, options: Options) {
  let code = "";

  for (const type of ast.enumTypes) {
    code += generateTypescriptEnum(type);
  }
  code += "\n";

  for (const type of ast.structTypes) {
    code += generateTypescriptInterface(type);
    code += "\n";
  }

  return code;
}

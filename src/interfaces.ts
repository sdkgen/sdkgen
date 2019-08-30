import { AstRoot } from "@sdkgen/parser";
import { generateTypescriptEnum, generateTypescriptErrorClass, generateTypescriptInterface } from "./helpers";

interface Options {
}

export function generateInterfaces(ast: AstRoot, options: Options) {
    let code = "";

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

    return code;
}

import { AstRoot, VoidPrimitiveType } from "@sdkgen/parser";
import { cast, generateClass, generateEnum, generateErrorClass, generateTypeName } from "./helpers";

export function generateDartClientSource(ast: AstRoot): string {
  let code = "";

  code += `import 'package:flutter/widgets.dart';
import 'package:sdkgen_runtime/types.dart';
import 'package:sdkgen_runtime/http_client.dart';

`;

  for (const type of ast.enumTypes) {
    code += generateEnum(type);
    code += "\n";
  }

  for (const type of ast.structTypes) {
    code += generateClass(type);
    code += "\n";
  }

  for (const error of ast.errors) {
    code += generateErrorClass(error);
    code += "\n";
  }

  code += `class ApiClient extends SdkgenHttpClient {
  ApiClient(String baseUrl, [BuildContext context]) : super(baseUrl, context, _typeTable, _fnTable, _errTable);
${ast.operations
  .map(
    op => `
  ${op.returnType instanceof VoidPrimitiveType ? "Future<void> " : `Future<${generateTypeName(op.returnType)}> `}${op.prettyName}(${
      op.args.length === 0 ? "" : `{${op.args.map(arg => `${generateTypeName(arg.type)} ${arg.name}`).join(", ")}}`
    }) async { ${op.returnType instanceof VoidPrimitiveType ? "" : "return "}${cast(
      `await makeRequest("${op.prettyName}", {${op.args.map(arg => `"${arg.name}": ${arg.name}`).join(", ")}})`,
      op.returnType,
    )}; }`,
  )
  .join("")}
}\n\n`;

  code += `var _typeTable = {\n`;

  for (const type of ast.structTypes) {
    code += `  "${type.name}": StructTypeDescription(\n`;
    code += `    ${type.name},\n`;
    code += `    {\n`;
    for (const field of type.fields) {
      code += `      "${field.name}": "${field.type.name}",\n`;
    }

    code += `    },\n`;
    code += `    (Map fields) => ${type.name}(\n`;
    for (const field of type.fields) {
      code += `      ${field.name}: ${cast(`fields["${field.name}"]`, field.type)},\n`;
    }

    code += `    ),\n`;
    code += `    (${type.name} obj) => ({\n`;
    for (const field of type.fields) {
      code += `      "${field.name}": obj.${field.name},\n`;
    }

    code += `    }),\n`;
    code += `  ),\n`;
  }

  for (const type of ast.enumTypes) {
    code += `  "${type.name}": EnumTypeDescription(${type.name}, ${type.name}.values, [\n    ${type.values
      .map(x => `"${x.value}"`)
      .join(",\n    ")}\n  ]),\n`;
  }

  code += `};\n\n`;

  code += `var _fnTable = {\n`;
  for (const op of ast.operations) {
    code += `  "${op.prettyName}": FunctionDescription("${op.returnType.name}", {\n`;
    for (const arg of op.args) {
      code += `    "${arg.name}": "${arg.type.name}",\n`;
    }

    code += `  }),\n`;
  }

  code += `};\n\n`;

  code += `var _errTable = {\n`;
  for (const error of ast.errors) {
    code += `  "${error}": (msg) => ${error}(msg),\n`;
  }

  code += `};\n`;

  return code;
}

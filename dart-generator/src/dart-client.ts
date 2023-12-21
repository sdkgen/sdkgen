import type { AstRoot } from "@sdkgen/parser";
import { DecimalPrimitiveType, OptionalType, HiddenAnnotation, VoidPrimitiveType, BytesPrimitiveType, hasType } from "@sdkgen/parser";

import { cast, generateClass, generateEnum, generateErrorClass, generateTypeName, mangle } from "./helpers";

export function generateDartClientSource(ast: AstRoot): string {
  let code = "";

  code += `// ignore_for_file: constant_identifier_names
`;

  if (hasType(ast, BytesPrimitiveType)) {
    code += `import 'dart:typed_data';
`;
  }

  if (hasType(ast, DecimalPrimitiveType)) {
    code += `import 'package:decimal/decimal.dart';
`;
  }

  code += `import 'package:http/http.dart' as http;
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
  ApiClient(String baseUrl, [http.Client? client]) : super(baseUrl, client, _typeTable, _fnTable, _errTable);
${ast.operations
  .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
  .map(
    op => `
  ${op.returnType instanceof VoidPrimitiveType ? "Future<void> " : `Future<${generateTypeName(op.returnType)}> `}${op.name}(${
    op.args.length === 0
      ? ""
      : `{${op.args
          .map(arg => `${arg.type instanceof OptionalType ? "" : "required "}${generateTypeName(arg.type)} ${mangle(arg.name)}`)
          .join(", ")}}`
  }) async { ${op.returnType instanceof VoidPrimitiveType ? "" : "final result = "}${`await makeRequest('${op.name}', {${op.args
    .map(arg => `'${arg.name}': ${mangle(arg.name)}`)
    .join(", ")}})`};${op.returnType instanceof VoidPrimitiveType ? "" : ` return ${cast("result", op.returnType)};`}}`,
  )
  .join("")}
}\n\n`;

  code += `var _typeTable = {\n`;

  for (const type of ast.structTypes) {
    code += `  '${type.name}': StructTypeDescription(\n`;
    code += `    ${type.name},\n`;
    code += `    {\n`;
    for (const field of type.fields) {
      code += `      '${field.name}': '${field.type.name}',\n`;
    }

    code += `    },\n`;
    code += `    (Map fields) => ${type.name}(\n`;
    for (const field of type.fields) {
      code += `      ${mangle(field.name)}: ${cast(`fields['${field.name}']`, field.type)},\n`;
    }

    code += `    ),\n`;
    code += `    (${type.name} obj) => ({\n`;
    for (const field of type.fields) {
      code += `      '${field.name}': obj.${mangle(field.name)},\n`;
    }

    code += `    }),\n`;
    code += `  ),\n`;
  }

  for (const type of ast.enumTypes) {
    code += `  '${type.name}': EnumTypeDescription(${type.name}, ${type.name}.values, [\n    ${type.values
      .map(x => `'${x.value}'`)
      .join(",\n    ")}\n  ]),\n`;
  }

  code += `};\n\n`;

  code += `var _fnTable = {\n`;
  for (const op of ast.operations) {
    code += `  '${op.name}': FunctionDescription('${op.returnType.name}', {\n`;
    for (const arg of op.args) {
      code += `    '${arg.name}': '${arg.type.name}',\n`;
    }

    code += `  }),\n`;
  }

  code += `};\n\n`;

  code += `var _errTable = {\n`;
  for (const error of ast.errors) {
    const hasData = !(error.dataType instanceof VoidPrimitiveType);

    const dataArg = hasData ? ", data" : "";

    code += `  '${error.name}': SdkgenErrorDescription('${error.dataType.name}', (msg, req, data) => ${error.name}(msg, req${dataArg})),\n`;
  }

  code += `};\n`;

  return code;
}

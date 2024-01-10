import type { AstRoot } from "@sdkgen/parser";
import { astToJson, OptionalType, VoidPrimitiveType } from "@sdkgen/parser";

import { capitalize, decodeType, encodeType, generateEnum, generateStruct, generateTypeName, ident } from "./helpers";

export function generateCSharpServerSource(ast: AstRoot): string {
  let code = `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Numerics;
using System.Text.Json;
using System.Threading.Tasks;
using static Sdkgen.Runtime;
using static Sdkgen.Context;
using static Sdkgen.Helpers;

namespace SdkgenGenerated
{
    public abstract class Api : BaseApi
    {`;

  for (const op of ast.operations) {
    const returnTypeAngle = op.returnType instanceof VoidPrimitiveType ? "" : `<${generateTypeName(op.returnType)}>`;

    code += `
        public virtual Task${returnTypeAngle} ${capitalize(op.name)}(${[
          "Context ctx",
          ...op.args.map(arg => `${generateTypeName(arg.type)} ${ident(arg.name)}`),
        ].join(", ")})
        {
            return Task.FromException${returnTypeAngle}(new FatalException("Function '${op.name}' not implemented."));
        }
`;
  }

  code += `
        public async Task ExecuteFunction(Context context_, Utf8JsonWriter resultWriter_)
        {
            switch (context_.Name)
            {`;
  for (const op of ast.operations) {
    code += `
                case ${JSON.stringify(op.name)}:
                    {`;

    for (const arg of op.args) {
      code += `
                        JsonElement ${arg.name}Json_;
                        if (!context_.Args.TryGetValue(${JSON.stringify(arg.name)}, out ${arg.name}Json_))
                        {
                            ${
                              arg.type instanceof OptionalType
                                ? `${arg.name}Json_ = new JsonElement();`
                                : `throw new FatalException("'${op.name}().args.${arg.name}' must be set to a value of type ${arg.type.name}.");`
                            }
                        }
                        ${generateTypeName(arg.type)} ${ident(arg.name)};
                        ${decodeType(arg.type, `${arg.name}Json_`, `"${op.name}().args.${arg.name}"`, ident(arg.name)).replace(
                          /\n/gu,
                          "\n                        ",
                        )}`;
    }

    if (op.returnType instanceof VoidPrimitiveType) {
      code += `
                        await ${capitalize(op.name)}(${["context_", ...op.args.map(arg => ident(arg.name))].join(", ")});
                        resultWriter_.WriteNullValue();`;
    } else {
      code += `
                        var result_ = await ${capitalize(op.name)}(${["context_", ...op.args.map(arg => ident(arg.name))].join(", ")});
                        ${encodeType(op.returnType, `result_`, `"${op.name}().ret"`).replace(/\n/gu, "\n                        ")}`;
    }

    code += `
                        return;
                    }`;
  }

  code += `
                default:
                    {
                        throw new FatalException($"Unknown function '{context_.Name}'.");
                    }
            }
        }
`;

  for (const type of ast.structTypes) {
    code += generateStruct(type);
  }

  for (const type of ast.enumTypes) {
    code += generateEnum(type);
  }

  code += `
        public string GetAstJson() => @"${JSON.stringify(astToJson(ast), null, 4).replace(/"/gu, '""').replace(/\n/gu, "\n        ")}";
    }
`;
  for (const error of ast.errors) {
    code += `
    public class ${error.name}Exception : SdkgenException
    {
        public ${error.name}Exception(string message, Exception? inner = null) : base("${error.name}", message, inner) { }
    }
`;
  }

  code += `
}
`;

  return code;
}

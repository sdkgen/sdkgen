import { AstRoot, astToJson, OptionalType, VoidPrimitiveType } from "@sdkgen/parser";
import { decodeType, encodeType, generateEnum, generateStruct, generateTypeName, ident } from "./helpers";

interface Options {}

export function generateCSharpServerSource(ast: AstRoot, options: Options) {
    let code = `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Numerics;
using System.Text.Json;
using System.Threading.Tasks;
using SdkgenRuntime;

namespace SdkgenGenerated
{
    public abstract class Api : BaseApi
    {`;
    for (const op of ast.operations) {
        const returnTypeAngle = op.returnType instanceof VoidPrimitiveType ? "" : `<${generateTypeName(op.returnType)}>`;
        code += `
        virtual public Task${returnTypeAngle} ${op.name}(${[
            "Context ctx",
            ...op.args.map(arg => `${generateTypeName(arg.type)} ${ident(arg.name)}`),
        ].join(", ")})
        {
            return Task.FromException${returnTypeAngle}(new FatalException("function '${op.name}' not implemented"));
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
                                    ? `${arg.name}Json_ = new JsonElement()`
                                    : `throw new FatalException("'${op.name}().args.${arg.name}' must be set to a value of type ${arg.type.name}");`
                            }
                        }
                        ${generateTypeName(arg.type)} ${ident(arg.name)};
                        ${decodeType(arg.type, `${arg.name}Json_`, `"${op.name}().args.${arg.name}"`, ident(arg.name)).replace(
                            /\n/g,
                            "\n                        ",
                        )}`;
        }
        if (op.returnType instanceof VoidPrimitiveType) {
            code += `
                        await ${op.name}(${["context_", ...op.args.map(arg => ident(arg.name))].join(", ")});
                        resultWriter_.WriteNullValue();`;
        } else {
            code += `
                        ${generateTypeName(op.returnType)} result_ = await ${op.name}(${["context_", ...op.args.map(arg => ident(arg.name))].join(
                ", ",
            )});
                        ${encodeType(op.returnType, `result_`, `"${op.name}().ret"`).replace(/\n/g, "\n                        ")}`;
        }

        code += `
                        return;
                    }`;
    }

    code += `
                default:
                    {
                        throw new FatalException($"unknown function '{context_.Name}'");
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
        public string GetAstJson() => @"${JSON.stringify(astToJson(ast), null, 4)
            .replace(/"/g, '""')
            .replace(/\n/g, "\n        ")}";
    }
`;
    for (const error of ast.errors) {
        code += `
    public class ${error}Exception : SdkgenException
    {
        public ${error}Exception(string message, Exception? inner = null) : base("${error}", message, inner) { }
    }
`;
    }

    code += `
}
`;

    return code;
}

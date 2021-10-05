import type { AstRoot } from "@sdkgen/parser";
import { astToJson, OptionalType, VoidPrimitiveType } from "@sdkgen/parser";

import { capitalize, decodeType, encodeType, generateEnum, generateStruct, generateTypeName, ident } from "./helpers";

export function generateFSharpServerSource(ast: AstRoot): string {
  let code = `module rec SdkgenGenerated
open Sdkgen.Runtime
open System.Threading.Tasks
open System.Text.Json
open System
open FSharp.Control.Tasks.NonAffine
open System.Globalization
`;

  for (const error of ast.errors) {
    code += `
type ${error.name}Exception =
  inherit SdkgenException

  new(message: string) = { 
    inherit SdkgenException("${error.name}", message, null)
  }

  new(message: string, inner: Exception) = { 
    inherit SdkgenException("${error.name}", message, inner) 
  }\n`;
  }

  for (const type of ast.enumTypes) {
    code += `\n${generateEnum(type)}\n`;
  }

  for (const type of ast.structTypes) {
    code += `\n${generateStruct(type)}\n`;
  }

  code += `
type Api() =`;

  for (const op of ast.operations) {
    const returnTypeAngle = op.returnType instanceof VoidPrimitiveType ? "" : `<${generateTypeName(op.returnType)}>`;

    const argsInRecord = op.args.length > 0 ? `{| ${op.args.map(arg => `${arg.name}: ${generateTypeName(arg.type)}; `).join("")} |} ->` : "";

    code += `
  member val ${capitalize(op.name)}: Context -> ${argsInRecord} Task${returnTypeAngle} = fun _ -> (raise (FatalException("Function '${
      op.name
    }' not implemented.")))
    with get, set 
    `;
  }

  code += `
  interface BaseApi with
    member __.ExecuteFunction(context_: Context, resultWriter_: Utf8JsonWriter) : Task = 
        task {
          match context_.Name with`;

  for (const op of ast.operations) {
    code += `
          | ${JSON.stringify(op.name)} ->`;
    for (const arg of op.args) {
      code += `
            let mutable ${arg.name}Json_ = Unchecked.defaultof<JsonElement>
            if (not (context_.Args.TryGetValue(${JSON.stringify(arg.name)}, &${arg.name}Json_))) then
              ${
                arg.type instanceof OptionalType
                  ? `${arg.name}Json_ <- new JsonElement()`
                  : `raise (FatalException("'${op.name}().args.${arg.name}' must be set to a value of type ${arg.type.name}."))`
              }
            let mutable ${ident(arg.name)} = Unchecked.defaultof<${generateTypeName(arg.type)}>
            ${decodeType(arg.type, `${arg.name}Json_`, `${op.name}().args.${arg.name}`, ident(arg.name)).replace(/\n/gu, "\n            ")}`;
    }

    if (op.returnType instanceof VoidPrimitiveType) {
      code += `
            do! (__.${capitalize(op.name)} context_ ${op.args.length > 0 ? "{|" : ""} ${op.args
        .map(arg => `${arg.name} = ${ident(arg.name)}`)
        .join("; ")} ${op.args.length > 0 ? "|}" : ""})
      `;
    } else {
      code += `
            let! result_ = (__.${capitalize(op.name)} context_ ${op.args.length > 0 ? "{|" : ""} ${op.args
        .map(arg => `${arg.name} = ${ident(arg.name)}`)
        .join("; ")} ${op.args.length > 0 ? "|}" : ""})
            ${encodeType(op.returnType, `result_`, `"${op.name}().ret"`, 1, false).replace(/\n/gu, "\n      ")}`;
    }
  }

  code += `
          | _ -> raise (FatalException($"Unknown function '{context_.Name}'."))
        } :> Task`;

  // code += `
  //   member __.GetAstJson() = """${JSON.stringify(astToJson(ast), null, 4).replace(/"/gu, '""').replace(/\n/gu, "\n        ")}""";`;

  return code;
}

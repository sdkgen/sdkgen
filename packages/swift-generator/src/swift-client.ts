import type { AstRoot } from "@sdkgen/parser";
import { ErrorNode, HiddenAnnotation, VoidPrimitiveType } from "@sdkgen/parser";

import {
  generateClass,
  generateEnum,
  generateErrorClass,
  generateErrorType,
  generateMethodSignature,
  generateJsonRepresentation,
  generateSwiftTypeName,
  generateRxMethod,
  mangle,
} from "./helpers";

export function generateSwiftClientSource(ast: AstRoot, withRxExtension: boolean): string {
  let code = `import Foundation\nimport SdkgenRuntime\n`;

  code += withRxExtension ? `import RxSwift\nimport RxCocoa\n\n` : `\n`;

  code += `protocol APICallsProtocol {\n`;
  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      return `${generateMethodSignature(op)}`;
    })
    .join("\n");
  code += `\n}\n\n`;

  code += `class API: SdkgenResponse {

    static var calls = Calls(baseUrl: "")
    static var baseUrl: String? {
        didSet {
            self.calls = Calls(baseUrl: baseUrl ?? "")
        }
    }
    
    override init() {
      super.init()
    }\n\n`;

  for (const type of ast.enumTypes) {
    code += generateEnum(type);
    code += "\n";
  }

  for (const type of ast.structTypes) {
    code += generateClass(type);
    code += "\n";
  }

  const errorTypeEnumEntries: string[] = [];
  const connectionError = new ErrorNode("Connection", new VoidPrimitiveType());

  errorTypeEnumEntries.push(connectionError.name);
  for (const error of ast.errors) {
    errorTypeEnumEntries.push(error.name);
  }

  if (errorTypeEnumEntries.length > 0) {
    code += generateErrorType(errorTypeEnumEntries);
    code += "\n";
  }

  code += generateErrorClass();
  code += "\n";

  code += `    public enum Result<T> {
      case success(T)
      case failure(Failure)
    }\n\n`;

  code += `    public class Calls: SdkgenHttpClient, APICallsProtocol {

        override init(baseUrl: String) {
            super.init(baseUrl: baseUrl)
        }\n\n`;

  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      let impl = ``;

      impl += `    ${generateMethodSignature(op)} {\n`;
      if (op.args.length > 0) {
        impl += `            var jsonArgs = [String: Any]()\n`;
        impl += op.args
          .map(arg => `            jsonArgs["${mangle(arg.name)}"] = ${generateJsonRepresentation(arg.type, mangle(arg.name))}`)
          .join(`\n`);
      } else {
        impl += `            let jsonArgs = [String: Any]()`;
      }

      impl += `\n\n`;
      impl += `            makeRequest("${op.name}", jsonArgs, timeoutSeconds, completion: { (value: ${
        op.returnType instanceof VoidPrimitiveType ? "API.NoReply" : generateSwiftTypeName(op.returnType)
      }) in\n`;
      impl += `                callback?(API.Result.success(value))\n`;
      impl += `            }, onError: { error in\n`;
      impl += `                callback?(API.Result.failure(API.Failure(message: error.message, code: error.code, type: error.type)))\n`;
      impl += `            })`;
      impl += `\n        }\n`;

      return impl;
    })
    .join("\n");

  code += `    }\n`;
  code += `}\n`;

  if (withRxExtension) {
    code += `\n`;
    code += `extension API: ReactiveCompatible {}\n\n`;
    code += `extension Reactive where Base: API {\n`;
    code += ast.operations
      .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
      .map(op => {
        return `${generateRxMethod(op)}`;
      })
      .join("\n");
    code += `}\n`;
  }

  return code;
}

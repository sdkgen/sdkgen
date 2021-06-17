import type { AstRoot } from "@sdkgen/parser";
import { ErrorNode, HiddenAnnotation, VoidPrimitiveType } from "@sdkgen/parser";

import { generateClass, generateEnum, generateErrorClass, generateErrorType, generateSwiftTypeName, generateMethodSignature, generateJsonRepresentation, mangle } from "./helpers";

export function generateSwiftClientSource(ast: AstRoot): string {
  let code =`import Foundation\nimport SdkgenRuntime\n\n`;

  code += `protocol APICallsProtocol: class {\n`;
  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      return `${generateMethodSignature(op)}`;
    }).join("\n");
  code += `\n}\n\n`;

  code += `class API {

    static var calls: APICallsProtocol = Calls(baseUrl: "")
    static var baseUrl: String? {
        didSet {
            self.calls = Calls(baseUrl: baseUrl ?? "")
        }
    }
    
    init() {}\n\n`;

  for (const type of ast.enumTypes) {
    code += generateEnum(type);
    code += "\n";
  }
  
  for (const type of ast.structTypes) {
    code += generateClass(type);
    code += "\n";
  }

  code += `    public struct NoReply: Codable {
        public init() {}
    }\n\n`;
  
  const errorTypeEnumEntries: string[] = [];
  const connectionError = new ErrorNode("Connection", new VoidPrimitiveType());
  errorTypeEnumEntries.push(connectionError.name);
  const timeOutError = new ErrorNode("TimedOut", new VoidPrimitiveType());
  errorTypeEnumEntries.push(timeOutError.name);
  for (const error of ast.errors) {
    errorTypeEnumEntries.push(error.name); 
  }

  if (errorTypeEnumEntries.length > 0) {
    code +=  generateErrorType(errorTypeEnumEntries);
    code += "\n";
  }

  code += generateErrorClass();
  code += "\n";

  code += `    public enum Result<T> {
      case success(T)
      case failure(Error)
    }\n\n`;

  code += `    public class Calls: SdkHttpClient, APICallsProtocol {

        override init(baseUrl: String) {
            super.init(baseUrl: baseUrl)
        }\n`;
  
  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      let impl = ``;
      impl += `    ${generateMethodSignature(op)} {\n`;
     
      impl += `            do {\n`;

      if (op.args.length > 0) {
        impl += `                var jsonArgs = [String: Any]()\n`;
        impl += op.args.map(arg => `                jsonArgs[\"${mangle(arg.name)}\"] = ${generateJsonRepresentation(arg.type, arg.name)}`).join("\n");
      } else {
        impl += `                let jsonArgs = [String: Any]()`;
      }
      impl += `\n`;
      impl +=  `
                try makeRequest("${op.prettyName}", jsonArgs, timeoutSeconds, callback: { [weak self] callResponse in
                    guard let this = self else { return }

                    let response: ${op.returnType instanceof VoidPrimitiveType ? "API.Result<API.NoReply>" : `API.Result<${generateSwiftTypeName(op.returnType)}>`} = this.handleResponse(response: callResponse)
                    callback?(response)
                })
            } catch let apiError as SdkError {
                callback?(Result.failure(handleError(apiError: apiError)))
            } catch (let error) {
                debugPrint(error.localizedDescription)
            }`;
      
      impl += `\n        }\n`;
      return impl;
    })
    .join("\n");

  code += `
        private func handleError(apiError: SdkError) -> API.Error {
            return API.Error(message: apiError.message, code: apiError.code, type: apiError.type)
        }\n`;

  code += `
        private func handleResponse<T: Codable>(response: SdkResponse<Any?>) -> Result<T> {
            switch response {
            case .failure(let error):
                return Result.failure(self.handleError(apiError: error))
            case .success(let value):
                do {
                    let dataString = String(data: value, encoding: .utf8)
                    if let result = try dataString?.fromJson(returningType: T.self) {
                        return Result.success(result)
                    } else {
                        return Result.failure(Error(message: "", code: nil, type: "Fatal"))
                    }
                } catch {
                    return Result.failure(Error(message: "", code: nil, type: "Fatal"))
                }
            }
        }\n\n`;

  code += `    }\n`;

  code += `}\n`;

  return code;
}

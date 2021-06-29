import type { AstRoot } from "@sdkgen/parser";
import { ErrorNode, HiddenAnnotation, VoidPrimitiveType } from "@sdkgen/parser";

import {
  generateClass,
  generateEnum,
  generateErrorClass,
  generateErrorType,
  generateMethodSignature,
  generateJsonRepresentation,
  generateRxMethod,
  mangle,
} from "./helpers";

export function generateSwiftClientSource(ast: AstRoot, withRxExtension: boolean): string {
  let code = `import Foundation\nimport SdkgenRuntime\n`;

  code += withRxExtension ? `import RxSwift\nimport RxCocoa\n\n` : `\n`;

  code += `protocol APICallsProtocol: class {\n`;
  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      return `${generateMethodSignature(op)}`;
    })
    .join("\n");
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
      case failure(Error)
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
      impl += `            request("${op.prettyName}", jsonArgs, timeoutSeconds, callback: callback)`;
      impl += `\n        }\n`;
      return impl;
    })
    .join("\n");

  code += `
        private func request<T: Codable>(_ name: String, _ args: [String: Any], _ timeoutSeconds: Double?, callback: ((API.Result<T>) -> Void)?) {
            do {
                try makeRequest(name, args, timeoutSeconds, callback: { [weak self] callResponse in
                    guard let this = self else { return }

                    let response: API.Result<T> = this.handleResponse(response: callResponse)
                    callback?(response)
                })
            } catch let apiError as SdkgenError {
                callback?(Result.failure(API.Error(message: apiError.message, code: apiError.code, type: apiError.type)))
            } catch (let error) {
                debugPrint(error.localizedDescription)
            }
        }\n`;

  code += `
        private func handleResponse<T: Codable>(response: SdkgenResponse<Any?>) -> API.Result<T> {
            switch response {
            case .failure(let error):
                return API.Result.failure(API.Error(message: error.message, code: error.code, type: error.type))
            case .success(let value):
                do {
                    let dataString = String(data: value, encoding: .utf8)
                    if let result = try dataString?.fromJson(returningType: T.self) {
                        return API.Result.success(result)
                    } else {
                        return API.Result.failure(API.Error(message: "", code: nil, type: "Fatal"))
                    }
                } catch let apiError as SdkgenError {
                    return API.Result.failure(API.Error(message: apiError.message, code: apiError.code, type: apiError.type))
                } catch (let error) {
                    return API.Result.failure(API.Error(message: error.localizedDescription, code: nil, type: "Fatal"))
                }
            }
        }\n\n`;

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

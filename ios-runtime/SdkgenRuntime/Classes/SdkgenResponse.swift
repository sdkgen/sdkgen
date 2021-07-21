import Foundation

open class SdkgenResponse {
    
    public init() {}
    
    public struct NoReply: Codable {
        public init() {}
    }
    
    public class SdkgenError: Error {
        public var message: String?
        public var code: Int?
        public var type: String?
        
        public init(message: String?, code: Int?, type: String?) {
            self.message = message
            self.code = code
            self.type = type
        }
    }
    
    internal class HTTPResponse {
        var result: Any?
        var error: Any?

        init(jsonObject: [String: Any]) {
            self.result = jsonObject["result"] is NSNull ? nil : jsonObject["result"]
            self.error = jsonObject["error"] is NSNull ? nil : jsonObject["error"]
        }
    }
    
    private class HttpResult<T: Codable>: Codable {
        var result: T?

        enum CodingKeys: String, CodingKey {
            case result
        }

        required init(from decoder: Decoder) throws {
            let values = try decoder.container(keyedBy: CodingKeys.self)
            result = (try? values.decode(T.self, forKey: .result)) ?? (SdkgenResponse.NoReply() as? T)
        }
    }
    
    internal static func handleResult<T: Codable>(of type: T.Type = T.self, value: Data, completion: @escaping (T) -> Void) throws {
        let httpResult = try JSONDecoder().decode(SdkgenResponse.HttpResult<T>.self, from: value)
        if let result = httpResult.result {
            completion(result)
        }
    }
}

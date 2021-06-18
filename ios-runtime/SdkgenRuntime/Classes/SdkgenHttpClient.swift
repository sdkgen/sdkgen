import Foundation
import Alamofire

open class SdkgenHttpClient {
    
    public var baseUrl: String
       
    public init(baseUrl: String) {
        self.baseUrl = baseUrl
    }
    
    public enum SdkgenResponse<T> {
        case success(Data)
        case failure(SdkgenError)
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
    
    public func makeRequest(_ name: String, _ args: [String: Any], _ timeoutSeconds: Double?, callback: @escaping (SdkgenResponse<Any?>) -> Void) throws {

        let body: [String : Any] = [
            "version": 3,
            "requestId": SdkgenHelper.randomBytesHex(len: 8),
            "deviceInfo": Device.device(),
            "name": name,
            "args": args,
        ]
        
        let url = baseUrl.last != "/" ? baseUrl.appending("/\(name)") : baseUrl.appending(name)
        
        guard let urlObj = URL(string: url) else { throw Errors.fatalError(error: Errors.getUrlCreationErrorMessage(url), code: nil) }
        var urlRequest = URLRequest(url: urlObj)
        urlRequest.method = .post
        urlRequest.timeoutInterval = timeoutSeconds ?? 35;
        
        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body, options: .prettyPrinted)
        } catch let error {
            throw Errors.jsonSerializationError(error: error.localizedDescription)
        }
        
        AF.request(urlRequest, interceptor: nil)
            .validate()
            .responseData(completionHandler: { response in
                do {
                    switch response.result {
                    case .success(let value):
                        if let responseJson = try JSONSerialization.jsonObject(with: value, options: []) as? [String: Any],
                           let resultJson = responseJson["result"],
                           response.response?.statusCode == 200 {
                                let dataResult = try JSONSerialization.data(withJSONObject: resultJson, options: .prettyPrinted)
                                callback(SdkgenResponse.success(dataResult))
                        } else {
                            callback(SdkgenResponse.failure(Errors.fatalError(error: Errors.resultParseErrorMessage, code: nil)))
                        }
                        
                        break
                    case .failure(let error):
                        if error.responseCode == nil && response.data == nil && response.response == nil {
                            callback(SdkgenResponse.failure(Errors.connectionError(error: error.localizedDescription)))
                            break
                        }
                        
                        if let data = response.data,
                           let responseJson = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                           let responseError = response.error,
                           let errorDict = responseJson["error"] as? [String: Any] {
                                let apiError = SdkgenError(message: errorDict["message"] as? String, code: responseError.responseCode, type: errorDict["type"] as? String)
                                callback(SdkgenResponse.failure(apiError))
                        } else {
                            callback(SdkgenResponse.failure(Errors.fatalError(error: error.localizedDescription, code: error.responseCode)))
                        }
                        
                        break
                    }
                } catch {
                    callback(SdkgenResponse.failure(Errors.jsonSerializationError(error: error.localizedDescription)))
                }
               
            })
       
    }
}

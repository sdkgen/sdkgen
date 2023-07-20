import Foundation
import Alamofire

open class SdkgenHttpClient {
    
    public var baseUrl: String
    public var extraJson: [String : Any] = [:]
       
    public init(baseUrl: String) {
        self.baseUrl = baseUrl
    }
    
    public func makeRequest<T: Codable>(_ name: String, _ args: [String: Any], _ timeoutSeconds: Double? = nil, completion: @escaping (T) -> Void, onError: @escaping (SdkgenResponse.SdkgenError) -> Void) {

        let body: [String : Any] = [
            "version": 3,
            "requestId": SdkgenHelper.randomBytesHex(len: 8),
            "deviceInfo": SdkgenDevice.device(),
            "name": name,
            "args": args,
            "extra": extraJson
        ]
        
        let url = baseUrl.last != "/" ? baseUrl.appending("/\(name)") : baseUrl.appending(name)
        
        guard let urlObj = URL(string: url) else { return onError(Errors.fatalError(error: Errors.getUrlCreationErrorMessage(url), code: nil)) }
        var urlRequest = URLRequest(url: urlObj)
        urlRequest.method = .post
        urlRequest.timeoutInterval = timeoutSeconds ?? 35
        urlRequest.setValue("application/sdkgen", forHTTPHeaderField: "Content-type")
        
        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        } catch let error {
             onError(Errors.jsonSerializationError(error: error.localizedDescription))
        }
        
        AF.request(urlRequest, interceptor: nil)
            .validate()
            .responseData { response in
                do {
                    switch response.result {
                    case .success(let value):
                        if let jsonObject = try JSONSerialization.jsonObject(with: value, options: []) as? [String: Any] {
                            let httpResponse = SdkgenResponse.HTTPResponse(jsonObject: jsonObject)
                            if let result = httpResponse.result, JSONSerialization.isValidJSONObject(result) {
                                let dataResult = try JSONSerialization.data(withJSONObject: result, options: [])
                                let dataString = String(data: dataResult, encoding: .utf8)
                                if let result = try dataString?.fromJson(returningType: T.self) {
                                    completion(result)
                                } else {
                                    onError(Errors.fatalError(error: Errors.resultParseErrorMessage, code: nil))
                                }
                            } else {
                                try SdkgenResponse.handleResult(of: T.self, value: value, completion: completion)
                            }
                        }
                    case .failure(let error):
                        if error.responseCode == nil && response.data == nil && response.response == nil {
                            onError(Errors.connectionError(error: error.localizedDescription))
                            break
                        }

                        if let data = response.data,
                           let responseJson = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
                           let responseError = response.error,
                           let errorDict = responseJson["error"] as? [String: Any] {
                            let apiError = SdkgenResponse.SdkgenError(message: errorDict["message"] as? String, code: responseError.responseCode, type: errorDict["type"] as? String)
                            onError(apiError)
                        } else {
                            onError(Errors.fatalError(error: error.localizedDescription, code: error.responseCode))
                        }

                        break
                    }
                } catch {
                    onError(Errors.jsonSerializationError(error: error.localizedDescription))
                }
            }
    }
}

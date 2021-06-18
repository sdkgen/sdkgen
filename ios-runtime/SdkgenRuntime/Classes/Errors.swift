import Foundation

internal class Errors {
    
    static var resultParseErrorMessage = "Error: result parse failed"
    
    public static func getUrlCreationErrorMessage(_ url: String) -> String {
        return "Error: url creation ended in error \(url)"
    }
    
    public static func jsonSerializationError(error: String) -> SdkgenHttpClient.SdkgenError {
        return SdkgenHttpClient.SdkgenError(message: "Error: json serialization: \(error)", code: nil, type: "Fatal")
    }
    
    public static func fatalError(error: String, code: Int?) -> SdkgenHttpClient.SdkgenError {
        return SdkgenHttpClient.SdkgenError(message: error, code: code, type: "Fatal")
    }
    
    public static func connectionError(error: String) -> SdkgenHttpClient.SdkgenError {
        return SdkgenHttpClient.SdkgenError(message: error, code: nil, type: "Connection")
    }
}

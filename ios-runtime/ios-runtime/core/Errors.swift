import Foundation

internal class Errors {
    
    static var resultParseErrorMessage = "Error: result parse failed"
    
    public static func getUrlCreationErrorMessage(_ url: String) -> String {
        return "Error: url creation ended in error \(url)"
    }
    
    public static func jsonSerializationError(error: String) -> SdkHttpClient.SdkError {
        return SdkHttpClient.SdkError(message: "Error: json serialization: \(error)", code: nil, type: "Fatal")
    }
    
    public static func fatalError(error: String, code: Int?) -> SdkHttpClient.SdkError {
        return SdkHttpClient.SdkError(message: error, code: code, type: "Fatal")
    }
    
    public static func timedOutOrConnectionError(error: String) -> SdkHttpClient.SdkError {
        let errorType = error.contains("timed out") ? "TimedOut" : "Connection"
        return SdkHttpClient.SdkError(message: error, code: nil, type: errorType)
    }
}

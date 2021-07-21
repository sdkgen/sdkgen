import Foundation

internal class Errors {
    
    static var resultParseErrorMessage = "Error: result parse failed"
    
    public static func getUrlCreationErrorMessage(_ url: String) -> String {
        return "Error: url creation ended in error \(url)"
    }
    
    public static func jsonSerializationError(error: String) -> SdkgenResponse.SdkgenError {
        return SdkgenResponse.SdkgenError(message: "Error: json serialization: \(error)", code: nil, type: "Fatal")
    }
    
    public static func fatalError(error: String, code: Int?) -> SdkgenResponse.SdkgenError {
        return SdkgenResponse.SdkgenError(message: error, code: code, type: "Fatal")
    }
    
    public static func connectionError(error: String) -> SdkgenResponse.SdkgenError {
        return SdkgenResponse.SdkgenError(message: error, code: nil, type: "Connection")
    }
}

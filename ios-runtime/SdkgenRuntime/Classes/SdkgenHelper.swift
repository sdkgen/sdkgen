import Foundation

public final class SdkgenHelper {
    internal static func randomBytesHex(len: Int) -> String {
        var randomBytes = [UInt8](repeating: 0, count: len)
        let _ = SecRandomCopyBytes(kSecRandomDefault, len, &randomBytes)
        return randomBytes.map({String(format: "%02hhx", $0)}).joined(separator: "")
    }
    
    public static func encodeDateTime(date: Date) -> String {
        let formatter = DateFormatter.dateTimeFormatter
        return formatter.string(from: date)
    }
    
    public static func encodeDate(date: Date) -> String {
        let formatter = DateFormatter.dateFormatter
        return formatter.string(from: date)
    }
}

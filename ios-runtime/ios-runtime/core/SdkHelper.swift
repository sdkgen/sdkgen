import Foundation

public final class SdkHelper {
    internal static func randomBytesHex(len: Int) -> String {
        var randomBytes = [UInt8](repeating: 0, count: len)
        let _ = SecRandomCopyBytes(kSecRandomDefault, len, &randomBytes)
        return randomBytes.map({String(format: "%02hhx", $0)}).joined(separator: "")
    }
    
    public static func encodeDateTime(date: Date) -> String {
        let formatter = DateFormatter.dateFormatter
        return formatter.string(from: date)
    }
}

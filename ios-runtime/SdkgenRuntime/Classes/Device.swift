import Foundation
import DeviceKit
import KeychainSwift

internal class SdkgenDevice {
    private static let screenSize: CGRect = UIScreen.main.bounds
    
    static func device() -> [String: Any] {
        var device = [String: Any]()
        device["id"] = deviceID
        device["fingerprint"] = phoneFingerprint()
        device["language"] = Locale.preferredLanguages[0]
        device["platform"] = platformInfo()
        device["type"] = "ios"
        device["screen"] = screenInfo()
        device["version"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        return device
    }
    
    private static func platformInfo() -> [String: Any] {
        var platform = [String: Any]()
        platform["version"] = UIDevice.current.systemVersion
        platform["brand"] = "Apple"
        platform["model"] = "\(Device.current.realDevice)"
        return platform
    }
    
    private static func screenInfo() -> [String: Any] {
        var screen = [String: Any]()
        screen["width"] = screenSize.width
        screen["height"] = screenSize.height
        return screen
    }

    private static var deviceID: String {
        if let localId = UserDefaults.standard.value(forKey: "device-id") as? String {
            return localId
        }
        
        let id = SdkgenHelper.randomBytesHex(len: 16)
        UserDefaults.standard.set(id, forKey: "device-id")
        UserDefaults.standard.synchronize()
        return id
    }
    
    private static func phoneFingerprint() -> String {
        let keychain = KeychainSwift()
        guard let phoneFingerprint = keychain.get("phoneFingerprint") else {
            let newPhoneFingerprint = SdkgenHelper.randomBytesHex(len: 32)
            keychain.set(newPhoneFingerprint, forKey: "phoneFingerprint")
            return newPhoneFingerprint
        }

        return phoneFingerprint
    }
   
}

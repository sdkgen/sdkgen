import Foundation
import Alamofire

public extension DateFormatter {
    static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return formatter
    }()
    
}

public extension Encodable {
    func toJson() throws -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .formatted(.dateFormatter)
        
        do {
            let encodedData = try encoder.encode(self)
            let endodedJSON = String(data: encodedData, encoding: .utf8)!
            return endodedJSON
        } catch {
            throw Errors.jsonSerializationError(error: error.localizedDescription)
        }
    }
}

public extension String {
    func fromJson<T: Decodable>(returningType: T.Type) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .formatted(.dateFormatter)
        
        let jsonData = data(using: .utf8)!
        do {
            return try decoder.decode(T.self, from: jsonData)
        } catch {
            throw Errors.jsonSerializationError(error: error.localizedDescription)
        }
    }
}

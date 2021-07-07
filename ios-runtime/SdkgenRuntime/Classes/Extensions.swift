import Foundation
import Alamofire

public extension DateFormatter {
    static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS"
        return formatter
    }()
    
}

public extension Encodable {
    func toJson() throws -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .formatted(.dateFormatter)
        
        do {
            let encodedData = try encoder.encode(self)
            let encodedJSON = String(data: encodedData, encoding: .utf8)!
            return encodedJSON
        } catch {
            throw Errors.jsonSerializationError(error: error.localizedDescription)
        }
    }
}

public extension String {
    func fromJson<T: Decodable>(returningType: T.Type) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom({ decoder -> Date in
            let container = try decoder.singleValueContainer()
            let dateStr = try container.decode(String.self)
            
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.timeZone = TimeZone(abbreviation: "UTC")
            formatter.locale = Locale(identifier: "en_US_POSIX")
            
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX"
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS"
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssXXXXX"
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            formatter.dateFormat = "yyyy-MM-dd"
            if let date = formatter.date(from: dateStr) {
                return date
            }
            
            throw Errors.jsonSerializationError(error: "invalid Date \(dateStr)")
        })
        
        let jsonData = data(using: .utf8)!
        do {
            return try decoder.decode(T.self, from: jsonData)
        } catch (let error) {
            throw Errors.jsonSerializationError(error: error.localizedDescription)
        }
    }
}

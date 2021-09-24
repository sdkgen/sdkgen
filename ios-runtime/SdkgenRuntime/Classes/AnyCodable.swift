import Foundation

public struct AnyCodable {

    // MARK: Initialization
    public init(_ value: Any?) {
        self.value = value
    }

    public let value: Any?
}

public extension AnyCodable {

    func assertValue<T>(_ type: T.Type) throws -> T {

        switch type {
        case is NSNull.Type where self.value == nil:
            return NSNull() as! T
        default:
            guard let value = self.value as? T else {
                throw Error.typeMismatch(Swift.type(of: self.value))
            }

            return value
        }
    }
}

public extension AnyCodable {

    enum Error: Swift.Error {
        case typeMismatch(Any.Type)
    }
}

extension AnyCodable: Codable {

    public init(from decoder: Decoder) throws {

        let container = try decoder.singleValueContainer()

        if let value = try? container.decode(String.self) {
            self.value = value
        } else if let value = try? container.decode(Bool.self) {
            self.value = value
        } else if container.decodeNil() {
            self.value = nil
        } else if let value = try? container.decode([String: AnyCodable].self) {
            self.value = value.mapValues { $0.value }
        } else if let value = try? container.decode([AnyCodable].self) {
            self.value = value.map { $0.value }
        } else if let value = try? container.decode(Double.self) {
            switch value {
            case value.rounded():
                self.value = Int(value)
            default:
                self.value = value
            }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid value cannot be decoded"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {

        var container = encoder.singleValueContainer()

        guard let value = self.value else {
            try container.encodeNil()
            return
        }

        switch value {
        case let value as String:
            try container.encode(value)
        case let value as Bool:
            try container.encode(value)
        case let value as Int:
            try container.encode(value)
        case let value as Int8:
            try container.encode(value)
        case let value as Int16:
            try container.encode(value)
        case let value as Int32:
            try container.encode(value)
        case let value as Int64:
            try container.encode(value)
        case let value as UInt:
            try container.encode(value)
        case let value as UInt8:
            try container.encode(value)
        case let value as UInt16:
            try container.encode(value)
        case let value as UInt32:
            try container.encode(value)
        case let value as UInt64:
            try container.encode(value)
        case let value as Array<Any?>:
            try container.encode(value.map { AnyCodable($0) })
        case let value as Dictionary<String, Any?>:
            try container.encode(value.mapValues { AnyCodable($0) })
        case let value as Float:
            try container.encode(value)
        case let value as Double:
            try container.encode(value)
        case let value as Decimal:
            try container.encode(value)
        case let value as NSDecimalNumber:
            try container.encode(value.decimalValue)
        case is NSNull:
            try container.encodeNil()
        case let value as NSNumber:
            try container.encode(value.doubleValue)
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Invalid value cannot be encoded"
                )
            )
        }
    }
}

extension AnyCodable: Equatable {

    public static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {

        switch (lhs.value, rhs.value) {
        case (let lhs as String, let rhs as String):
            return lhs == rhs
        case (let lhs as Bool, let rhs as Bool):
            return lhs == rhs
        case (let lhs as Int, let rhs as Int):
            return lhs == rhs
        case (let lhs as Int8, let rhs as Int8):
            return lhs == rhs
        case (let lhs as Int16, let rhs as Int16):
            return lhs == rhs
        case (let lhs as Int32, let rhs as Int32):
            return lhs == rhs
        case (let lhs as Int64, let rhs as Int64):
            return lhs == rhs
        case (let lhs as UInt, let rhs as UInt):
            return lhs == rhs
        case (let lhs as UInt8, let rhs as UInt8):
            return lhs == rhs
        case (let lhs as UInt16, let rhs as UInt16):
            return lhs == rhs
        case (let lhs as UInt32, let rhs as UInt32):
            return lhs == rhs
        case (let lhs as UInt64, let rhs as UInt64):
            return lhs == rhs
        case (let lhs as Float, let rhs as Float):
            return lhs == rhs
        case (let lhs as Double, let rhs as Double):
            return lhs == rhs
        case (let lhs as [String: AnyCodable], let rhs as [String: AnyCodable]):
            return lhs == rhs
        case (let lhs as [AnyCodable], let rhs as [AnyCodable]):
            return lhs == rhs
        case (is NSNull, is NSNull):
            return true
        default:
            return false
        }
    }
}

extension AnyCodable: CustomStringConvertible {

    public var description: String {

        switch self.value {
        case let value as CustomStringConvertible:
            return value.description
        default:
            return String(describing: self.value)
        }
    }
}

extension AnyCodable: CustomDebugStringConvertible {

    public var debugDescription: String {

        switch self.value {
        case let value as CustomDebugStringConvertible:
            return value.debugDescription
        default:
            return self.description
        }
    }
}

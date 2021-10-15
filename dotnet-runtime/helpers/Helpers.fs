module Sdkgen.Helpers

open System.Threading.Tasks
open System.Text.Json
open System
open System.Globalization

type SdkgenException =
  inherit Exception
  val Type: string

  new(type': string, message: string, inner: Exception) = { 
    inherit Exception(message, inner); Type = type'
  }

type FatalException =
  inherit SdkgenException

  new(message: string) = { 
    inherit SdkgenException("Fatal", message, null)
  }

  new(message: string, inner: Exception) = { 
    inherit SdkgenException("Fatal", message, inner) 
  }

let decodeJsonElement (propety_: string) (json_:JsonElement) (path_: string) = 
  match (json_.TryGetProperty(propety_)) with
  | true, value -> value
  | false, _ -> raise (FatalException($"'{path_}' must be set to a value of type string."))

let decodeUInt32 (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, json_.TryGetUInt32() with
  | JsonValueKind.Number, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be set to a value of type uint."))

let decodeInt32 (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, json_.TryGetInt32() with
  | JsonValueKind.Number, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be set to a value of type integer."))

let decodeMoney (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, json_.TryGetDecimal() with
  | JsonValueKind.Number, (true, value) when value % 1m <> 0m -> value
  | _ -> raise (FatalException($"'{path_}' must be an integer amount of cents."))

let decodeFloat (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, json_.TryGetDouble() with
  | JsonValueKind.Number, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be a floating-point number."))

let decodeBigInteger (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, bigint.TryParse(json_.GetString()) with
  | JsonValueKind.String, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be an arbitrarily large integer in a string."))

let decodeString (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a string."))

let decodeHtml (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid HTML string."))

let decodeCpf (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid CPF string."))

let decodeCnpj (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid CNPJ string."))

let decodeEmail (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid Email."))

let decodeUrl (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, Uri.TryCreate(json_.GetString(), UriKind.Absolute) with
  | JsonValueKind.String, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be a valid URL."))

let decodeUuid (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, Guid.TryParse(json_.GetString()) with
  | JsonValueKind.String, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be a valid URL."))

let decodeHex (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a hex string."))

let decodeBase64 (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a base64 string."))

let decodeXml (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid XML string."))

let decodeBool (json_:JsonElement) (path_: string) = 
  match json_.ValueKind  with
  | JsonValueKind.True | JsonValueKind.False -> json_.GetBoolean()
  | _ -> raise (FatalException($"'{path_}' must be a boolean."))

let decodeBytes (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.String -> Convert.FromBase64String(json_.GetString())
  | _ -> raise (FatalException($"'{path_}' must be a base64 string."))

let decodeOptional<'T> (decode_: JsonElement -> string -> 'T) (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.Null | JsonValueKind.Undefined -> None
  | _ -> Some(decode_ json_ path_)

let decodeDateTime (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, (DateTime.TryParseExact(json_.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal)), (DateTime.TryParseExact(json_.GetString(), "yyyy-MM-ddTHH:mm:ss.FFFFFFF'Z'", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal)) with
  | JsonValueKind.String, (true, value), (_,_) -> value
  | JsonValueKind.String, (_,_), (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be a datetime."))

let decodeDate (json_:JsonElement) (path_: string) = 
  match json_.ValueKind, (DateTime.TryParseExact(json_.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal ||| DateTimeStyles.AssumeUniversal)) with
  | JsonValueKind.String, (true, value) -> value
  | _ -> raise (FatalException($"'{path_}' must be a date."))

let decodeArray<'T> (decode_: JsonElement -> string -> 'T) (json_:JsonElement) (path_: string) = 
  match json_.ValueKind with
  | JsonValueKind.Array -> 
    let mutable array = Array.empty
    for i1 in 0 .. (json_.GetArrayLength() - 1) do
      let item = json_.[i1]
      let partialResult = decode_ item ($"{path_}{i1}")
      array <- array |> Array.append [| partialResult |]
    array
  | _ -> raise (FatalException($"'{path_}' must be an array."))

module Sdkgen.Helpers

open System.Threading.Tasks
open System.Text.Json
open System
open System.Globalization

type SdkgenException =
  inherit Exception
  val Type: string

  new(type': string, message: string, inner: Exception) =
    { inherit Exception(message, inner)
      Type = type' }

type FatalException =
  inherit SdkgenException

  new(message: string) = { inherit SdkgenException("Fatal", message, null) }

  new(message: string, inner: Exception) = { inherit SdkgenException("Fatal", message, inner) }

let decodeJsonElementStrict (propety_: string) (json_: JsonElement) (path_: string) =
  match (json_.TryGetProperty(propety_)) with
  | true, value -> value
  | false, _ -> raise (FatalException($"'{path_}' must be set to a value of type string."))

let decodeJsonElementWeak (propety_: string) (json_: JsonElement) (path_: string) =
  match (json_.TryGetProperty(propety_)) with
  | true, value -> value
  | false, _ -> JsonElement()

let (|UInt32|_|) (a: JsonElement) =
  match a.TryGetUInt32() with
  | (true, value) -> Some value
  | _ -> None

let (|Int32|_|) (a: JsonElement) =
  match a.TryGetInt32() with
  | (true, value) -> Some value
  | _ -> None

let (|String|_|) (a: JsonElement) =
  try
    a.GetString() |> Some
  with
  | _ -> None

let (|Double|_|) (a: JsonElement) =
  match a.TryGetDouble() with
  | (true, value) -> Some value
  | _ -> None

let (|Decimal|_|) (a: JsonElement) =
  match a.TryGetDecimal() with
  | (true, value) -> Some value
  | _ -> None

let (|BigInt|_|) (a: JsonElement) =
  let v =
    try
      a.GetString() |> Some
    with
    | _ -> None

  if v.IsSome then
    match bigint.TryParse(v.Value) with
    | (true, value) -> Some value
    | _ -> None
  else
    None

let (|Uri|_|) (a: JsonElement) =
  let v =
    try
      a.GetString() |> Some
    with
    | _ -> None

  if v.IsSome then
    match Uri.TryCreate(v.Value, UriKind.Absolute) with
    | (true, value) -> Some value
    | _ -> None
  else
    None

let (|Guid|_|) (a: JsonElement) =
  let v =
    try
      a.GetString() |> Some
    with
    | _ -> None

  if v.IsSome then
    match Guid.TryParse(v.Value) with
    | (true, value) -> Some value
    | _ -> None
  else
    None

let (|DateTime|_|) (a: JsonElement) =
  let v =
    try
      a.GetString() |> Some
    with
    | _ -> None

  if v.IsSome then
    match (DateTime.TryParseExact(
            v.Value,
            "yyyy-MM-ddTHH:mm:ss.FFFFFFF",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal
            ||| DateTimeStyles.AssumeUniversal
          )),
          (DateTime.TryParseExact(
            v.Value,
            "yyyy-MM-ddTHH:mm:ss.FFFFFFF'Z'",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal
            ||| DateTimeStyles.AssumeUniversal
          ))
      with
    | (true, value), (_, _) -> Some value
    | (_, _), (true, value) -> Some value
    | _ -> None
  else
    None

let (|Date|_|) (a: JsonElement) =
  let v =
    try
      a.GetString() |> Some
    with
    | _ -> None

  if v.IsSome then
    match (DateTime.TryParseExact(
             v.Value,
             "yyyy-MM-dd",
             CultureInfo.InvariantCulture,
             DateTimeStyles.AdjustToUniversal
             ||| DateTimeStyles.AssumeUniversal
           ))
      with
    | (true, value) -> Some value
    | _ -> None
  else
    None

let (>.>) op1 op2 op3 json_ path_ =
  op1 (fun p1 p2 -> op2 op3 p1 p2) json_ path_

let decodeUInt32 (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.Number, UInt32 value -> value
  | _ -> raise (FatalException($"'{path_}' must be set to a value of type uint."))

let decodeInt32 (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.Number, Int32 value -> value
  | _ -> raise (FatalException($"'{path_}' must be set to a value of type integer."))

let decodeMoney (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.Number, Decimal value when value % 1m <> 0m -> value
  | _ -> raise (FatalException($"'{path_}' must be an integer amount of cents."))

let decodeFloat (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.Number, Double value -> value
  | _ -> raise (FatalException($"'{path_}' must be a floating-point number."))

let decodeBigInteger (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.String, BigInt value -> value
  | _ -> raise (FatalException($"'{path_}' must be an arbitrarily large integer in a string."))

let decodeString (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a string."))

let decodeHtml (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid HTML string."))

let decodeCpf (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid CPF string."))

let decodeCnpj (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid CNPJ string."))

let decodeEmail (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid Email."))

let decodeUrl (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.String, Uri value -> value
  | _ -> raise (FatalException($"'{path_}' must be a valid URL."))

let decodeUuid (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.String, Guid value -> value
  | _ -> raise (FatalException($"'{path_}' must be a valid URL."))

let decodeHex (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a hex string."))

let decodeBase64 (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a base64 string."))

let decodeXml (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> json_.GetString()
  | _ -> raise (FatalException($"'{path_}' must be a valid XML string."))

let decodeBool (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.True
  | JsonValueKind.False -> json_.GetBoolean()
  | _ -> raise (FatalException($"'{path_}' must be a boolean."))

let decodeBytes (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.String -> Convert.FromBase64String(json_.GetString())
  | _ -> raise (FatalException($"'{path_}' must be a base64 string."))

let decodeOptional<'T> (decode_: JsonElement -> string -> 'T) (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.Null
  | JsonValueKind.Undefined -> None
  | _ -> Some(decode_ json_ path_)

let decodeDateTime (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.String, DateTime value -> value
  | JsonValueKind.String, DateTime value -> value
  | _ -> raise (FatalException($"'{path_}' must be a datetime."))

let decodeDate (json_: JsonElement) (path_: string) =
  match json_.ValueKind, json_ with
  | JsonValueKind.String, Date value -> value
  | _ -> raise (FatalException($"'{path_}' must be a date."))

let decodeArray<'T> (decode_: JsonElement -> string -> 'T) (json_: JsonElement) (path_: string) =
  match json_.ValueKind with
  | JsonValueKind.Array ->
    let mutable list_ = List.empty

    for i1 in 0 .. (json_.GetArrayLength() - 1) do
      let item = json_.[i1]
      let partialResult = decode_ item ($"{path_}{i1}")
      list_ <- list_ |> List.append [ partialResult ]

    list_
  | _ -> raise (FatalException($"'{path_}' must be an array."))

let randomBytes bytes =
  let rnd (x: byte array) =
    Random().NextBytes x
    x

  bytes
  |> Array.zeroCreate
  |> rnd
  |> Array.map (fun x -> x.ToString("x2"))
  |> String.Concat

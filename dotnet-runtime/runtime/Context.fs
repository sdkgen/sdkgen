module Sdkgen.Context

open System
open Microsoft.AspNetCore.Http
open System.Text.Json
open System.Collections.Generic
open Sdkgen.Helpers

type ContextDeviceInfo =
  { Id: string
    Language: string option
    Platform: Dictionary<string, JsonElement>
    Timezone: string option
    Type: string
    Version: string option
    Fingerprint: string option }

type Context =
  { Name: string
    Args: Dictionary<string, JsonElement>
    DeviceInfo: ContextDeviceInfo
    Extra: Dictionary<string, JsonElement>
    mutable Headers: IHeaderDictionary
    Id: string
    mutable Ip: string }


let DecodeContextDeviceInfo (json_: JsonElement) (path_: string) : ContextDeviceInfo =
  if (json_.ValueKind <> JsonValueKind.Object) then
    raise (FatalException($"'{path_}' must be an object."))

  let IdJson_ =
    decodeJsonElementWeak "id" json_ $"{path_}.id"

  let Id =
    decodeOptional decodeString IdJson_ $"{path_}.id"

  let LanguageJson_ =
    decodeJsonElementWeak "language" json_ $"{path_}.language"

  let Language =
    decodeOptional decodeString LanguageJson_ $"{path_}.language"

  let PlatformJson_ =
    decodeJsonElementWeak "platform" json_ $"{path_}.platform"

  if (PlatformJson_.ValueKind <> JsonValueKind.Undefined
      && PlatformJson_.ValueKind <> JsonValueKind.Null
      && PlatformJson_.ValueKind <> JsonValueKind.Object) then
    raise (FatalException($"'${path_}.platform' must be set to an object."))

  let Platform = new Dictionary<string, JsonElement>()

  if (PlatformJson_.ValueKind = JsonValueKind.Object) then
    PlatformJson_.EnumerateObject()
    |> Seq.iter (fun propety -> Platform.Add(propety.Name, propety.Value))

  let TimezoneJson_ =
    decodeJsonElementWeak "timezone" json_ $"{path_}.timezone"

  let Timezone =
    decodeOptional decodeString TimezoneJson_ $"{path_}.timezone"

  let TypeJson_ =
    decodeJsonElementWeak "type" json_ $"{path_}.type"

  let Type =
    decodeOptional decodeString TypeJson_ $"{path_}.type"

  let VersionJson_ =
    decodeJsonElementWeak "version" json_ $"{path_}.version"

  let Version =
    decodeOptional decodeString VersionJson_ $"{path_}.version"

  let FingerprintJson_ =
    decodeJsonElementWeak "fingerprint" json_ $"{path_}.fingerprint"

  let Fingerprint =
    decodeOptional decodeString FingerprintJson_ $"{path_}.fingerprint"

  { Id = Id |> Option.defaultValue (randomBytes 16)
    Language = Language
    Platform = Platform
    Timezone = Timezone
    Type = Type |> Option.defaultValue "api"
    Version = Version
    Fingerprint = Fingerprint }

let DecodeContext (json_: JsonElement) (path_: string) : Context =
  if (json_.ValueKind <> JsonValueKind.Object) then
    raise (FatalException($"'{path_}' must be an object."))

  let NameJson_ =
    decodeJsonElementWeak "name" json_ $"{path_}.name"

  let Name = decodeString NameJson_ $"{path_}.name"
  let ArgsJson_ =
    decodeJsonElementWeak "args" json_ $"{path_}.args"

  if (ArgsJson_.ValueKind <> JsonValueKind.Undefined
      && ArgsJson_.ValueKind <> JsonValueKind.Null
      && ArgsJson_.ValueKind <> JsonValueKind.Object) then
    raise (FatalException($"'${path_}.args' must be set to an object."))

  let Args = new Dictionary<string, JsonElement>()

  if (ArgsJson_.ValueKind = JsonValueKind.Object) then
    ArgsJson_.EnumerateObject()
    |> Seq.iter (fun propety -> Args.Add(propety.Name, propety.Value))

  let DeviceInfoJson_ =
    decodeJsonElementWeak "deviceInfo" json_ $"{path_}.deviceInfo"

  let DeviceInfo =
    DecodeContextDeviceInfo DeviceInfoJson_ $"{path_}.deviceInfo"

  let ExtraJson_ =
    decodeJsonElementWeak "extra" json_ $"{path_}.extra"

  if (ExtraJson_.ValueKind <> JsonValueKind.Undefined
      && ExtraJson_.ValueKind <> JsonValueKind.Null
      && ExtraJson_.ValueKind <> JsonValueKind.Object) then
    raise (FatalException($"'${path_}.extra' must be set to an object."))

  let Extra = new Dictionary<string, JsonElement>()

  if (ExtraJson_.ValueKind = JsonValueKind.Object) then
    ExtraJson_.EnumerateObject()
    |> Seq.iter (fun propety -> Extra.Add(propety.Name, propety.Value))

  let Headers = HeaderDictionary()

  let IdJson_ =
    decodeJsonElementWeak "id" json_ $"{path_}.id"

  let Id =
    decodeOptional decodeString IdJson_ $"{path_}.id"

  let IpJson_ =
    decodeJsonElementWeak "ip" json_ $"{path_}.ip"

  let Ip =
    decodeOptional decodeString IpJson_ $"{path_}.ip"

  { Name = Name
    Args = Args
    DeviceInfo = DeviceInfo
    Extra = Extra
    Headers = Headers
    Id = $"{DeviceInfo.Id}-{Id |> Option.defaultValue (randomBytes 16)}"
    Ip = Ip |> Option.defaultValue "" }

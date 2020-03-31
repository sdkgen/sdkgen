using System.Text.Json;
using System.Collections.Generic;

namespace Sdkgen.Runtime
{
    class ContextParser
    {
        public static Context DecodeContext(JsonElement json_, string path_)
        {
            if (json_.ValueKind != JsonValueKind.Object)
            {
                throw new SdkgenException("Fatal", $"'{path_}' must be an object");
            }
            JsonElement argsJson_;
            if (!json_.TryGetProperty("args", out argsJson_) || argsJson_.ValueKind != JsonValueKind.Object)
            {
                throw new SdkgenException("Fatal", $"'{path_}.args' must be an object");
            }
            var args = new Dictionary<string, JsonElement>();
            foreach (var property in argsJson_.EnumerateObject())
            {
                args.Add(property.Name, property.Value);
            }

            JsonElement deviceInfoJson_;
            ContextDeviceInfo deviceInfo;
            if (json_.TryGetProperty("deviceInfo", out deviceInfoJson_))
            {
                deviceInfo = DecodeContextDeviceInfo(deviceInfoJson_, $"{path_}.deviceInfo");
            }
            else
            {
                deviceInfo = new ContextDeviceInfo(null, null, new Dictionary<string, JsonElement>(), null, null, null, null);
            }

            JsonElement extraJson_;
            var extra = new Dictionary<string, JsonElement>();
            if (json_.TryGetProperty("extra", out extraJson_))
            {
                if (argsJson_.ValueKind != JsonValueKind.Object)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.extra' must be set to an object");

                }
                foreach (var property in extraJson_.EnumerateObject())
                {
                    extra.Add(property.Name, property.Value);
                }
            }

            JsonElement nameJson_;
            if (!json_.TryGetProperty("name", out nameJson_))
            {
                throw new SdkgenException("Fatal", $"'{path_}.name' must be set to a value of type string");
            }
            string name;
            if (nameJson_.ValueKind != JsonValueKind.String)
            {
                throw new SdkgenException("Fatal", $"'{path_}.name' must be set to a value of type string");
            }
            name = nameJson_.GetString();

            JsonElement requestIdJson_;
            if (!json_.TryGetProperty("requestId", out requestIdJson_))
            {
                requestIdJson_ = new JsonElement();
            }
            string? requestId;
            if (requestIdJson_.ValueKind == JsonValueKind.Null || requestIdJson_.ValueKind == JsonValueKind.Undefined)
            {
                requestId = null;
            }
            else
            {
                if (requestIdJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.requestId' must be set to a value of type string");
                }
                requestId = requestIdJson_.GetString();
            }
            return new Context(name, args, deviceInfo, extra, requestId);
        }

        public static ContextDeviceInfo DecodeContextDeviceInfo(JsonElement json_, string path_)
        {
            if (json_.ValueKind != JsonValueKind.Object)
            {
                throw new SdkgenException("Fatal", $"'{path_}' must be an object");
            }

            JsonElement idJson_;
            if (!json_.TryGetProperty("id", out idJson_))
            {
                idJson_ = new JsonElement();
            }
            string? id;
            if (idJson_.ValueKind == JsonValueKind.Null || idJson_.ValueKind == JsonValueKind.Undefined)
            {
                id = null;
            }
            else
            {
                if (idJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.id' must be set to a value of type string");
                }
                id = idJson_.GetString();
            }

            JsonElement languageJson_;
            if (!json_.TryGetProperty("language", out languageJson_))
            {
                languageJson_ = new JsonElement();
            }
            string? language;
            if (languageJson_.ValueKind == JsonValueKind.Null || languageJson_.ValueKind == JsonValueKind.Undefined)
            {
                language = null;
            }
            else
            {
                if (languageJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.language' must be set to a value of type string");
                }
                language = languageJson_.GetString();
            }

            JsonElement platformJson_;
            if (!json_.TryGetProperty("platform", out platformJson_))
            {
                platformJson_ = new JsonElement();
            }
            if (platformJson_.ValueKind != JsonValueKind.Undefined && platformJson_.ValueKind != JsonValueKind.Null && platformJson_.ValueKind != JsonValueKind.Object)
            {
                throw new SdkgenException("Fatal", $"'{path_}.platform' must be set to an object");
            }
            var platform = new Dictionary<string, JsonElement>();
            if (platformJson_.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in platformJson_.EnumerateObject())
                {
                    platform.Add(property.Name, property.Value);
                }
            }

            JsonElement timezoneJson_;
            if (!json_.TryGetProperty("timezone", out timezoneJson_))
            {
                timezoneJson_ = new JsonElement();
            }
            string? timezone;
            if (timezoneJson_.ValueKind == JsonValueKind.Null || timezoneJson_.ValueKind == JsonValueKind.Undefined)
            {
                timezone = null;
            }
            else
            {
                if (timezoneJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.timezone' must be set to a value of type string");
                }
                timezone = timezoneJson_.GetString();
            }

            JsonElement typeJson_;
            if (!json_.TryGetProperty("type", out typeJson_))
            {
                typeJson_ = new JsonElement();
            }
            string? type;
            if (typeJson_.ValueKind == JsonValueKind.Null || typeJson_.ValueKind == JsonValueKind.Undefined)
            {
                type = null;
            }
            else
            {
                if (typeJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.type' must be set to a value of type string");
                }
                type = typeJson_.GetString();
            }

            JsonElement versionJson_;
            if (!json_.TryGetProperty("version", out versionJson_))
            {
                versionJson_ = new JsonElement();
            }
            string? version;
            if (versionJson_.ValueKind == JsonValueKind.Null || versionJson_.ValueKind == JsonValueKind.Undefined)
            {
                version = null;
            }
            else
            {
                if (versionJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.version' must be set to a value of type string");
                }
                version = versionJson_.GetString();
            }

            JsonElement fingerprintJson_;
            if (!json_.TryGetProperty("fingerprint", out fingerprintJson_))
            {
                fingerprintJson_ = new JsonElement();
            }
            string? fingerprint;
            if (fingerprintJson_.ValueKind == JsonValueKind.Null || fingerprintJson_.ValueKind == JsonValueKind.Undefined)
            {
                fingerprint = null;
            }
            else
            {
                if (fingerprintJson_.ValueKind != JsonValueKind.String)
                {
                    throw new SdkgenException("Fatal", $"'{path_}.fingerprint' must be set to a value of type string");
                }
                fingerprint = fingerprintJson_.GetString();
            }

            return new ContextDeviceInfo(id, language, platform, timezone, type, version, fingerprint);
        }


    }
}

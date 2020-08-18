using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using System;
using System.Buffers;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Sdkgen.Runtime
{
    public class SdkgenException : Exception
    {
        public string Type;
        public SdkgenException(string type, string message, Exception? inner = null) : base(message, inner) { Type = type; }
    }

    class Helper
    {
        static Random random = new Random();
        static public string randomBytes(int bytes)
        {
            var buffer = new byte[bytes];
            random.NextBytes(buffer);
            return String.Concat(buffer.Select(x => x.ToString("x2")).ToArray());
        }
    }

    public class ContextDeviceInfo
    {
        public string Id;
        public string? Language;
        public Dictionary<string, JsonElement> Platform;
        public string? Timezone;
        public string Type;
        public string? Version;
        public string? Fingerprint;
        public ContextDeviceInfo(string? id, string? language, Dictionary<string, JsonElement> platform, string? timezone, string? type, string? version, string? fingerprint)
        {
            Id = id ?? Helper.randomBytes(16);
            Language = language;
            Platform = platform;
            Timezone = timezone;
            Type = type ?? "api";
            Version = version;
            Fingerprint = fingerprint;
        }
    }

    public class Context
    {
        public string Name;
        public Dictionary<string, JsonElement> Args;
        public ContextDeviceInfo DeviceInfo;
        public Dictionary<string, JsonElement> Extra;
        public IHeaderDictionary Headers = new HeaderDictionary();
        public string Id;
        public string Ip = "";
        public Context(string name, Dictionary<string, JsonElement> args, ContextDeviceInfo deviceInfo, Dictionary<string, JsonElement> extra, string? id)
        {
            Name = name;
            Args = args;
            DeviceInfo = deviceInfo;
            Extra = extra;
            Id = $"{deviceInfo.Id}-{id ?? Helper.randomBytes(16)}";
        }
    }

    public interface BaseApi
    {
        Task ExecuteFunction(Context context, Utf8JsonWriter resultWriter);
        string GetAstJson();
    }

    public class SdkgenHttpServer
    {
        BaseApi Api;
        bool DynamicCorsOrigin = true;
        public bool Introspection = true;
        IHeaderDictionary Headers = new HeaderDictionary();
        Func<Task<Boolean>> OnHealthCheck = () => Task.FromResult<Boolean>(true);
        Action<Context, SdkgenException>? OnRequestError = null;
        public SdkgenHttpServer(BaseApi api)
        {
            Api = api;
        }
        public void Listen(short port)
        {
            var host = new WebHostBuilder()
                .UseKestrel()
                .UseContentRoot("sdkgen.runtime.static")
                .UseWebRoot("")
                .Configure(app =>
                {
                    app.UseDefaultFiles();
                    app.UseStaticFiles();
                    app.Run(httpContext => handleRequest(httpContext));
                })
                .UseUrls($"http://localhost:{port}")
                .Build();
            host.Run();
        }

        async public Task handleRequest(HttpContext httpContext)
        {
            if (Introspection && httpContext.Request.Path == "/ast.json" && httpContext.Request.Method.ToUpperInvariant() == "GET")
            {
                await httpContext.Response.WriteAsync(Api.GetAstJson());
                return;
            }

            Context? context = null;
            JsonDocument? bodyDocument = null;
            var stopWatch = new Stopwatch();
            stopWatch.Start();

            try
            {
                StringValues origin;
                if (DynamicCorsOrigin && httpContext.Request.Headers.TryGetValue("origin", out origin))
                {
                    httpContext.Response.Headers.Add("Access-Control-Allow-Origin", origin);
                    httpContext.Response.Headers.Add("Vary", "Origin");
                }

                string method = httpContext.Request.Method.ToUpperInvariant();

                foreach (var header in Headers)
                {
                    if (method == "OPTIONS" && !header.Key.ToLowerInvariant().StartsWith("access-control-"))
                    {
                        continue;
                    }

                    httpContext.Response.Headers.Add(header.Key, header.Value);
                }

                if (method == "OPTIONS")
                {
                    return;
                }

                httpContext.Response.Headers.Add("Content-Type", "application/json; charset=utf-8");

                if (method == "HEAD")
                {
                    return;
                }

                if (method == "GET")
                {
                    if (httpContext.Request.Path.Value != "/")
                    {
                        httpContext.Response.StatusCode = 404;
                        return;
                    }

                    var ok = false;
                    try
                    {
                        ok = await OnHealthCheck();
                    }
                    catch (Exception)
                    {
                    }

                    httpContext.Response.StatusCode = ok ? 200 : 500;
                    await httpContext.Response.WriteAsync(ok ? "{\"ok\":true}" : "{\"ok\":false}");
                    return;
                }

                if (method != "POST")
                {
                    httpContext.Response.StatusCode = 404;
                    return;
                }

                bodyDocument = await JsonDocument.ParseAsync(httpContext.Request.Body);
                context = ContextParser.DecodeContext(bodyDocument.RootElement, "body");
                context.Headers = httpContext.Request.Headers;
                // TODO: X-Forwarded-For with trusted proxies
                context.Ip = httpContext.Connection.RemoteIpAddress.ToString();

                var duration = stopWatch.Elapsed.TotalSeconds;
                var bufferWriter = new ArrayBufferWriter<byte>();
                using (var resultWriter = new Utf8JsonWriter(bufferWriter))
                {
                    resultWriter.WriteStartObject();
                    resultWriter.WritePropertyName("result");
                    await Api.ExecuteFunction(context, resultWriter);
                    resultWriter.WriteNull("error");
                    resultWriter.WriteNumber("duration", duration);
                    resultWriter.WriteString("host", Dns.GetHostName());
                    resultWriter.WriteEndObject();
                }

                Console.WriteLine($"{context.Id} [{duration.ToString("0.000000")}s] {context.Name}() -> OK");

                await httpContext.Response.WriteAsync(Encoding.UTF8.GetString(bufferWriter.WrittenSpan));
            }
            catch (Exception error)
            {
                Console.WriteLine(error.ToString());
                SdkgenException sdkgenError;
                if (error is SdkgenException)
                {
                    sdkgenError = (error as SdkgenException)!;
                }
                else
                {
                    sdkgenError = new SdkgenException("Fatal", error.Message, error);
                }

                var duration = stopWatch.Elapsed.TotalSeconds;

                if (OnRequestError != null && context != null)
                {
                    OnRequestError.Invoke(context, sdkgenError);
                    Console.WriteLine($"{context.Id} [{duration.ToString("0.000000")}s] {context.Name}() -> {sdkgenError.Type}");
                }

                httpContext.Response.StatusCode = sdkgenError.Type == "Fatal" ? 500 : 400;

                using (var resultWriter = new Utf8JsonWriter(httpContext.Response.Body))
                {
                    resultWriter.WriteStartObject();
                    resultWriter.WriteNull("result");
                    resultWriter.WriteStartObject("error");
                    resultWriter.WriteString("type", sdkgenError.Type);
                    resultWriter.WriteString("message", sdkgenError.Message);
                    resultWriter.WriteEndObject();
                    resultWriter.WriteNumber("duration", duration);
                    resultWriter.WriteString("host", Dns.GetHostName());
                    resultWriter.WriteEndObject();
                }
            }
            finally
            {
                bodyDocument?.Dispose();
            }
        }
    }
}

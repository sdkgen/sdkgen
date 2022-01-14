module Sdkgen.Runtime

open System
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.AspNetCore.Http
open Giraffe
open System.Text.Json
open System.Threading.Tasks
open Sdkgen.Helpers
open System.Diagnostics
open Microsoft.Extensions.Primitives
open System.Net
open System.Buffers
open System.Text
open Sdkgen.Context
open Microsoft.Extensions.Logging
open System.Text.RegularExpressions
open FSharp.Control.Tasks.V2.ContextInsensitive

type BaseApi =
  abstract member ExecuteFunction : Context * Utf8JsonWriter -> Task
  abstract member GetAstJson : unit -> string

type Matcher =
  | Reg of Regex
  | Str of string

type Handler =
  { Method: string
    Matcher: Matcher
    Handler: string option }

type SdkgenHttpServer(api: BaseApi) =
  let Api = api
  let DynamicCorsOrigin = true
  let Introspection = true
  let HasSwagger = false
  let IgnoredUrlPrefix = ""
  let Headers = HeaderDictionary()
  let OnHealthCheck = (fun () -> Task.FromResult(true))
  let OnRequestError: Action<Context, SdkgenException> option = None
  let Handlers: (HttpRequest -> HttpResponse -> Buffer -> unit) list = List.empty

  let isAst (next: HttpFunc) (httpContext: HttpContext) =
    Introspection
    && httpContext.Request.Path = PathString("/ast.json")
    && httpContext.Request.Method.ToUpperInvariant() = "GET"

  let enableCors (httpContext: HttpContext) =
    httpContext.Response.Headers.Add(
      "Access-Control-Allow-Methods",
      StringValues "DELETE, HEAD, PUT, POST, PATCH, GET, OPTIONS"
    )

    httpContext.Response.Headers.Add("Access-Control-Allow-Headers", StringValues "Content-Type")
    httpContext.Response.Headers.Add("Access-Control-Max-Age", StringValues "86400")

  let addHeader (header: string) (value: string) =
    let cleanHeader = header.ToLower().Trim()

    let existing =
      Headers.Keys
      |> Seq.tryFind (fun x -> x.ToLowerInvariant().Trim().Equals(cleanHeader))

    match existing with
    | Some a when a.Contains(value) -> Headers.Add(cleanHeader, StringValues value)
    | None -> Headers.Add(cleanHeader, StringValues $"{existing.Value}, {value}")
    | _ -> ()

    ()

  let checkOrigin (httpContext: HttpContext) =
    let (ifGetOrigin, origin) =
      httpContext.Request.Headers.TryGetValue("origin")

    if DynamicCorsOrigin && ifGetOrigin then
      httpContext.Response.Headers.Add("Access-Control-Allow-Origin", origin)
      httpContext.Response.Headers.Add("Vary", StringValues("Origin"))

  let filterHeadersOptions (httpContext: HttpContext) =
    let key =
      Headers.Keys
      |> Seq.tryFind (fun x -> x.ToLowerInvariant().StartsWith("access-control-"))

    match key with
    | None -> ()
    | Some k ->
      let (_, v) = Headers.TryGetValue(k)
      httpContext.Response.Headers.Add(k, v)

  let healthCheck (httpContext: HttpContext) =
    task {
      let! ok =
        try
          OnHealthCheck()
        with
        | _ -> Task.FromResult(false)

      httpContext.Response.StatusCode <- if ok then 200 else 500

      do!
        httpContext.Response.WriteAsync(
          if ok then
            "{\"ok\":true}"
          else
            "{\"ok\":false}"
        )
    }

  let handleRequest: HttpHandler =
    fun (next: HttpFunc) (httpContext: HttpContext) ->
      task {
        let stopWatch = Stopwatch()
        stopWatch.Start()
        let mutable context: Context option = None

        try
          if isAst next httpContext then
            do! httpContext.Response.WriteAsync(Api.GetAstJson())
            return! next httpContext
          else

            checkOrigin httpContext

            let method =
              (httpContext.Request.Method.ToUpperInvariant())

            if method = "OPTIONS" then
              filterHeadersOptions httpContext
              return! next httpContext
            else
              httpContext.Response.Headers.Add("Content-Type", StringValues("application/json; charset=utf-8"))

              match method with
              | "GET" when httpContext.Request.Path.Value <> "/" ->
                httpContext.Response.StatusCode <- 404
                return! next httpContext
              | "GET" ->
                do! healthCheck httpContext
                return! next httpContext
              | v when v <> "POST" ->
                httpContext.Response.StatusCode <- 404
                return! next httpContext
              | _ ->
                let! bodyDocument = JsonDocument.ParseAsync(httpContext.Request.Body)

                context <-
                  DecodeContext bodyDocument.RootElement "body"
                  |> Some

                context.Value.Headers <- httpContext.Request.Headers
                context.Value.Ip <- httpContext.Connection.RemoteIpAddress.ToString()

                let duration = stopWatch.Elapsed.TotalSeconds
                let bufferWriter = new ArrayBufferWriter<byte>()
                use resultWriter = new Utf8JsonWriter(bufferWriter)

                resultWriter.WriteStartObject()
                resultWriter.WritePropertyName("result")
                do! Api.ExecuteFunction(context.Value, resultWriter)
                resultWriter.WriteNull("error")
                resultWriter.WriteNumber("duration", duration)
                let host = (Dns.GetHostName())
                resultWriter.WriteString("host", host.ToString())
                resultWriter.WriteEndObject()
                do! resultWriter.FlushAsync()

                let finalDuration = duration.ToString("0.000000")

                stdout.WriteLine($"{context.Value.Id} [{finalDuration}s] {context.Value.Name}() -> OK")

                do! httpContext.Response.WriteAsync(Encoding.UTF8.GetString(bufferWriter.WrittenSpan))
                return! next httpContext
        with
        | e ->
          stdout.WriteLine(e.ToString())

          let error =
            match e with
            | :? SdkgenException as e -> e
            | error -> SdkgenException("Fatal", error.Message, error)

          let duration = stopWatch.Elapsed.TotalSeconds
          let finalDuration = (duration.ToString("0.000000"))

          if (OnRequestError <> None && context <> None) then
            stdout.WriteLine $"{context.Value.Id} [{finalDuration}s] {context.Value.Name}() -> {error.Type}"
            OnRequestError.Value.Invoke(context.Value, error)

          httpContext.Response.StatusCode <-
            if error.Type = "Fatal" then
              500
            else
              400

          let bufferWriter = new ArrayBufferWriter<byte>()
          use resultWriter = new Utf8JsonWriter(bufferWriter)
          resultWriter.WriteStartObject()
          resultWriter.WriteNull("result")
          resultWriter.WriteStartObject("error")
          resultWriter.WriteString("type", error.Type)
          resultWriter.WriteString("message", error.Message)
          resultWriter.WriteEndObject()
          resultWriter.WriteNumber("duration", duration)
          resultWriter.WriteString("host", Dns.GetHostName())
          resultWriter.WriteEndObject()
          do! resultWriter.FlushAsync()
          do! httpContext.Response.WriteAsync(Encoding.UTF8.GetString(bufferWriter.WrittenSpan))

          return! next httpContext
      }

  member this.Listen port =
    WebHostBuilder()
      .UseKestrel()
      .UseWebRoot("")
      .Configure(fun (appBuilder: IApplicationBuilder) ->
        appBuilder
          .UseDefaultFiles()
          .UseStaticFiles()
          .UseGiraffe(handleRequest))
      .ConfigureLogging(fun (builder: ILoggingBuilder) ->
        let filter (l: LogLevel) = l.Equals LogLevel.Warning

        builder.AddFilter(filter).AddConsole().AddDebug()
        |> ignore)
      .UseUrls($"http://localhost:{port}")
      .Build()
      .Run()

module Sdkgen.Runtime

open System
open Microsoft.AspNetCore
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.AspNetCore.Http
open Giraffe
open FSharp.Control.Tasks
open System.Text.Json
open System.Collections.Generic
open System.Threading.Tasks
open Sdkgen.Helpers
open System.Diagnostics
open Microsoft.Extensions.Primitives
open System.Net
open System.Buffers
open System.Text
open Sdkgen.Context

type BaseApi =
  abstract member ExecuteFunction : Context * Utf8JsonWriter -> Task
  abstract member GetAstJson : unit -> string

type SdkgenHttpServer(api: BaseApi) =
  let Api = api
  let DynamicCorsOrigin = true
  let Introspection = true
  let Headers = HeaderDictionary()
  let OnHealthCheck = (fun () -> Task.FromResult(true))
  let OnRequestError: Action<Context, SdkgenException> option = None

  let handleRequest: HttpHandler =
    fun (next: HttpFunc) (httpContext: HttpContext) ->
      task {
        if (Introspection
            && httpContext.Request.Path = PathString("/ast.json")
            && httpContext.Request.Method.ToUpperInvariant() = "GET") then
          do! httpContext.Response.WriteAsync(Api.GetAstJson())
          return None
        else
          let stopWatch = Stopwatch()
          stopWatch.Start()

          let (ifTrue, origin) =
            httpContext.Request.Headers.TryGetValue("origin")

          if DynamicCorsOrigin && ifTrue then
            httpContext.Response.Headers.Add("Access-Control-Allow-Origin", origin)
            httpContext.Response.Headers.Add("Vary", StringValues("Origin"))


          let method =
            (httpContext.Request.Method.ToUpperInvariant())

          if method = "OPTIONS" then
            let key =
              Headers.Keys
              |> Seq.tryFind (fun x -> x.ToLowerInvariant().StartsWith("access-control-"))

            match key with
            | None -> ()
            | Some k ->
              let (_, v) = Headers.TryGetValue(k)
              httpContext.Response.Headers.Add(k, v)

            return None
          else
            httpContext.Response.Headers.Add("Content-Type", StringValues("application/json; charset=utf-8"))

            match method with
            | "GET" when httpContext.Request.Path.Value <> "/" ->
              httpContext.Response.StatusCode <- 404
              return None
            | "GET" ->
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

              return None
            | v when v <> "POST" ->
              httpContext.Response.StatusCode <- 404
              return None
            | _ ->
              let! bodyDocument = JsonDocument.ParseAsync(httpContext.Request.Body)
              let context = DecodeContext bodyDocument.RootElement "body"

              context.Headers <- httpContext.Request.Headers
              context.Ip <- httpContext.Connection.RemoteIpAddress.ToString()

              let duration = stopWatch.Elapsed.TotalSeconds
              let bufferWriter = new ArrayBufferWriter<byte>()
              use resultWriter = new Utf8JsonWriter(bufferWriter)

              resultWriter.WriteStartObject()
              resultWriter.WritePropertyName("result")
              do! Api.ExecuteFunction (context, resultWriter)
              resultWriter.WriteNull("error")
              resultWriter.WriteNumber("duration", duration)
              let host = (Dns.GetHostName())
              resultWriter.WriteString("host", host.ToString())
              resultWriter.WriteEndObject()
              do! resultWriter.FlushAsync()

              let finalDuration = duration.ToString("0.000000")

              Console.WriteLine($"{context.Id} [{finalDuration}s] {context.Name}() -> OK")

              do! httpContext.Response.WriteAsync(Encoding.UTF8.GetString(bufferWriter.WrittenSpan))
              return! next httpContext
      }

  member this.Listen port =
    WebHost
      .CreateDefaultBuilder()
      .UseKestrel()
      .Configure(fun (appBuilder: IApplicationBuilder) ->
        appBuilder
          .UseDefaultFiles()
          .UseStaticFiles()
          .UseRouting()
          .UseGiraffe(handleRequest))
      // .ConfigureServices(configureServices)
      .UseUrls(
        $"http://localhost:{port}"
      )
      .Build()
      .Run()

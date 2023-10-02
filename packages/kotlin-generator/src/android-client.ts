import type { AstRoot } from "@sdkgen/parser";
import { ErrorNode, HiddenAnnotation, VoidPrimitiveType } from "@sdkgen/parser";

import { generateClass, generateEnum, generateErrorClass, generateJsonAddRepresentation, generateKotlinTypeName, mangle } from "./helpers";

export function generateAndroidClientSource(ast: AstRoot, shouldImplementCallbacks: boolean): string {
  let code = `@file:Suppress("UNNECESSARY_SAFE_CALL")

import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import android.content.Context
import android.util.Base64
import com.google.gson.*
import com.google.gson.reflect.TypeToken
import com.google.gson.annotations.JsonAdapter
import com.google.gson.annotations.SerializedName
import io.sdkgen.runtime.SdkgenHttpClient
import kotlinx.coroutines.*
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.parcelize.RawValue
import java.util.*
import okhttp3.Interceptor

inline fun <reified T> Gson.fromJson(json: String) =
    fromJson<T>(json, object : TypeToken<T>() {}.type)

inline fun <reified T> Gson.fromJson(json: JsonElement) =
    fromJson<T>(json, object : TypeToken<T>() {}.type)

@Suppress("DeferredIsResult", "unused")
class ApiClient(
    baseUrl: String,
    val applicationContext: Context,
    defaultTimeoutMillis: Long = 10000L,
    fingerprint: String? = null,
    httpInterceptor: Interceptor? = null,
    httpNetworkInterceptor: Interceptor? = null
) : SdkgenHttpClient(baseUrl, applicationContext, defaultTimeoutMillis, fingerprint, httpInterceptor, httpNetworkInterceptor) {

    private val gson = GsonBuilder()
        .registerTypeAdapter(object : TypeToken<ByteArray>() {}.type, ByteArrayDeserializer())
        .create()\n\n`;

  for (const type of ast.enumTypes) {
    code += `   ${generateEnum(type)}`;
    code += "\n";
  }

  code += `    open class Error(val message: String? = null)\n`;
  code += `    data class Response<T>(val error: Error?, val data: T?, val stats: CallStats?)\n\n`;

  for (const type of ast.structTypes) {
    code += `    ${generateClass(type)}\n`;
  }

  const errorTypeEnumEntries: string[] = [];

  const connectionError = new ErrorNode("Connection", new VoidPrimitiveType());

  errorTypeEnumEntries.push(connectionError.name);
  code += `    ${generateErrorClass(connectionError)}`;

  for (const error of ast.errors) {
    code += `    ${generateErrorClass(error)}`;
    errorTypeEnumEntries.push(error.name);
  }

  if (errorTypeEnumEntries.length > 0) {
    code += `
    enum class ErrorType {
        ${errorTypeEnumEntries.join(",\n        ")};

        fun type(): Class<out ApiClient.Error> {
            return when (this) {
                ${errorTypeEnumEntries.map(error => `${error} -> ApiClient.${error}::class.java`).join("\n                ")}
                else -> ApiClient.Error::class.java
            }
        }
    }\n\n`;
  }

  code += `    private val sdkgenIOScope = CoroutineScope(IO + SupervisorJob())\n\n`;
  code += ast.operations
    .filter(op => op.annotations.every(ann => !(ann instanceof HiddenAnnotation)))
    .map(op => {
      let opImpl = "";
      const defaultArguments: string[] = [];

      defaultArguments.push(`timeoutMillis: Long? = null`);
      if (shouldImplementCallbacks) {
        defaultArguments.push(`callback: ((response: Response<${generateKotlinTypeName(op.returnType)}>) -> Unit)? = null`);
      }

      const args = op.args.map(arg => `${mangle(arg.name)}: ${generateKotlinTypeName(arg.type)}`).concat(defaultArguments);

      opImpl += `    fun ${mangle(op.name)}(\n        ${args.join(",\n        ")}\n    ): Deferred<Response<out ${generateKotlinTypeName(
        op.returnType,
      )}>> = sdkgenIOScope.async {\n`;

      if (op.args.length > 0) {
        opImpl += `        val bodyArgs = JsonObject().apply {\n`;
        opImpl += op.args.map(arg => `            ${generateJsonAddRepresentation(arg.type, arg.name)}`).join("\n");
        opImpl += `\n        }\n`;
      } else {
        opImpl += `        val bodyArgs: JsonObject? = null`;
      }

      opImpl += `\n`;
      opImpl += `        val call = makeRequest("${op.name}", bodyArgs, timeoutMillis)\n`;
      opImpl += `        val response: Response<${generateKotlinTypeName(op.returnType)}> = handleCallResponse(call)\n`;
      if (shouldImplementCallbacks) {
        opImpl += `        withContext(Dispatchers.Main) { callback?.invoke(response) } \n`;
      }

      opImpl += `        return@async response\n`;
      opImpl += `    }\n`;
      return opImpl;
    })
    .join("\n");

  code += `
    private inline fun <reified T> handleCallResponse(callResponse: InternalResponse): Response<T> {
        try {
            val data = if (callResponse.result?.get("result") != null)
                gson.fromJson<T>(callResponse.result?.get("result")!!)
            else null

            val error = if (callResponse.error != null) {
                val errorType = try {
                    ErrorType.valueOf(callResponse.error?.get("type")?.asString ?: "")
                } catch (e: Exception) {
                    ErrorType.Fatal
                }

                gson.fromJson(callResponse.error, errorType.type())
            } else null

            return Response(error, data, callResponse.stats)
        } catch(e: Exception) {
            return Response(Fatal(applicationContext.getString(io.sdkgen.runtime.R.string.sdkgen_error_serialization)), null, callResponse.stats)
        }
    }\n`;

  code += `}\n`;

  return code;
}

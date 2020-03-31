import { AstRoot } from "@sdkgen/parser";
import { generateClass, generateEnum, generateErrorClass, generateJsonAddRepresentation, generateKotlinTypeName, mangle } from "./helpers";

interface Options {}

export function generateAndroidClientSource(ast: AstRoot, options: Options) {
    let code = `@file:Suppress("UNNECESSARY_SAFE_CALL")

import android.content.Context
import android.util.Base64
import com.google.gson.*
import com.google.gson.reflect.TypeToken
import com.google.gson.annotations.JsonAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter
import io.sdkgen.runtime.SdkgenHttpClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.async
import java.lang.reflect.Type
import java.text.SimpleDateFormat
import java.util.*

inline fun <reified T> Gson.fromJson(json: String) =
    fromJson<T>(json, object : TypeToken<T>() {}.type)

inline fun <reified T> Gson.fromJson(json: JsonElement) =
    fromJson<T>(json, object : TypeToken<T>() {}.type)

@Suppress("DeferredIsResult", "unused")
class ApiClient(
    baseUrl: String,
    applicationContext: Context,
    defaultTimeoutMillis: Long = 10000L
) : SdkgenHttpClient(baseUrl, applicationContext, defaultTimeoutMillis) {`;

    code += `
    private class ByteArrayDeserializer : JsonDeserializer<ByteArray> {
        @Throws(JsonParseException::class)
        override fun deserialize(
            element: JsonElement,
            arg1: Type?,
            arg2: JsonDeserializationContext?
        ): ByteArray {
            try {
                return Base64.decode(element.asString, Base64.DEFAULT)
            } catch (e: Exception) {
                throw JsonIOException(e.message)
            }
        }
    }

    private class DateTimeAdapter: TypeAdapter<Calendar>() {
        companion object {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US).apply { 
                this.timeZone = TimeZone.getTimeZone("UTC")
            }
        }
        
        override fun write(out: JsonWriter?, value: Calendar?) {
            out?.let {
                if (value == null) {
                    it.nullValue()
                    return
                }

                val dateTimeString = sdf.format(value.time)
                it.value(dateTimeString)
            }
        }

        override fun read(reader: JsonReader?): Calendar? {
            reader?.let {
                val dateTimeString = it.nextString()

                try {
                    return Calendar.getInstance().apply { time = sdf.parse(dateTimeString)!! }
                } catch (e: Exception) {
                    throw JsonIOException(e.message)
                }
            } ?: run { 
                return null
            }
        }
    }

    private class DateAdapter: TypeAdapter<Calendar>() {
        companion object {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                this.timeZone = TimeZone.getTimeZone("UTC")
            }
        }

        override fun write(out: JsonWriter?, value: Calendar?) {
            out?.let {
                if (value == null) {
                    it.nullValue()
                    return
                }

                val dateTimeString = sdf.format(value.time)
                it.value(dateTimeString)
            }
        }

        override fun read(reader: JsonReader?): Calendar? {
            reader?.let {
                val dateTimeString = it.nextString()
                
                try {
                    return Calendar.getInstance().apply { time = sdf.parse(dateTimeString)!! }
                } catch (e: Exception) {
                    throw JsonIOException(e.message)
                }
            } ?: run {
                return null
            }
        }
    }

    private val gson = GsonBuilder()
        .registerTypeAdapter(object : TypeToken<ByteArray>() {}.type, ByteArrayDeserializer())
        .create()\n\n`;

    for (const type of ast.enumTypes) {
        code += `   ${generateEnum(type)}`;
        code += "\n";
    }

    code += `    open class Error(val message: String? = null)\n`;
    code += `    data class Response<T>(val error: Error?, val data: T?)\n\n`;

    for (const type of ast.structTypes) {
        code += `    ${generateClass(type)}\n`;
    }

    const errorTypeEnumEntries: string[] = [];
    for (const error of ast.errors) {
        code += `    ${generateErrorClass(error)}`;
        errorTypeEnumEntries.push(error);
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

    code += `    private val sdkgenIOScope = CoroutineScope(IO)\n\n`;
    code += ast.operations
        .map(op => {
            let opImpl = "";
            let args = op.args
                .map(arg => `${mangle(arg.name)}: ${generateKotlinTypeName(arg.type)}`)
                .concat([
                    `timeoutMillis: Long? = null`,
                    `callback: ((response: Response<${generateKotlinTypeName(op.returnType)}>) -> Unit)? = null`,
                ]);
            opImpl += `    fun ${mangle(op.prettyName)}(\n        ${args.join(",\n        ")}\n    ): Deferred<Response<out ${generateKotlinTypeName(
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
            opImpl += `        val call = makeRequest(\"${op.prettyName}\", bodyArgs, timeoutMillis)\n`;
            opImpl += `        val data = if (call.result?.get("result") != null)\n`;
            opImpl += `            gson.fromJson<${generateKotlinTypeName(op.returnType)}>(call.result?.get("result")!!)\n`;
            opImpl += `        else null\n`;
            opImpl += `\n`;
            opImpl += `        val error = if (call.error != null) {\n`;
            opImpl += `            val errorType = try {\n`;
            opImpl += `                ErrorType.valueOf(call.error?.get("type")?.asString ?: "")\n`;
            opImpl += `            } catch (e: Exception) {\n`;
            opImpl += `                ErrorType.Fatal\n`;
            opImpl += `            }\n\n`;
            opImpl += `            gson.fromJson(call.error, errorType.type())\n`;
            opImpl += `        } else null\n`;
            opImpl += `\n`;
            opImpl += `        val response: Response<${generateKotlinTypeName(op.returnType)}> = Response(error, data)\n`;
            opImpl += `        callback?.invoke(response)\n`;
            opImpl += `        return@async response\n`;
            opImpl += `    }\n`;
            return opImpl;
        })
        .join("\n");

    code += `}\n`;

    return code;
}

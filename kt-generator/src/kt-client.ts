import { AstRoot } from "@sdkgen/parser";
import { generateClass, generateEnum, generateErrorClass, generateTypeName } from "./helpers";

interface Options {}

export function generateKtClientSource(ast: AstRoot, options: Options) {
    let code = "";

    code += `
@file:Suppress("UnusedImport")

import android.util.Base64
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import android.view.WindowManager
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONException
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Point
import android.provider.Settings
import android.util.Log
import com.google.gson.Gson
import okhttp3.*
import java.io.IOException
import java.io.Serializable
import org.json.JSONArray
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.*
import kotlinx.coroutines.Dispatchers.IO
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import java.io.InvalidObjectException
import kotlin.concurrent.timerTask
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.Flow
import io.sdkgen.kt_android_runtime.Client
import com.google.gson.JsonObject

@ExperimentalCoroutinesApi
@Suppress("DeferredIsResult", "unused")
@SuppressLint("SimpleDateFormat", "StaticFieldLeak")
object API { \n`;

    code += ` 
    private var client: Client? = null     
    private val gson = Gson()

    fun initialize(baseUrl: String, useStaging: Boolean, applicationContext: Context, defaultTimeoutMillis: Long? = null) {
        client = if (defaultTimeoutMillis == null)
            Client(baseUrl, applicationContext, useStaging = useStaging)
        else
            Client(baseUrl, applicationContext, useStaging = useStaging, defaultTimeoutMillis = defaultTimeoutMillis)
    }\n\n`
    
    for (const type of ast.enumTypes) {
        code += generateEnum(type);
        code += "\n";
    }

    code += `   open class Error(val message: String? = null)\n`
    code += `   data class Response<T>(val error: Error?, val data: T?)\n\n`

    for (const type of ast.structTypes) {
        code += `   ${generateClass(type)}\n`;
    }

    for (const error of ast.errors) {
        code += `   ${generateErrorClass(error)}\n`;
    }

    code += `   interface Calls { \n`
    code += ast.operations.map ( op => 
            `       fun ${op.prettyName}(${op.args.map( arg => `${arg.name}: ${generateTypeName(arg.type)}`)}): Flow<Response<${generateTypeName(op.returnType)}>> \n`
    ).join('')
    code += `   }\n\n`

    code += `   class CallsImpl(): Calls {\n`
    code += ast.operations.map( op => { 
            let opImpl = ""
            opImpl += `       override fun ${op.prettyName}(${op.args.map( arg => `${arg.name}: ${generateTypeName(arg.type)}`)}) = flow<Response<${generateTypeName(op.returnType)}>> { \n`
            opImpl += `             if (client == null) { \n`
            opImpl += `                 emit(Response(Fatal("Você precisa iniciar o SdkGen para fazer chamadas."), null))\n`
            opImpl += `                 return@flow \n`
            opImpl += `             }\n`
                
            if (op.args.length > 0) { 
                opImpl += `         val bodyArgs = JsonObject().apply { \n`
                op.args.map( arg => {
                    switch(arg.type.constructor.name) {
                        case "ArrayType":
                        case "StructType":
                        case "EnumType": 
                        case "TypeReference": 
                            opImpl += `             add(\"${arg.name}\", gson.toJsonTree(${arg.name}))\n`
                        break;
                        default:
                            opImpl += `             addProperty(\"${arg.name}\", ${arg.name})\n`
                        break;
                    }    
                }).join('')
                opImpl += `         }\n`
            } else {
                opImpl += `         val bodyArgs: JsonObject? = null`
            }

            opImpl += `\n`
            opImpl += `             val r = client?.makeRequest(\"${op.prettyName}\", bodyArgs)\n`
            opImpl += `             val data = if (r?.result != null) \n`
            opImpl += `                 gson.fromJson(r.result, object : TypeToken<${generateTypeName(op.returnType)}>() {}.type)\n`
            opImpl += `             else null \n`
            opImpl += `\n`
            opImpl += `             val error = if (r?.error != null) \n`
            opImpl += `                 gson.fromJson(r.result, Error::class.java) \n`
            opImpl += `             else null \n`
            opImpl += `\n`
            opImpl += `             emit(Response(error, data)) \n`
            opImpl += `       }.flowOn(IO) \n`
            return opImpl
    }).join('')
    code += `   }\n`

    code += `}`

    return code;
}

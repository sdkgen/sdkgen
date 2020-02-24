import { AstRoot } from "@sdkgen/parser";
import { generateClass, generateEnum, generateErrorClass, generateTypeName } from "./helpers";

interface Options {
}

export function generateKtClientSource(ast: AstRoot, options: Options) {
    let code = "";

    code += `
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
import android.content.Context
import io.sdkgen.Client
import io.sdkgen.Client.InternalResposne

@ExperimentalCoroutinesApi
@Suppress("DeferredIsResult", "unused")
@SuppressLint("SimpleDateFormat", "StaticFieldLeak")
object API { \n`;

    code += ` 
        private var client: Client? = null     
        private val gson: Gson()

        fun initialize(baseUrl: String, useStaging: Boolean, applicationContext: Context) {
              client = Client(baseUrl, applicationContext, useStaging)
        }
    `

    for (const type of ast.enumTypes) {
        code += generateEnum(type);
        code += "\n";
    }

    code += `data class Response<T>(val error: Error?, val data: T?)\n`

    for (const type of ast.structTypes) {
        code += generateClass(type);
        code += "\n";
    }

    for (const error of ast.errors) {
        code += generateErrorClass(error);
        code += "\n";
    }

    code += `   interface Calls { \n`
    code += ast.operations.map( op => 
            `       fun ${op.prettyName}(${op.args.map( arg => `${arg.name}: ${generateTypeName(arg.type)}`)}): Flow<Response<${generateTypeName(op.returnType)}>> \n`
    )
    code += `   }\n\n`

    code += `   inner class CallsImpl(\n`
    code += `                   baseUrl: String,\n`
    code += `                   applicationContext: Context,\n`
    code += `                   defaultTimeoutMillis: Long\n`
    code += `   ): SdkgenHttpClient(baseUrl, applicationContext, defaultTimeoutMillis) {`
    code += ast.operations.map( op => { 
            let opImpl = ""
            opImpl += `       override fun ${op.prettyName}(${op.args.map( arg => `${arg.name}: ${generateTypeName(arg.type)}`)}): Flow<Response<${generateTypeName(op.returnType)}>> { \n`
            opImpl += `             if (client == null) { \n`
            opImpl += `                 emit(Response(Error(ErrorType.Fatal, "Você precisa iniciar o SdkGen para fazer chamadas."), null))\n`
            opImpl += `                 return \n`
            opImpl += `             }\n`
            opImpl += `\n`
            opImpl += `             val r = client?.makeRequest(\"#{mangle op.pretty_name}\", #{bodyParameter})\n`
            opImpl += `             val data = if (r.result != null) \n`
            opImpl += `                 gson.fromJson(r.result, ${generateTypeName(op.returnType)}::class.java)\n`
            opImpl += `             else null \n`
            opImpl += `\n`
            opImpl += `             val error = if (r.error != null) \n`
            opImpl += `                 gson.fromJson(r.result, Error::class.java) \n`
            opImpl += `             else null \n`
            opImpl += `\n`
            opImpl += `             emit(Response(error, data)) \n`
            opImpl += `       }.flowOn(IO) \n\n`
            return opImpl
    })

    return code;
}

package io.sdkgen.runtime

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Point
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import com.google.gson.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.SocketTimeoutException
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.concurrent.timerTask
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

@Suppress("unused")
class SdkGenHttpClient(
    private val baseUrl: String,
    private val applicationContext: Context,
    private val defaultTimeoutMillis: Long = 10000L
) {

    data class InternalResposne(val error: JsonObject?, val result: JsonObject?)

    private val random = Random()
    private val hexArray = "0123456789abcdef".toCharArray()
    private val gson = Gson()
    private val connectionPool = ConnectionPool(100, 100, TimeUnit.SECONDS)
    private val httpClient = OkHttpClient.Builder()
        .connectionPool(connectionPool)
        .dispatcher(Dispatcher().apply { maxRequests = 200 ; maxRequestsPerHost = 200 })
        .connectTimeout(180, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .callTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(180, TimeUnit.SECONDS)
        .build()

    private fun callId(): String {
        val bytes = ByteArray(8)
        random.nextBytes(bytes)
        return bytesToHex(bytes)
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        for (j in bytes.indices) {
            val v = bytes[j].toInt() and 0xFF
            hexChars[j * 2] = hexArray[v ushr 4 ]
            hexChars[j * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }

    private fun language(): String {
        val loc = Locale.getDefault()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return loc.toLanguageTag()
        }

        val sep = '-'
        var language = loc.language
        var region = loc.country
        var variant = loc.variant

        if (language == "no" && region == "NO" && variant == "NY") {
            language = "nn"
            region = "NO"
            variant = ""
        }

        if (language.isEmpty() || !language.matches("\\\\[a-zA-Z]{2,8}".toRegex())) {
            language = "und"
        } else if (language == "iw") {
            language = "he"
        } else if (language == "in") {
            language = "id"
        } else if (language == "ji") {
            language = "yi"
        }

        if (!region.matches("\\\\[a-zA-Z]{2}|\\\\[0-9]{3}".toRegex())) {
            region = ""
        }

        if (!variant.matches("\\\\[a-zA-Z0-9]{5,8}|\\\\[0-9]\\\\[a-zA-Z0-9]{3}".toRegex())) {
            variant = ""
        }

        val bcp47Tag = StringBuilder(language)
        if (region.isNotEmpty()) {
            bcp47Tag.append(sep).append(region)
        }
        if (variant.isNotEmpty()) {
            bcp47Tag.append(sep).append(variant)
        }

        return bcp47Tag.toString()
    }

    @SuppressLint("HardwareIds")
    private fun makeDeviceObj(): JsonObject {
        return JsonObject().apply {
            addProperty("type", "android")
            addProperty("fingerprint", Settings.Secure.getString(applicationContext.contentResolver, Settings.Secure.ANDROID_ID))
            add("platform", JsonObject().apply {
                addProperty("version", Build.VERSION.RELEASE)
                addProperty("sdkVersion", Build.VERSION.SDK_INT)
                addProperty("brand", Build.BRAND)
                addProperty("model", Build.MODEL)
            })

            try {
                addProperty("version", applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0).versionName)
            } catch (e: Exception) {
                addProperty("version", "unknown")
            }

            addProperty("language", language())
            add("screen", JsonObject().apply {
                val manager = applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                val display = manager.defaultDisplay
                val size = Point()
                display.getSize(size)
                addProperty("width", size.x)
                addProperty("height", size.y)
            })

            val pref = applicationContext.getSharedPreferences("api", Context.MODE_PRIVATE)
            if (pref.contains("deviceId"))
                addProperty("id", pref.getString("deviceId", null))
        }
    }

    suspend fun makeRequest(functionName: String, bodyArgs: JsonObject?, timeoutMillis: Long = defaultTimeoutMillis): InternalResposne = suspendCoroutine { continuation ->
        val httpTimer = Timer()
        try {
            val body = JsonObject().apply {
                addProperty("id", callId())
                add("device", makeDeviceObj())
                addProperty("name", functionName)
                add("args", bodyArgs ?: JsonObject())
            }

            val request = Request.Builder()
                .url("https://$baseUrl/$functionName")
                .post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            val call = httpClient.newCall(request)
            try {
                httpTimer.schedule(timerTask { call.timeout() }, timeoutMillis)
                val response = call.execute()
                httpTimer.cancel()
                if (response.code == 502) {
                    continuation.resume(
                        InternalResposne(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", "Erro Fatal (502) - Tente novamente")
                            },
                            null
                        )
                    )
                    return@suspendCoroutine
                }

                val responseBody = try {
                    val stringBody = response.body?.string()
                    gson.fromJson(stringBody, JsonObject::class.java)
                } catch (e: Exception) {
                    e.printStackTrace()
                    continuation.resume(
                        InternalResposne(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", "Erro de serialização")
                            },
                            null
                        )
                    )
                    return@suspendCoroutine
                }

                val pref = applicationContext.getSharedPreferences("api", Context.MODE_PRIVATE)
                pref.edit().putString("deviceId", responseBody.get("deviceId").asString).apply()

                if (!responseBody.get("ok").asBoolean) {
                    val jsonError = responseBody.getAsJsonObject("error")
                    continuation.resume(InternalResposne(jsonError, null))
                } else {
                    continuation.resume(InternalResposne(null, responseBody))
                }
                response.close()
            } catch (e: Exception) {
                httpTimer.cancel()
                e.printStackTrace()
                continuation.resume(
                    InternalResposne(
                        JsonObject().apply {
                            if (e is SocketTimeoutException || e is InterruptedException) {
                                addProperty("type", "Connection")
                                addProperty("message", "Conexão excedeu o tempo de espera.")
                            } else {
                                addProperty("type", "Fatal")
                                addProperty("message", "Chamada falhou sem mensagem de erro!")
                            }
                        },
                        null
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            continuation.resume(
                InternalResposne(
                    JsonObject().apply {
                        addProperty("type", "Fatal")
                        addProperty("message", "Ocorreu um erro desconhecido na conexão.")
                    },
                    null
                )
            )
        }
    }
}
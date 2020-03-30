package io.sdkgen.runtime

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Point
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InterruptedIOException
import java.net.SocketTimeoutException
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

@Suppress("unused")
open class SdkgenHttpClient(
    private val baseUrl: String,
    private val applicationContext: Context,
    private val defaultTimeoutMillis: Long = 10000L
) {
    data class InternalResponse(val error: JsonObject?, val result: JsonObject?)

    private val random = Random()
    private val hexArray = "0123456789abcdef".toCharArray()
    private val gson = Gson()
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.MINUTES)
        .readTimeout(5, TimeUnit.MINUTES)
        .callTimeout(5, TimeUnit.MINUTES)
        .writeTimeout(5, TimeUnit.MINUTES)
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
            hexChars[j * 2] = hexArray[v ushr 4]
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
            val pref = applicationContext.getSharedPreferences("api", Context.MODE_PRIVATE)

            if (pref.contains("deviceId")) {
                addProperty("id", pref.getString("deviceId", null))
            }

            addProperty("language", language())
            add("platform", JsonObject().apply {
                addProperty("version", Build.VERSION.RELEASE)
                addProperty("sdkVersion", Build.VERSION.SDK_INT)
                addProperty("brand", Build.BRAND)
                addProperty("model", Build.MODEL)
            })

            addProperty("timezone", Calendar.getInstance().timeZone.displayName)
            addProperty("type", "android")

            try {
                addProperty("version", applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0).versionName)
            } catch (e: Exception) {
                addProperty("version", null)
            }

            add("screen", JsonObject().apply {
                val manager = applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                val display = manager.defaultDisplay
                val size = Point()
                display.getSize(size)
                addProperty("width", size.x)
                addProperty("height", size.y)
            })
        }
    }

    @SuppressLint("HardwareIds")
    suspend fun makeRequest(
        functionName: String,
        bodyArgs: JsonObject?,
        timeoutMillis: Long? = null
    ): InternalResponse = suspendCoroutine { continuation ->
        try {
            val body = JsonObject().apply {
                addProperty("version", 3)
                addProperty("requestId", callId())
                addProperty("name", functionName)
                add("args", bodyArgs ?: JsonObject())
                add("extra", JsonObject().apply { addProperty("fingerprint", Settings.Secure.getString(applicationContext.contentResolver, Settings.Secure.ANDROID_ID)) })
                add("deviceInfo", makeDeviceObj())
            }

            val request = Request.Builder()
                .url("$baseUrl${if (baseUrl.last() == '/') "" else "/"}$functionName")
                .post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            val call = httpClient.newCall(request)
            call.timeout().timeout(timeoutMillis ?: defaultTimeoutMillis, TimeUnit.MILLISECONDS)

            try {
                val response = call.execute()

                if (response.code in 501..599) {
                    continuation.resume(
                        InternalResponse(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_call_code, response.code.toString()))
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
                        InternalResponse(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_serialization))
                            },
                            null
                        )
                    )

                    return@suspendCoroutine
                }

                if (response.code != 200) {
                    val jsonError = responseBody.getAsJsonObject("error")
                    continuation.resume(InternalResponse(jsonError, null))
                } else {
                    continuation.resume(InternalResponse(null, responseBody))
                }

                response.close()
            } catch (e: Exception) {
                e.printStackTrace()

                continuation.resume(
                    InternalResponse(
                        JsonObject().apply {
                            if (e is SocketTimeoutException || e is InterruptedIOException) {
                                addProperty("type", "Connection")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_call_timeout))
                            } else {
                                addProperty("type", "Fatal")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_call_failed_without_message))
                            }
                        },
                        null
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()

            continuation.resume(
                InternalResponse(
                    JsonObject().apply {
                        addProperty("type", "Fatal")
                        addProperty("message", applicationContext.getString(R.string.sdkgen_error_unknown))
                    },
                    null
                )
            )
        }
    }
}

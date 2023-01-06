package io.sdkgen.runtime

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Point
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import com.google.gson.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InterruptedIOException
import java.lang.reflect.Type
import java.net.SocketTimeoutException
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import android.util.Base64
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter
import okhttp3.Interceptor
import okhttp3.Response
import java.text.SimpleDateFormat

@Suppress("unused")
open class SdkgenHttpClient(
    private val baseUrl: String,
    private val applicationContext: Context,
    private val defaultTimeoutMillis: Long = 10000L,
    private val fingerprint: String? = null,
    private val httpInterceptor: Interceptor? = null
) {

    val extras = mutableMapOf<String, Any>()

    class ByteArrayDeserializer : JsonDeserializer<ByteArray> {
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

    class DateTimeAdapter: TypeAdapter<Calendar>() {
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

    class DateAdapter: TypeAdapter<Calendar>() {
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

    data class CallStats(val durationMillis: Long)
    data class InternalResponse(val error: JsonObject?, val result: JsonObject?, val stats: CallStats?)

    private val random = Random()
    private val hexArray = "0123456789abcdef".toCharArray()
    private val gson = Gson()
    private var httpClient = httpInterceptor.let {
        val builder = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.MINUTES)
            .readTimeout(5, TimeUnit.MINUTES)
            .callTimeout(5, TimeUnit.MINUTES)
            .writeTimeout(5, TimeUnit.MINUTES)

        if (it != null) {
            builder.addInterceptor(it).build()
        } else {
            builder.build()
        }
    }

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

    fun getDeviceId(): String {
        val prefs = applicationContext.getSharedPreferences("api", Context.MODE_PRIVATE)
        return if (prefs.contains("deviceId")) {
            prefs.getString("deviceId", "") ?: ""
        } else {
            val bytes = ByteArray(16)
            random.nextBytes(bytes)
            val deviceId = bytesToHex(bytes)
            prefs.edit().putString("deviceId", deviceId).apply()
            deviceId
        }
    }

    @SuppressLint("HardwareIds")
    private fun makeDeviceObj(): JsonObject {
        return JsonObject().apply {
            addProperty("id", getDeviceId())
            addProperty("fingerprint", fingerprint ?: Settings.Secure.getString(applicationContext.contentResolver, Settings.Secure.ANDROID_ID))
            addProperty("language", language())
            add("platform", JsonObject().apply {
                addProperty("version", Build.VERSION.RELEASE)
                addProperty("sdkVersion", Build.VERSION.SDK_INT)
                addProperty("brand", Build.BRAND)
                addProperty("model", Build.MODEL)
                add("screen", JsonObject().apply {
                    val manager = applicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                    val display = manager.defaultDisplay
                    val size = Point()
                    display.getSize(size)
                    addProperty("width", size.x)
                    addProperty("height", size.y)
                })
            })

            addProperty("timezone", Calendar.getInstance().timeZone.displayName)
            addProperty("type", "android")

            try {
                addProperty("version", applicationContext.packageManager.getPackageInfo(applicationContext.packageName, 0).versionName)
            } catch (e: Exception) { }
        }
    }

    @SuppressLint("HardwareIds")
    suspend fun makeRequest(
        functionName: String,
        bodyArgs: JsonObject?,
        timeoutMillis: Long? = null
    ): InternalResponse = suspendCoroutine { continuation ->
        SdkgenIdlingResource.increment()
        try {
            val body = JsonObject().apply {
                addProperty("version", 3)
                addProperty("requestId", callId())
                addProperty("name", functionName)
                add("args", bodyArgs ?: JsonObject())
                add("deviceInfo", makeDeviceObj())
                add("extras",  gson.toJsonTree(extras).getAsJsonObject())
            }

            val request = Request.Builder()
                .url("$baseUrl${if (baseUrl.last() == '/') "" else "/"}$functionName")
                .post(body.toString().toRequestBody("application/sdkgen".toMediaType()))
                .build()

            val call = httpClient.newCall(request)
            call.timeout().timeout(timeoutMillis ?: defaultTimeoutMillis, TimeUnit.MILLISECONDS)

            var response: Response? = null
            try {
                val initTime = System.currentTimeMillis()
                response = call.execute()
                val duration = System.currentTimeMillis() - initTime
                if (response.code in 501..599) {
                    SdkgenIdlingResource.decrement()
                    continuation.resume(
                        InternalResponse(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_call_code, response.code.toString()))
                            },
                            null,
                            CallStats(duration)
                        )
                    )

                    return@suspendCoroutine
                }

                val responseBody = try {
                    val stringBody = response.body?.string()
                    gson.fromJson(stringBody, JsonObject::class.java)
                } catch (e: Exception) {
                    e.printStackTrace()
                    SdkgenIdlingResource.decrement()
                    continuation.resume(
                        InternalResponse(
                            JsonObject().apply {
                                addProperty("type", "Fatal")
                                addProperty("message", applicationContext.getString(R.string.sdkgen_error_serialization))
                            },
                            null,
                            CallStats(duration)
                        )
                    )

                    return@suspendCoroutine
                }

                if (response.code != 200) {
                    val jsonError = responseBody.getAsJsonObject("error")
                    SdkgenIdlingResource.decrement()
                    continuation.resume(InternalResponse(jsonError, null, CallStats(duration)))
                } else {
                    SdkgenIdlingResource.decrement()
                    continuation.resume(InternalResponse(null, responseBody, CallStats(duration)))
                }
            } catch (e: Exception) {
                e.printStackTrace()
                SdkgenIdlingResource.decrement()
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
                        null,
                        null
                    )
                )
            } finally {
                response?.close()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            SdkgenIdlingResource.decrement()
            continuation.resume(
                InternalResponse(
                    JsonObject().apply {
                        addProperty("type", "Fatal")
                        addProperty("message", applicationContext.getString(R.string.sdkgen_error_unknown))
                    },
                    null,
                     null
                )
            )
        }
    }

    fun setHttpClient(client: OkHttpClient) {
        httpClient = client
    }
}

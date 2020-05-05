package io.sdkgen.runtime

import androidx.test.espresso.IdlingResource
import java.util.concurrent.atomic.AtomicInteger

private class SimpleCountingIdlingResource(private val resourceName: String) : IdlingResource {

    private val counter = AtomicInteger(0)

    private var resourceCallback: IdlingResource.ResourceCallback? = null

    override fun getName(): String = resourceName

    override fun isIdleNow(): Boolean = counter.get() == 0

    override fun registerIdleTransitionCallback(callback: IdlingResource.ResourceCallback?) {
        resourceCallback = callback
    }

    fun increment() = counter.getAndIncrement()

    @Throws(IllegalArgumentException::class)
    fun decrement() {
        val counterVal = counter.decrementAndGet()
        if (counterVal == 0) {
            resourceCallback?.onTransitionToIdle()
        }

        if (counterVal < 0) {
            throw IllegalArgumentException("Idling resource counter < 0")
        }
    }
}

object SdkgenIdlingResource {
    private const val resource = "io.sdkgen.runtime-idling-resource"
    private val countingIdlingResource = SimpleCountingIdlingResource(resource)

    fun increment() = countingIdlingResource.increment()

    fun decrement() = countingIdlingResource.decrement()

    fun getIdlingResource(): IdlingResource = countingIdlingResource
}
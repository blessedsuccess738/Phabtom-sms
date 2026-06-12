package com.phantombusiness.sms

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * PhantomSMS — Kotlin SDK for the Phantom Business self-hosted SMS Gateway.
 *
 * Usage:
 *   val sms = PhantomSMS("https://your-gateway-domain.com")
 *
 *   // Request OTP
 *   val result = sms.sendOtp("+12025551234")
 *   if (result.success) {
 *       // Save result.requestId for verification
 *   }
 *
 *   // Verify OTP
 *   val verified = sms.verifyOtp("+12025551234", "123456", requestId = result.requestId)
 *   if (verified.verified) {
 *       // User is authenticated
 *   }
 */
class PhantomSMS(
    private val baseUrl: String,
    private val appId: String? = null,
    private val timeoutMs: Int = 15_000
) {
    data class SendResult(
        val success: Boolean,
        val requestId: String?,
        val expiresAt: String?,
        val channel: String?,
        val error: String? = null
    )

    data class VerifyResult(
        val verified: Boolean,
        val attemptsRemaining: Int,
        val reason: String? = null,
        val error: String? = null
    )

    data class GatewayStatus(
        val online: Boolean,
        val channel: String,
        val modemConnected: Boolean,
        val smtpReady: Boolean,
        val lastChecked: String,
        val signal: Int?
    )

    /**
     * Send an OTP to the given phone number.
     * @param phone Phone number in E.164 format, e.g. "+12025551234"
     * @return SendResult with requestId on success
     */
    suspend fun sendOtp(phone: String): SendResult = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("phone", phone)
            appId?.let { put("appId", it) }
        }
        try {
            val response = post("/api/otp/send", body)
            SendResult(
                success = response.optBoolean("success", false),
                requestId = response.optString("requestId").takeIf { it.isNotEmpty() },
                expiresAt = response.optString("expiresAt").takeIf { it.isNotEmpty() },
                channel = response.optString("channel").takeIf { it.isNotEmpty() }
            )
        } catch (e: Exception) {
            SendResult(success = false, requestId = null, expiresAt = null, channel = null, error = e.message)
        }
    }

    /**
     * Verify an OTP code for a phone number.
     * @param phone  Same phone number used in sendOtp
     * @param code   The 6-digit code the user entered
     * @param requestId Optional requestId from sendOtp for stricter matching
     * @return VerifyResult with verified=true on success
     */
    suspend fun verifyOtp(phone: String, code: String, requestId: String? = null): VerifyResult = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("phone", phone)
            put("code", code)
            requestId?.let { put("requestId", it) }
        }
        try {
            val response = post("/api/otp/verify", body)
            VerifyResult(
                verified = response.optBoolean("verified", false),
                attemptsRemaining = response.optInt("attemptsRemaining", 0),
                reason = response.optString("reason").takeIf { it.isNotEmpty() }
            )
        } catch (e: Exception) {
            VerifyResult(verified = false, attemptsRemaining = 0, error = e.message)
        }
    }

    /**
     * Check if the gateway is online and what channel it's using.
     */
    suspend fun getStatus(): GatewayStatus = withContext(Dispatchers.IO) {
        val response = get("/api/gateway/status")
        GatewayStatus(
            online = response.optBoolean("online", false),
            channel = response.optString("channel", "unknown"),
            modemConnected = response.optBoolean("modemConnected", false),
            smtpReady = response.optBoolean("smtpReady", false),
            lastChecked = response.optString("lastChecked", ""),
            signal = if (response.isNull("signal")) null else response.optInt("signal")
        )
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private fun post(path: String, body: JSONObject): JSONObject {
        val url = URL("${baseUrl.trimEnd('/')}$path")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            doOutput = true
            connectTimeout = timeoutMs
            readTimeout = timeoutMs
        }
        OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
        return readResponse(conn)
    }

    private fun get(path: String): JSONObject {
        val url = URL("${baseUrl.trimEnd('/')}$path")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "GET"
            setRequestProperty("Accept", "application/json")
            connectTimeout = timeoutMs
            readTimeout = timeoutMs
        }
        return readResponse(conn)
    }

    private fun readResponse(conn: HttpURLConnection): JSONObject {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val text = BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
        return JSONObject(text)
    }
}

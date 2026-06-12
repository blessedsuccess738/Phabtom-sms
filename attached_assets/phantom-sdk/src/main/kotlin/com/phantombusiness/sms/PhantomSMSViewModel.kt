package com.phantombusiness.sms

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Optional ViewModel wrapper for use with Jetpack Compose / Android ViewModel.
 *
 * Usage in your Composable:
 *   val vm: PhantomSMSViewModel = viewModel()
 *   vm.init("https://your-gateway-domain.com")
 *   vm.sendOtp("+12025551234")
 */
class PhantomSMSViewModel : ViewModel() {

    sealed class OtpState {
        object Idle : OtpState()
        object Loading : OtpState()
        data class OtpSent(val requestId: String?, val phone: String) : OtpState()
        data class Verified(val phone: String) : OtpState()
        data class Error(val message: String) : OtpState()
    }

    private val _state = MutableStateFlow<OtpState>(OtpState.Idle)
    val state: StateFlow<OtpState> = _state

    private var sms: PhantomSMS? = null
    private var currentPhone: String = ""
    private var currentRequestId: String? = null

    fun init(gatewayUrl: String, appId: String? = null) {
        sms = PhantomSMS(gatewayUrl, appId)
    }

    fun sendOtp(phone: String) {
        val client = sms ?: return
        currentPhone = phone
        viewModelScope.launch {
            _state.value = OtpState.Loading
            val result = client.sendOtp(phone)
            _state.value = if (result.success) {
                currentRequestId = result.requestId
                OtpState.OtpSent(requestId = result.requestId, phone = phone)
            } else {
                OtpState.Error(result.error ?: "Failed to send OTP")
            }
        }
    }

    fun verifyOtp(code: String) {
        val client = sms ?: return
        viewModelScope.launch {
            _state.value = OtpState.Loading
            val result = client.verifyOtp(currentPhone, code, currentRequestId)
            _state.value = if (result.verified) {
                OtpState.Verified(phone = currentPhone)
            } else {
                OtpState.Error(result.reason ?: result.error ?: "Incorrect code")
            }
        }
    }

    fun reset() {
        _state.value = OtpState.Idle
        currentPhone = ""
        currentRequestId = null
    }
}

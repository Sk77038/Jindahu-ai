package com.zindahu.ai.ui.dashboard

import androidx.lifecycle.*
import com.zindahu.ai.data.repository.SafetyRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * SafetyViewModel
 * Manages the "Alive" countdown and coordinates with WorkManager and Firestore.
 */
class SafetyViewModel @Inject constructor(
    private val repository: SafetyRepository
) : ViewModel() {

    private val _safetyStatus = MutableLiveData<SafetyStatus>(SafetyStatus.SAFE)
    val safetyStatus: LiveData<SafetyStatus> = _safetyStatus

    private val _timeRemaining = MutableLiveData<String>()
    val timeRemaining: LiveData<String> = _timeRemaining

    private val _lastCheckInTime = MutableLiveData<String>()
    val lastCheckInTime: LiveData<String> = _lastCheckInTime

    private val timeFormatter = SimpleDateFormat("hh:mm a", Locale.getDefault())

    fun confirmAlive() {
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            // 1. Update Firestore timestamp
            repository.updateLastCheckIn(now)
            // 2. Reset local WorkManager timer
            repository.scheduleNextSafetyCheck()
            // 3. Reset UI status
            _safetyStatus.value = SafetyStatus.SAFE
            // 4. Update formatted display time
            _lastCheckInTime.value = "Last confirmed: ${timeFormatter.format(Date(now))}"
        }
    }

    fun triggerPanicMode() {
        viewModelScope.launch {
            // Immediately log event and notify Cloud Functions to alert contacts
            repository.logEmergencyEvent("MANUAL_PANIC")
            _safetyStatus.value = SafetyStatus.EMERGENCY
        }
    }
}
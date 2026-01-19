
package com.zindahu.ai.ui.dashboard

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Build
import android.os.Vibrator
import android.view.WindowManager
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.zindahu.ai.databinding.ActivityMainBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: SafetyViewModel by viewModels()
    private val CALL_PERMISSION_CODE = 123

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        handleSafetyIntent(intent)
        setupObservers()
        setupListeners()
    }

    private fun handleSafetyIntent(intent: Intent?) {
        if (intent?.getStringExtra("TRIGGER_SOURCE") == "MORNING_UNLOCK") {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
            triggerHapticPulse(500)
        }
    }

    private fun triggerHapticPulse(duration: Long) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getSystemService(Vibrator::class.java)
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                it.vibrate(duration)
            }
        }
    }

    private fun setupListeners() {
        binding.btnImAlive.setOnClickListener {
            viewModel.confirmAlive()
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        binding.btnPanic.setOnClickListener {
            initiateEmergencySequence()
        }
    }

    /**
     * Real Emergency Sequence:
     * 1. Checks permissions
     * 2. Triggers the Call
     * 3. Notifies ViewModel (which updates Firebase for SMS)
     */
    private fun initiateEmergencySequence() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CALL_PHONE), CALL_PERMISSION_CODE)
        } else {
            makeRealCall()
        }
        viewModel.triggerPanicMode()
    }

    private fun makeRealCall() {
        val guardianNumber = viewModel.primaryGuardianPhone.value ?: "100" // Default to emergency services
        val intent = Intent(Intent.ACTION_CALL)
        intent.data = Uri.parse("tel:$guardianNumber")
        startActivity(intent)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CALL_PERMISSION_CODE && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            makeRealCall()
        }
    }

    private fun setupObservers() {
        viewModel.safetyStatus.observe(this) { status ->
            binding.statusText.text = status.name
            if (status == SafetyStatus.EMERGENCY) {
                // Apply visual alert theme
                binding.statusContainer.setBackgroundColor(getColor(android.R.color.holo_red_dark))
            }
        }
    }
}

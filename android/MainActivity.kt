package com.zindahu.ai.ui.dashboard

import android.content.Context
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Build
import android.os.Vibrator
import android.view.WindowManager
import android.content.Intent
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.zindahu.ai.databinding.ActivityMainBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: SafetyViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Handle the intent that started this activity
        handleSafetyIntent(intent)

        setupObservers()
        setupListeners()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Update the activity's intent and handle any safety triggers if activity is already running
        setIntent(intent)
        handleSafetyIntent(intent)
    }

    /**
     * Checks if the activity was triggered by the morning unlock broadcast.
     * If so, applies lockscreen bypass flags and triggers a strong vibration.
     */
    private fun handleSafetyIntent(intent: Intent?) {
        if (intent?.getStringExtra("TRIGGER_SOURCE") == "MORNING_UNLOCK") {
            // Apply window flags to ensure the safety check appears over the lockscreen
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
            
            // Trigger a strong 500ms vibration as requested to alert the user immediately
            // We use getSystemService with explicitly defined Vibrator class for modern Android standards
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                getSystemService(Vibrator::class.java)
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            vibrator?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    // Amplitude of 255 ensures the vibration is at maximum strength
                    it.vibrate(VibrationEffect.createOneShot(500, 255))
                } else {
                    @Suppress("DEPRECATION")
                    it.vibrate(500)
                }
            }
        }
    }

    private fun setupObservers() {
        viewModel.safetyStatus.observe(this) { status ->
            binding.statusText.text = status.name
            // In a production environment, this would also update the background color 
            // and theme dynamically to indicate safety level (Green/Red).
        }
        
        viewModel.lastCheckInTime.observe(this) { time ->
            binding.lastCheckInText.text = time
        }
    }

    private fun setupListeners() {
        binding.btnImAlive.setOnClickListener {
            viewModel.confirmAlive()
            // Reset window flags to allow standard lockscreen and power behavior after check-in
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            window.clearFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        }

        binding.btnPanic.setOnClickListener {
            viewModel.triggerPanicMode()
        }
    }
}
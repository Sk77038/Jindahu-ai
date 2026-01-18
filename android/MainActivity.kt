
package com.zindahu.ai.ui.dashboard

import android.content.Context
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Build
import android.os.Vibrator
import android.view.WindowManager
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
        
        // Handle Morning Unlock Trigger to bypass lockscreen for mandatory safety check-in
        if (intent.getStringExtra("TRIGGER_SOURCE") == "MORNING_UNLOCK") {
            // Apply requested window flags to ensure visibility over the lockscreen
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
            
            // Trigger a strong 500ms vibration alert to ensure the user notices the check-in requirement
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(500)
            }
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupObservers() {
        viewModel.safetyStatus.observe(this) { status ->
            binding.statusText.text = status.name
            // Note: In a production app, update UI colors based on status (e.g., Red for Emergency)
        }
        
        viewModel.lastCheckInTime.observe(this) { time ->
            binding.lastCheckInText.text = time
        }
    }

    private fun setupListeners() {
        binding.btnImAlive.setOnClickListener {
            viewModel.confirmAlive()
            // Clear flags to resume normal power management after confirmation
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            window.clearFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        }

        binding.btnPanic.setOnClickListener {
            viewModel.triggerPanicMode()
        }
    }
}

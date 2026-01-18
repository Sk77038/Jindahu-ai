
package com.zindahu.ai.ui.dashboard

import android.os.Bundle
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
        
        // Ensure the app can show over lockscreen if triggered by Receiver
        if (intent.getStringExtra("TRIGGER_SOURCE") == "MORNING_UNLOCK") {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
            // Trigger a strong vibration to alert the user
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            vibrator.vibrate(500)
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupObservers() {
        viewModel.safetyStatus.observe(this) { status ->
            binding.statusCard.setBackgroundResource(status.backgroundColor)
            binding.statusText.text = getString(status.labelRes)
        }
    }

    private fun setupListeners() {
        binding.btnImAlive.setOnClickListener {
            viewModel.confirmAlive()
            // Clear flags once confirmed
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        binding.btnPanic.setOnClickListener {
            viewModel.triggerPanicMode()
        }
    }
}

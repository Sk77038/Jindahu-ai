package com.zindahu.ai.ui.dashboard

import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.zindahu.ai.databinding.ActivityMainBinding
import dagger.hilt.android.AndroidEntryPoint

/**
 * ZindaHu AI - MainActivity
 * Production-ready Dashboard implementing MVVM and Data Binding.
 */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: SafetyViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupObservers() {
        viewModel.safetyStatus.observe(this) { status ->
            // Update UI based on Green/Yellow/Red status
            binding.statusCard.setBackgroundResource(status.backgroundColor)
            binding.statusText.text = getString(status.labelRes)
        }

        viewModel.timeRemaining.observe(this) { time ->
            binding.timerText.text = time
        }

        viewModel.lastCheckInTime.observe(this) { timeString ->
            binding.lastCheckInText.text = timeString
        }
    }

    private fun setupListeners() {
        binding.btnImAlive.setOnClickListener {
            // Trigger haptic feedback for elder-friendly interaction
            it.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)
            viewModel.confirmAlive()
        }

        binding.btnPanic.setOnClickListener {
            // Immediate emergency trigger
            viewModel.triggerPanicMode()
        }
    }
}
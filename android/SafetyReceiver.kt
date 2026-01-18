
package com.zindahu.ai.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.zindahu.ai.ui.dashboard.MainActivity
import java.util.*

/**
 * SafetyReceiver
 * Listens for system events like phone unlock (USER_PRESENT)
 */
class SafetyReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_USER_PRESENT) {
            val prefs = context.getSharedPreferences("zindahu_prefs", Context.MODE_PRIVATE)
            val lastCheckIn = prefs.getLong("last_check_in", 0)
            
            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            
            // Logic: If it's morning (6 AM - 10 AM) AND user hasn't checked in today
            if (currentHour in 6..10 && !isSameDay(lastCheckIn, System.currentTimeMillis())) {
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    putExtra("TRIGGER_SOURCE", "MORNING_UNLOCK")
                }
                context.startActivity(launchIntent)
            }
        }
    }

    private fun isSameDay(timeA: Long, timeB: Long): Boolean {
        val calA = Calendar.getInstance().apply { timeInMillis = timeA }
        val calB = Calendar.getInstance().apply { timeInMillis = timeB }
        return calA.get(Calendar.YEAR) == calB.get(Calendar.YEAR) &&
               calA.get(Calendar.DAY_OF_YEAR) == calB.get(Calendar.DAY_OF_YEAR)
    }
}

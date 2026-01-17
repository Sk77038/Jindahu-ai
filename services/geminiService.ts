
import { GoogleGenAI, Type } from "@google/genai";
import { SafetyStatus, UserProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getSafetyInsight(user: UserProfile) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in at ${new Date(user.lastCheckIn).toLocaleTimeString()}. Their target daily check-in is ${user.checkInHour}:00. Generate a very short, encouraging 1-sentence safety tip or a reassuring message in ${user.language === 'hi' ? 'Hindi' : 'English'}.`,
    });
    return response.text || "You are protected.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Your safety is our priority.";
  }
}

export async function generateEmergencyMessage(user: UserProfile, location?: string) {
  try {
    const prompt = `URGENT: User ${user.name} missed their safety check-in. Emergency contacts: ${user.contacts.map(c => c.name).join(', ')}. Location: ${location || 'Unknown'}. Create a concise, clear emergency SMS alert text to be sent to family members in ${user.language === 'hi' ? 'Hindi' : 'English'}. Include the urgency but stay calm.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return `EMERGENCY ALERT: ${user.name} missed their check-in. Please check on them immediately. Last known: ${location || 'Unknown'}.`;
  }
}

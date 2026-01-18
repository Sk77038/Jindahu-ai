import { GoogleGenAI } from "@google/genai";
import { UserProfile } from '../types';

// Use a getter to initialize the client only when needed.
// This prevents top-level execution errors if the API key is missing.
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not defined in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAIClient();
    if (!ai) return "You are protected.";

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
    const ai = getAIClient();
    if (!ai) return `EMERGENCY ALERT: ${user.name} missed their check-in.`;

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

import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export async function getSoulAnalysis(name: string, language: string, hobbies: string[]) {
  try {
    const ai = getAIClient();
    if (!ai) return { soulAge: "Immortal", reading: "Aura is cryptic.", predictedDays: 30000 };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} is registering for ZindaHu AI. Their hobbies include: ${hobbies.join(', ')}.
      1. Invent a funny "Soul Age" (e.g., 'Born during Big Bang', 'Younger than WiFi').
      2. Predict a random "Life Duration in Days" for fun (between 25000 and 40000).
      3. A short personality reading that references their hobbies.
      Language: ${language === 'hi' ? 'Hindi' : 'English'}.
      Return JSON: { "soulAge": string, "predictedDays": number, "reading": string }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            soulAge: { type: Type.STRING },
            predictedDays: { type: Type.NUMBER },
            reading: { type: Type.STRING }
          },
          required: ["soulAge", "predictedDays", "reading"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { soulAge: "Eternal", predictedDays: 36500, reading: "You are a cosmic phenomenon." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAIClient();
    if (!ai) return "Stay vigilant.";
    
    const hobbyStr = user.hobbies && user.hobbies.length > 0 
      ? `Their hobbies are ${user.hobbies.join(', ')}.` 
      : "They enjoy exploring life.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} just performed their daily fingerprint safety check. 
      Their soul age is ${user.initialSoulAge}. ${hobbyStr}
      Give a short, quirky, and highly motivating 1-sentence tip for today. 
      The tip must relate to their hobbies to keep them inspired.
      Language: ${user.language === 'hi' ? 'Hindi' : 'English'}.`,
    });
    return response.text || "Stay safe and inspired.";
  } catch (error) {
    return "Your safety is our priority.";
  }
}

/**
 * Generates an emergency reassurance message.
 * Prompt refined to indicate help is being mobilized.
 */
export async function getEmergencyReassurance(language: string) {
  try {
    const ai = getAIClient();
    if (!ai) return "Help is on the way. Please stay calm.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user has triggered a PANIC state. 
      Provide exactly one short, extremely calming, and reassuring sentence. 
      It MUST indicate that help is being mobilized and emphasize that they should stay calm.
      Language: ${language === 'hi' ? 'Hindi' : 'English'}.`,
    });
    return response.text?.trim() || "Breathe. Help is starting to mobilize.";
  } catch (error) {
    return language === 'hi' ? "मदद आ रही है। कृपया शांत रहें।" : "Help is on the way. Please stay calm.";
  }
}

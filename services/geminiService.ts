
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export async function getSoulAnalysis(name: string, language: string) {
  try {
    const ai = getAIClient();
    if (!ai) return { soulAge: "Immortal", reading: "Aura is cryptic.", predictedDays: 30000 };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} is registering for ZindaHu AI.
      1. Invent a funny "Soul Age" (e.g., 'Born during Big Bang', 'Younger than WiFi').
      2. Predict a random "Life Duration in Days" for fun (between 25000 and 40000).
      3. A short personality reading.
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in. Their soul age is ${user.initialSoulAge}. Give a short, quirky 1-sentence motivational safety tip.`,
    });
    return response.text || "Stay safe.";
  } catch (error) {
    return "Your safety is our priority.";
  }
}

export async function getEmergencyReassurance(language: string) {
  try {
    const ai = getAIClient();
    if (!ai) return "Help is on the way.";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is in an emergency state. Provide one extremely short, calming, and reassuring sentence. Language: ${language}.`,
    });
    return response.text || "Breathe. Help is starting to mobilize.";
  } catch (error) {
    return "Help is on the way. Stay calm.";
  }
}

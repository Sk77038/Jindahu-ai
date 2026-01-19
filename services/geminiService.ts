
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Directly uses process.env.API_KEY as per the @google/genai requirement.
 */

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Registration Data: ${name}, ${age}, Medical: ${medical}. 
      Task: Create a unique 'Soul Age' title and reading. 
      Language: ${langName}. Format: JSON.`,
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
    console.error("Gemini SoulAnalysis Error:", error);
    return { soulAge: "Strong Soul", predictedDays: 35000, reading: "Your spirit is resilient and ready for the journey." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} safe check-in. Provide a 1-line motivational shayari in ${langName}.`,
    });
    return response.text?.trim() || "Stay safe, stay bold.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Aapki suraksha hi hamari priority hai.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say in ${langName} with warm heart: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

export async function getDostAiResponse(prompt: string, user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are 'Dost AI', protecting ${user.name} (Blood: ${user.bloodGroup}). 
      Task: Answer the user's safety query. Tone: Informal/Brotherly. 
      Language: ${langName}.
      Message: ${prompt}`,
      config: { tools: [{ googleSearch: {} }] }
    });
    let output = response.text || "Sun raha hoon bhai.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Verification Sources:";
      chunks.forEach((c: any) => { if (c.web) output += `\n- ${c.web.title}: ${c.web.uri}`; });
    }
    return output;
  } catch (error) {
    console.error("Gemini DostAI Error:", error);
    return "Bhai, net thoda slow hai, par main hamesha saath hoon.";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find best hospitals near me. Language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
      },
    });
    let output = response.text || "Nearby hospitals:";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((c: any) => { if (c.maps) output += `\n- ${c.maps.title}: ${c.maps.uri}`; });
    }
    return output;
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return "Hospital details not found. Call 112 immediately.";
  }
}

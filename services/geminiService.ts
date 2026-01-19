
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * GEMINI AI ENGINE - Production Configuration
 * Strictly adheres to Google GenAI SDK patterns.
 */

// We don't export a persistent instance to ensure process.env.API_KEY 
// is re-read from the environment on every request, fixing race conditions.

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: New User Registration. 
      Details: Name ${name}, Age ${age}, Health: ${medical}. 
      Task: Generate a creative 'Soul Age' title and a deep personality reading.
      Language: ${langName}. Tone: Desi Brother/Friend.
      Response format: JSON ONLY.`,
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
    console.error("Gemini Service Error (SoulAnalysis):", error);
    return { soulAge: "Immortal Energy", predictedDays: 38000, reading: "Your spirit is older than code." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in safely. Provide a 1-line motivational safety shayari/greeting. 
      Language: ${langName}. Informal brotherly tone.`,
    });
    
    return response.text?.trim() || "Stay alert, stay safe.";
  } catch (error) {
    console.error("Gemini Service Error (Insight):", error);
    return "Surakshit rahein, dost.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say with warmth in ${langName}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }
          }
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Gemini Service Error (TTS):", error);
    return null;
  }
}

export async function getDostAiResponse(prompt: string, user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Role: Dost AI Safety Shield.
      User Profile: ${user.name}, Blood ${user.bloodGroup}, Medical ${user.medicalConditions}.
      Task: Support user safety. Use Google Search for facts.
      Language: ${langName}. Tone: Desi/Informal.
      User: ${prompt}`,
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "Main sun raha hoon, bhai.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🔗 Sources:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Gemini Service Error (DostAI):", error);
    return "Server thoda slow hai, par main aapke saath hoon.";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find top 3 hospitals for emergencies. Language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    let output = response.text || "Hospitals found near you:";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Gemini Service Error (Maps):", error);
    return "Please call 112 for immediate assistance.";
  }
}

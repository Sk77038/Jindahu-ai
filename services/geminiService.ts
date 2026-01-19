
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Uses direct process.env.API_KEY access as required by SDK guidelines.
 */

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing from process.env. Please verify environment configuration.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = getAIClient();
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: New User Registration. 
      Details: Name ${name}, Age ${age}, Medical History: ${medical}. 
      Task: Generate a creative 'Soul Age' title and a brief reading of their inner resilience.
      Language: ${langName}. If Hindi, use informal 'Desi' style.
      Response: JSON ONLY.`,
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
    console.error("SoulAnalysis API Error:", error);
    return { soulAge: "Ancient Soul", predictedDays: 36000, reading: "Your energy is strong and timeless." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAIClient();
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in safely. Provide a short 1-line motivational safety greeting. 
      Language: ${langName}.`,
    });
    
    return response.text?.trim() || "Stay alert, stay safe.";
  } catch (error) {
    console.error("Insight API Error:", error);
    return "Surakshit rahein, dost.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = getAIClient();
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say warmly in ${langName}: ${text}` }] }],
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
    console.error("TTS API Error:", error);
    return null;
  }
}

export async function getDostAiResponse(prompt: string, user: UserProfile) {
  try {
    const ai = getAIClient();
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Role: Dost AI Safety Shield.
      User: ${user.name}, Blood ${user.bloodGroup}, Meds: ${user.medicalConditions}.
      Tone: Informal/Protective. 
      Use Google Search for real-time safety info if needed.
      User Message: ${prompt}`,
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "Sun raha hoon, dost.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Verification Links:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("DostAI API Error:", error);
    return "Bhai thoda technical issue hai, par main aapke saath hoon.";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = getAIClient();
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find nearest best hospitals for emergency assistance. Language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    let output = response.text || "Nearest medical centers:";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Maps API Error:", error);
    return "Please call 112 for immediate hospital search.";
  }
}

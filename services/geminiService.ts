
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Directly initializes GoogleGenAI using process.env.API_KEY inside each call
 * to ensure we grab the latest environment variables from Vercel/Native.
 */

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} (Age ${age}) medical condition: ${medical}. 
      Task: Generate 1. Unique Soul Age title 2. Predicted remaining life days (22k-40k) 3. Personality reading.
      Language: ${langName}. If Hindi, use informal 'Desi' brotherly style.
      Output: JSON ONLY.`,
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
    return { soulAge: "Ancient Soul", predictedDays: 35000, reading: "Your energy transcends technical errors." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in safely. Provide a 2-line safety motivational shayari/greeting. 
      Language: ${langName}. Use informal brotherly tone for Hindi.`,
    });
    
    return response.text?.trim() || "Stay safe and stay strong.";
  } catch (error) {
    console.error("Insight API Error:", error);
    return "Aapki suraksha hi hamari kamyabi hai.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this warmly in ${langName}: ${text}` }] }],
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

export async function getDostAiResponse(prompt: string, base64Image: string | null, user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const parts: any[] = [{ text: `You are 'Dost AI', ${user.name}'s safety shield. 
    Context: Blood ${user.bloodGroup}, Medical: ${user.medicalConditions}.
    If user is in danger, prioritize emergency steps. Use Google Search for facts.
    Language: ${langName}. Tone: Desi Brother/Friend.
    User Message: ${prompt}` }];

    if (base64Image) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "No response received.";
    
    // Extract Search Grounding Links
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Grounded Sources:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error: any) {
    console.error("DostAI API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) return "Error: API Key is invalid. Check Vercel Environment Variables.";
    return "Bhai, connection slow hai. Par main yahi hoon.";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find 3 nearest top-rated hospitals for emergency. Language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    let output = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🏥 Map Links:";
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Maps API Error:", error);
    return "Error finding hospitals. Please dial 112 manually.";
  }
}

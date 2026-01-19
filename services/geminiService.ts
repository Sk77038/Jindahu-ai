
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION READY GEMINI SERVICE
 * This service ensures robust AI feature delivery by instantiating the client
 * locally within functions to avoid stale environment variable references.
 */

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/** 1. Registration Analysis - Uses Flash for speed */
export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = getAI();
    if (!ai) return { soulAge: "Ancient Soul", reading: "Connecting to cosmos...", predictedDays: 32000 };
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} is joining ZindaHu AI. 
      Age: ${age}, Medical: ${medical}. 
      Language: ${langName} (If Hindi, use very 'Desi' brotherly style).
      Provide: 1. Soul Age (funny title) 2. Predicted life days remaining (22k-40k) 3. Soul personality reading based on health resilience.
      Output: Valid JSON ONLY.`,
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
    console.error("SoulAnalysis API Fail:", error);
    return { soulAge: "Immortal", predictedDays: 36500, reading: "Your resilience is your strength." };
  }
}

/** 2. Safety Insight - Uses Flash for efficiency */
export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAI();
    if (!ai) return "Bhai, API key check karein Vercel dashboard mein.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in. Write a short 2-line safety shayari or motivational greeting. 
      Language: ${langName}. 
      Special Rule for Hindi: Speak like a very close 'Desi' friend, warm and informal.`,
    });
    
    return response.text?.trim() || "Stay alert, stay safe.";
  } catch (error) {
    console.error("Insight API Fail:", error);
    return "Hamesha surakshit rahein, dost.";
  }
}

/** 3. TTS Voice - Uses dedicated TTS model */
export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = getAI();
    if (!ai) return null;

    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this with a very warm and sweet tone in ${langName}: ${text}` }] }],
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
    console.error("TTS API Fail:", error);
    return null;
  }
}

/** 4. Dost AI Companion - Uses Pro for advanced reasoning + Search */
export async function getDostAiResponse(prompt: string, base64Image: string | null, user: UserProfile) {
  try {
    const ai = getAI();
    if (!ai) return "Bhai, setup poora nahi hai. API Key missing lag rahi hai.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const parts: any[] = [{ text: `You are 'Dost AI', a safety shield and companion for ${user.name}. 
    User Context: Blood ${user.bloodGroup}, Medical Condition: ${user.medicalConditions}.
    If user mentions any danger, give priority SURVIVAL steps. Use Google Search for real-time safety info.
    Language: ${langName} (Desi style for Hindi).
    
    Message: ${prompt}` }];

    if (base64Image) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "";
    // Extract grounding info if Google Search was used
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Sources:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("DostAI API Fail:", error);
    return "Maafi chahta hoon dost, connection mein issue hai. Par himmat mat harna.";
  }
}

/** 5. Hospital Maps Grounding - Uses 2.5 Flash for Google Maps support */
export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = getAI();
    if (!ai) return "Location services setup pending.";
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `List the 3 nearest emergency hospitals with high ratings. Language: ${langName}.`,
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
      output += "\n\n🏥 Verified Centers:";
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Maps Grounding Fail:", error);
    return "Hospitals search failed. Please try government emergency helpline 112.";
  }
}

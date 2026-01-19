
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Uses defensive checks for API_KEY to ensure reliability on Vercel.
 */

const getAI = () => {
  // Safe access to process.env
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;
  if (!apiKey) {
    console.error("Gemini API Key missing. Check Vercel/Environment Variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/** 1. Registration Analysis */
export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = getAI();
    if (!ai) return { soulAge: "Ancient Spirit", reading: "Setup pending...", predictedDays: 32000 };
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} (Age ${age}) medical condition: ${medical}. 
      Generate: 1. A unique Soul Age (funny/deep) 2. Predicted remaining life days (22,000 to 40,000) 3. Personality reading based on health resilience. 
      Language: ${langName}. If Hindi, use 'Desi' colloquial style (warm, brotherly).
      Return JSON ONLY.`,
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
    return { soulAge: "Immortal", predictedDays: 36500, reading: "Your energy is eternal." };
  }
}

/** 2. Morning Safety Insight */
export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAI();
    if (!ai) return "Bhai, API key check karein Vercel settings mein.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in safely. 
      Write a short 2-line safety shayari or motivational greeting. 
      Language: ${langName}. 
      Hindi Instruction: Use informal 'Desi' brotherly style.`,
    });
    
    return response.text?.trim() || "Stay alert, stay safe.";
  } catch (error) {
    console.error("Insight API Error:", error);
    return "Surakshit rahein, dost.";
  }
}

/** 3. TTS Voice Generation */
export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = getAI();
    if (!ai) return null;

    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak warmly in ${langName}: ${text}` }] }],
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

/** 4. Dost AI Companion - Pro + Search */
export async function getDostAiResponse(prompt: string, base64Image: string | null, user: UserProfile) {
  try {
    const ai = getAI();
    if (!ai) return "API missing. Verify your configuration.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const parts: any[] = [{ text: `You are 'Dost AI', ${user.name}'s safety shield. 
    User: Blood ${user.bloodGroup}, Med: ${user.medicalConditions}.
    If danger mentioned, provide survival steps. Use Google Search for news/safety.
    Language: ${langName} (Desi style for Hindi).
    User: ${prompt}` }];

    if (base64Image) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Grounded Info:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("DostAI API Error:", error);
    return "Bhai, connection slow hai par himmat mat harna.";
  }
}

/** 5. Hospital Search - Maps Grounding */
export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = getAI();
    if (!ai) return "Setup pending.";
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Nearest best hospitals for emergencies. Language: ${langName}.`,
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
      output += "\n\n🏥 Map Results:";
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Maps API Error:", error);
    return "Manual check suggested: call 112.";
  }
}

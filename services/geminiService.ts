
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION NOTE:
 * On Vercel, ensure you have set the 'API_KEY' environment variable.
 * We instantiate the client inside each call to ensure the environment 
 * variables are correctly accessed at runtime.
 */
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: process.env.API_KEY is missing. Check Vercel Environment Variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/** 1. Registration Analysis & Soul Persona */
export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = getClient();
    if (!ai) return { soulAge: "Ancient Spirit", reading: "Configuration pending.", predictedDays: 30000 };
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Registration Analysis:
      User: ${name}
      Age: ${age}
      Medical Condition: ${medical}
      Language: ${langName}
      
      Generate a fun "Soul Age", a predicted remaining life duration (20k-40k days), 
      and a personality reading based on their medical resilience. 
      If Hindi, use 'Desi' style (informal, warm). 
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
    return { soulAge: "Eternal", predictedDays: 36500, reading: "You are beyond time." };
  }
}

/** 2. Morning Safety Insight */
export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getClient();
    if (!ai) return "Bhai, API key check karo Vercel mein.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} has safely checked in. 
      Generate a short 2-line safety shayari or motivation. 
      Language: ${langName}. 
      Hindi instructions: Use 'Desi' colloquial style, very brotherly and supportive.`,
    });
    
    return response.text?.trim() || "Stay safe, friend.";
  } catch (error) {
    console.error("Insight API Error:", error);
    return "Surakshit rahein, dost.";
  }
}

/** 3. Text-to-Speech Voice Generation */
export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = getClient();
    if (!ai) return null;

    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this warmly in ${langName}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' } // Warm, friendly voice
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

/** 4. Dost AI Safety Companion */
export async function getDostAiResponse(prompt: string, base64Image: string | null, user: UserProfile) {
  try {
    const ai = getClient();
    if (!ai) return "AI setup is incomplete. Check API key.";
    
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const parts: any[] = [{ text: `You are 'Dost AI', ${user.name}'s safety shield. 
    User Context: Blood ${user.bloodGroup}, Medical: ${user.medicalConditions}.
    If danger is mentioned, prioritize survival steps. 
    Language: ${langName} (Desi style for Hindi).
    
    User message: ${prompt}` }];

    if (base64Image) {
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Image }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let output = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Verfied Sources:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("DostAI API Error:", error);
    return "Bhai, connectivity issue hai par ghabrao mat, main yahin hoon.";
  }
}

/** 5. Hospital Map Search (Grounding) */
export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = getClient();
    if (!ai) return "Maps API not initialized.";
    
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the 3 nearest hospitals with 24/7 emergency services. Language: ${langName}.`,
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
      output += "\n\n🏥 Nearby Emergency Centers:";
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    
    return output;
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return "Error searching for hospitals. Please try manual emergency numbers.";
  }
}


import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Strictly adheres to Google GenAI SDK guidelines.
 */

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User: ${name}, Age: ${age}, Meds: ${medical}. 
      Task: Create a poetic 'Soul Age' title and a 2-sentence reading about their resilience. 
      Language: ${langName}. Format: JSON only.`,
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
    return { soulAge: "Strong Soul", predictedDays: 35000, reading: "Your spirit is a beacon of strength in this world." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${user.name} checked in safely. Give a 1-line powerful motivational quote or shayari in ${langName} regarding survival and being alive.`,
    });
    return response.text?.trim() || "Zinda ho, toh jeene ka haq rakho.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Suraksha hi sabse badi jeet hai.";
  }
}

export async function getDostAiResponse(prompt: string, user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are 'Dost AI', a wise and protective safety assistant for ${user.name} (Blood Group: ${user.bloodGroup}).
      Context: Indian Safety App. User is asking for help or info.
      Tone: Brotherly, helpful, desi, serious when needed.
      Language: ${langName}.
      User Input: ${prompt}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let text = response.text || "Main sun raha hoon, dost.";
    const groundings = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundings) {
      text += "\n\n🔍 Source Verifications:";
      groundings.forEach((chunk: any) => {
        if (chunk.web) text += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    return text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Server thoda bura maan gaya hai, par main aapke saath hoon.";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the absolute best nearest hospitals for emergency trauma care. Response language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    let output = response.text || "Searching nearby medical help...";
    const groundings = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundings) {
      output += "\n\n🏥 Emergency Destinations Found:";
      groundings.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    return output;
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return "Hospital data load nahi ho raha. Call 112 directly.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this with deep heart and warmth in ${langName}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

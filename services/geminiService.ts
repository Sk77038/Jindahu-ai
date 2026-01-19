
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

/**
 * PRODUCTION GEMINI SERVICE
 * Uses direct process.env.API_KEY access as required.
 */

export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Registration Context: User ${name}, Age ${age}, Med: ${medical}. 
      Task: Return a 'Soul Age' title and reading in ${langName}. Format: JSON.`,
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
    console.error("Gemini Error:", error);
    return { soulAge: "Ancient Spirit", predictedDays: 36000, reading: "Your energy is timeless." };
  }
}

export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a 1-line motivational safety greeting for ${user.name} in ${langName}.`,
    });
    return response.text?.trim() || "Stay alert, stay safe.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Surakshit rahein, hamesha.";
  }
}

export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say warmly in ${langName}: ${text}` }] }],
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

export async function getDostAiResponse(prompt: string, user: UserProfile) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are 'Dost AI', a protective companion for ${user.name}.
      Language: ${langName}. Tone: Friendly Desi.
      Topic: Safety, survival, and general help.
      Query: ${prompt}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let output = response.text || "Main sun raha hoon bhai.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      output += "\n\n🌐 Verification Links:";
      chunks.forEach((chunk: any) => {
        if (chunk.web) output += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
      });
    }
    return output;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Bhai, server thoda busy hai. Tab tak apna khyal rakho!";
  }
}

export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = LANGUAGE_NAME_MAP[language] || 'English';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find nearest best hospitals for emergency assistance. Use local language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    let output = response.text || "Yahan kuch hospitals hain:";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) output += `\n- ${chunk.maps.title}: ${chunk.maps.uri}`;
      });
    }
    return output;
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return "Hospital info nahi mil pa raha. Call 112 for immediate help!";
  }
}

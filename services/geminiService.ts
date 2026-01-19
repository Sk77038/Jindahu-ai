
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile } from '../types';
import { LANGUAGE_NAME_MAP } from '../constants';

// Strict initialization according to coding guidelines
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key missing in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/** 1. Registration Analysis & Soul Persona */
export async function getSoulAnalysis(name: string, language: string, age: string, medical: string) {
  try {
    const ai = getAIClient();
    if (!ai) return { soulAge: "Immortal", reading: "Cryptic vibes.", predictedDays: 35000 };
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User ${name} (Age ${age}) is registering. Medical context: ${medical}.
      Generate:
      1. Funny "Soul Age" (e.g., 'Old Rishi', 'Cyber Kid').
      2. Life Duration (25k-40k days).
      3. Personality reading based on medical resilience.
      Language: ${langName}. If Hindi, use Desi style (informal, brotherly).
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
    // Accessing .text as a property, not a method
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("SoulAnalysis Error:", error);
    return { soulAge: "Eternal", predictedDays: 36500, reading: "You are a cosmic phenomenon." };
  }
}

/** 2. Morning Desi Insight */
export async function getSafetyInsight(user: UserProfile) {
  try {
    const ai = getAIClient();
    if (!ai) return "Bhai, hamesha alert raho.";
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short 2-line safety shayari or motivational quote.
      Context: User ${user.name} just checked in and is safe.
      Language: ${langName}. SPECIAL INSTRUCTION for Hindi: Use 'Desi' colloquial language. Speak like a very close friend (informal, sweet, brotherly).`,
    });
    return response.text?.trim() || "Dost, hamesha safe raho.";
  } catch (error) { 
    console.error("Insight Error:", error);
    return "Stay safe, friend."; 
  }
}

/** 3. Sweet TTS Voice */
export async function getMotivationalVoice(text: string, language: string) {
  try {
    const ai = getAIClient();
    if (!ai) return null;
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this in a very sweet, warm voice in ${langName}: ${text}` }] }],
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
    console.error("TTS Error:", error);
    return null; 
  }
}

/** 4. Dost AI Responder */
export async function getDostAiResponse(prompt: string, base64Image: string | null, user: UserProfile) {
  try {
    const ai = getAIClient();
    if (!ai) return "Bhai, offline hoon.";
    const langName = LANGUAGE_NAME_MAP[user.language] || 'English';

    const parts: any[] = [{ text: `You are 'Dost AI', a safety companion for ${user.name}.
    Medical: ${user.bloodGroup}, ${user.medicalConditions}.
    If danger, give SURVIVAL STEPS. Use GOOGLE SEARCH for real-time safety info.
    Language: ${langName}. If Hindi, use Desi style.
    Prompt: ${prompt}` }];

    if (base64Image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { tools: [{ googleSearch: {} }] }
    });

    let output = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
       output += "\n\n🌐 Sources:";
       chunks.forEach((c: any) => { if(c.web) output += `\n- ${c.web.title}: ${c.web.uri}`; });
    }
    return output;
  } catch (error) {
    console.error("DostAI Error:", error);
    return "Bhai, himmat rakho. Help is coming.";
  }
}

/** 5. Maps Grounding (Hospital Search) */
export async function getNearbyHospitals(lat: number, lng: number, language: string) {
  try {
    const ai = getAIClient();
    if (!ai) return "Bhai, maps kaam nahi kar raha.";
    const langName = LANGUAGE_NAME_MAP[language] || 'English';

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the nearest best hospitals. Language: ${langName}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
      },
    });

    let output = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
       output += "\n\n🏥 Places:";
       chunks.forEach((c: any) => { if(c.maps) output += `\n- ${c.maps.title}: ${c.maps.uri}`; });
    }
    return output;
  } catch (error) {
    console.error("Maps Error:", error);
    return "Error fetching hospitals.";
  }
}

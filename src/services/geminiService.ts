import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize strictly according to guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file/blob to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 1. Patient Bot: Tracks improvements
export const chatWithMedicalBot = async (history: {role: string, parts: {text: string}[]}[], newMessage: string) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are DermoBot, a helpful and empathetic medical assistant for a dermatology patient. Your goal is to track daily skin improvements, remind them of medication, and provide general skincare advice. Do not provide definitive medical diagnoses; always refer to their doctor for critical issues. Keep responses concise and supportive.",
      },
      history: history.map(h => ({ role: h.role, parts: h.parts })),
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to the server. Please try again later.";
  }
};

// 2. Doctor AI: Analyze Image (Simulated CNN Backend)
export const analyzeLesion = async (imageBase64: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            text: `Act as a specialized medical CNN (Convolutional Neural Network) trained on the ISIC dataset. 
            Analyze this skin lesion image.
            
            1. Provide a probability distribution (0.0 to 1.0) for the following classes:
               - Melanoma
               - Melanocytic Nevus
               - Basal Cell Carcinoma
               - Squamous Cell Carcinoma
               - Benign Keratosis
               - Dermatofibroma
               - Vascular Lesion
            
            2. Determine the most likely diagnosis.
            3. Estimate severity (Low, Moderate, High, Critical).
            4. Identify key visual features.
            5. Provide recommendations.

            Output strictly in JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence score of the top diagnosis (0-1)" },
            probabilities: { 
                type: Type.OBJECT, 
                properties: {
                    "Melanoma": { type: Type.NUMBER },
                    "Melanocytic Nevus": { type: Type.NUMBER },
                    "Basal Cell Carcinoma": { type: Type.NUMBER },
                    "Squamous Cell Carcinoma": { type: Type.NUMBER },
                    "Benign Keratosis": { type: Type.NUMBER },
                    "Dermatofibroma": { type: Type.NUMBER },
                    "Vascular Lesion": { type: Type.NUMBER }
                }
            },
            severity: { type: Type.STRING, enum: ["Low", "Moderate", "High", "Critical"] },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            features: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["diagnosis", "confidence", "probabilities", "severity", "recommendations", "features"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No data returned");
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      diagnosis: "Analysis Failed",
      confidence: 0,
      probabilities: { "Unknown": 1 },
      severity: "Low",
      recommendations: ["Manual review required"],
      features: []
    };
  }
};

// 3. Doctor AI: Hair Removal / Grab Cut Simulation (Image Editing)
export const cleanLesionImage = async (imageBase64: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            text: "Remove hair and skin reflections from this lesion to clearly show the skin texture and boundaries for medical diagnosis. Keep the lesion shape and color authentic."
          }
        ]
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Cleaning Error:", error);
    return null;
  }
};

// 4. Patient Alarm: Verify if uploaded photo is actually a skin photo
export const verifySkinPhoto = async (imageBase64: string): Promise<boolean> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                    { text: "Is this image likely a photo of human skin or a body part? Answer with strictly 'YES' or 'NO'." }
                ]
            }
        });
        const text = response.text?.trim().toUpperCase();
        return text?.includes("YES") ?? false;
    } catch (e) {
        console.error("Verification failed", e);
        return true; // Fallback to allow alarm dismissal if AI fails
    }
}
import { GoogleGenAI, Type } from "@google/genai";
import { TarotCardData, DeckSection } from '../types';

// Ensure API key is available
const apiKey = process.env.API_KEY;

// Initialize the client. Use a placeholder if missing to allow the app to load, 
// but requests will fail if not provided later.
const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-key' });

export const hasApiKey = (): boolean => {
  return !!apiKey && apiKey !== 'missing-key';
};

/**
 * Validates the API key by making a minimal request.
 */
export const validateApiKey = async (): Promise<boolean> => {
  if (!hasApiKey()) return false;
  
  try {
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "ping",
    });
    return true;
  } catch (error) {
    console.error("API Key Validation Failed:", error);
    return false;
  }
};

/**
 * Helper to clean JSON string if the model adds markdown formatting
 */
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code blocks if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
};

/**
 * Generates the textual metadata for a specific section of the tarot deck.
 */
export const generateDeckSectionMetadata = async (
  section: DeckSection,
  theme: string,
  artStyle: string
): Promise<TarotCardData[]> => {
  if (!hasApiKey()) {
    throw new Error("API Key is missing. Please check your .env file.");
  }

  try {
    let promptContext = "";
    let expectedNamesList = "";

    if (section === 'Major Arcana') {
      promptContext = "the 22 cards of the Major Arcana";
      expectedNamesList = "0 The Fool, I The Magician, II The High Priestess, III The Empress, IV The Emperor, V The Hierophant, VI The Lovers, VII The Chariot, VIII Strength, IX The Hermit, X Wheel of Fortune, XI Justice, XII The Hanged Man, XIII Death, XIV Temperance, XV The Devil, XVI The Tower, XVII The Star, XVIII The Moon, XIX The Sun, XX Judgement, XXI The World";
    } else {
      promptContext = `the 14 cards of the Suit of ${section}`;
      expectedNamesList = `Ace of ${section}, Two of ${section}, Three of ${section}, Four of ${section}, Five of ${section}, Six of ${section}, Seven of ${section}, Eight of ${section}, Nine of ${section}, Ten of ${section}, Page of ${section}, Knight of ${section}, Queen of ${section}, King of ${section}`;
    }

    const prompt = `
      Create a list of exactly ${promptContext} for a standard 78-card Rider-Waite Tarot deck.
      Theme: "${theme}".
      Art Style: "${artStyle}".
      
      Strict Rules:
      1. ONLY generate cards for ${section}.
      2. The output MUST contain exactly these card names: ${expectedNamesList}.
      3. Provide a 'visualPrompt' that describes the card image in high detail, matching the theme.
      4. Provide upright and reversed meanings.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the card" },
              description: { type: Type.STRING, description: "Short visual description." },
              uprightMeaning: { type: Type.STRING, description: "Meaning when drawn upright." },
              reversedMeaning: { type: Type.STRING, description: "Meaning when drawn reversed." },
              visualPrompt: { type: Type.STRING, description: "Detailed prompt for image generation." }
            },
            required: ["name", "description", "uprightMeaning", "reversedMeaning", "visualPrompt"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini API.");

    let rawCards;
    try {
      rawCards = JSON.parse(cleanJsonString(text));
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", text);
      throw new Error("Failed to parse API response. Please try again.");
    }
    
    // Add IDs and initial state
    return rawCards.map((card: any, index: number) => ({
      ...card,
      id: `${section.toLowerCase().replace(/\s+/g, '-')}-${index}-${Date.now()}`,
      section: section,
      isLoadingImage: true,
    }));

  } catch (error: any) {
    console.error(`Error generating metadata for ${section}:`, error);
    // Propagate the actual error message
    throw new Error(error.message || "Unknown API Error");
  }
};

/**
 * Generates an image for a specific tarot card using its visual prompt and optional reference style.
 */
export const generateCardImage = async (visualPrompt: string, referenceImageBase64?: string): Promise<string> => {
  if (!hasApiKey()) {
    throw new Error("API Key is missing.");
  }

  try {
    const parts: any[] = [];

    // If a reference image is provided, add it to the prompt to influence style
    if (referenceImageBase64) {
      const matches = referenceImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
         const mimeType = matches[1];
         const data = matches[2];

         parts.push({
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        });
        parts.push({
          text: `Create a tarot card image matching the artistic style of the provided reference image. Content: ${visualPrompt}`
        });
      } else {
         parts.push({ text: visualPrompt });
      }
    } else {
      parts.push({ text: visualPrompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
            aspectRatio: "3:4", 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating card image:", error);
    // Return a fallback placeholder if generation fails, to prevent app crash
    return `https://placehold.co/300x400/1e1e2e/FFF?text=Generation+Failed`;
  }
};
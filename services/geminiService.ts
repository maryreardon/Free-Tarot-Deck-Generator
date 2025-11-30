import { GoogleGenAI, Type } from "@google/genai";
import { TarotCardData, DeckSection } from '../types';

// Ensure API key is available
const apiKey = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

/**
 * Generates the textual metadata for a specific section of the tarot deck.
 */
export const generateDeckSectionMetadata = async (
  section: DeckSection,
  theme: string,
  artStyle: string
): Promise<TarotCardData[]> => {
  // Explicit check to give user feedback if they forgot to set the env var
  if (!apiKey || apiKey === 'dummy-key') {
    throw new Error("API Key is missing. Please set the API_KEY environment variable in your project settings.");
  }

  try {
    let promptContext = "";
    let expectedNamesList = "";

    if (section === 'Major Arcana') {
      promptContext = "the 22 cards of the Major Arcana";
      expectedNamesList = "0 The Fool, I The Magician, II The High Priestess, III The Empress, IV The Emperor, V The Hierophant, VI The Lovers, VII The Chariot, VIII Strength, IX The Hermit, X Wheel of Fortune, XI Justice, XII The Hanged Man, XIII Death, XIV Temperance, XV The Devil, XVI The Tower, XVII The Star, XVIII The Moon, XIX The Sun, XX Judgement, XXI The World";
    } else {
      promptContext = `the 14 cards of the Suit of ${section}`;
      // Explicitly list all required names to prevent hallucinations
      expectedNamesList = `Ace of ${section}, Two of ${section}, Three of ${section}, Four of ${section}, Five of ${section}, Six of ${section}, Seven of ${section}, Eight of ${section}, Nine of ${section}, Ten of ${section}, Page of ${section}, Knight of ${section}, Queen of ${section}, King of ${section}`;
    }

    const prompt = `
      Create a list of exactly ${promptContext} for a standard 78-card Rider-Waite Tarot deck.
      Theme: "${theme}".
      Art Style: "${artStyle}".
      
      Strict Rules:
      1. ONLY generate cards for ${section}. Do NOT include cards from other suits.
      2. The output MUST contain exactly these card names: ${expectedNamesList}.
      3. Do NOT rename the cards (e.g. do NOT change "Queen of ${section}" to "The Empress" or any other name).
      4. Provide a 'visualPrompt' that describes the card image in high detail. 
         - The image MUST feature characters/elements consistent with the "${theme}" theme.
         - The composition should roughly echo the traditional Rider-Waite symbolism but adapted to the theme.
         - The style MUST be "${artStyle}".
         - Include "white border" in the prompt if it fits the style.
      5. Provide upright and reversed meanings adapted to this theme.
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
              name: { type: Type.STRING, description: `Name of the card (Must be one of: ${expectedNamesList})` },
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
    if (!text) throw new Error("No text returned from Gemini");

    const rawCards = JSON.parse(text);
    
    // Add IDs and initial state
    return rawCards.map((card: any, index: number) => ({
      ...card,
      id: `${section.toLowerCase().replace(' ', '-')}-${index}-${Date.now()}`,
      section: section,
      isLoadingImage: true,
    }));

  } catch (error) {
    console.error(`Error generating metadata for ${section}:`, error);
    throw error;
  }
};

/**
 * Generates an image for a specific tarot card using its visual prompt and optional reference style.
 */
export const generateCardImage = async (visualPrompt: string, referenceImageBase64?: string): Promise<string> => {
  if (!apiKey || apiKey === 'dummy-key') {
    throw new Error("API Key is missing. Please set the API_KEY environment variable in your project settings.");
  }

  try {
    const parts: any[] = [];

    // If a reference image is provided, add it to the prompt to influence style
    if (referenceImageBase64) {
      // Extract mime type from base64 string (e.g., "data:image/jpeg;base64,...")
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
          text: `Create a tarot card image matching the artistic style and color palette of the provided reference image. Content: ${visualPrompt}`
        });
      } else {
         // Fallback if regex fails, though unlikely for valid data URLs
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
    // Return a fallback placeholder if generation fails
    return `https://via.placeholder.com/300x400.png?text=Generation+Failed`;
  }
};
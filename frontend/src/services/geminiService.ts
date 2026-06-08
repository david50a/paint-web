import { GoogleGenerativeAI } from "@google/generative-ai";

export interface PaintingAnalysis {
  style: string;
  technique: string;
  emotionalImpact: string;
  colorPalette: string;
  historicalContext?: string;
}

function getGeminiApiKey(): string | undefined {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  return key?.trim();
}

function getGenAI(): GoogleGenerativeAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not configured.");
  return new GoogleGenerativeAI(apiKey);
}

function buildAnalysisPrompt(title: string, medium: string): string {
  return `Analyze the artwork "${title}" (${medium}). 
  Provide insights on style, technique, emotional impact, and color palette.
  Return the results as a JSON object with keys: style, technique, emotionalImpact, colorPalette.`;
}

/**
 * Fallback "Mock" analysis if AI is unavailable
 */
function getFallbackAnalysis(title: string, medium: string): PaintingAnalysis {
  return {
    style: `${medium} focused composition`,
    technique: `Expert application of ${medium} techniques`,
    emotionalImpact: `The piece "${title}" evokes a sense of creative exploration and artistic depth.`,
    colorPalette: "A balanced selection of tones appropriate for the medium."
  };
}

export async function analyzePainting(imageUrl: string, title: string, medium: string): Promise<PaintingAnalysis> {
  const prompt = buildAnalysisPrompt(title, medium);
  try {
    const genAI = getGenAI();
    
    // Try multiple model variants in order of preference
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e: any) {
        lastError = e;
        if (e.message?.includes("404")) continue; // Try next model
        throw e; // If it's a quota or auth error, stop immediately
      }
    }
    
    console.warn("All AI models returned 404. Using smart fallback.");
    return getFallbackAnalysis(title, medium);
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    return getFallbackAnalysis(title, medium);
  }
}

export async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve({ data: base64, mimeType: blob.type || 'image/jpeg' });
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function analyzePaintingWithImage(imageUrl: string, title: string, medium: string): Promise<PaintingAnalysis> {
  const imageData = await imageUrlToBase64(imageUrl);
  
  if (!imageData) {
    return analyzePainting(imageUrl, title, medium);
  }

  const prompt = buildAnalysisPrompt(title, medium);
  try {
    const genAI = getGenAI();
    // Use flash for vision as it is the most capable for this
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error) {
    console.warn("Visual Analysis failed, trying text-only multi-model fallback...");
    return analyzePainting(imageUrl, title, medium);
  }
}

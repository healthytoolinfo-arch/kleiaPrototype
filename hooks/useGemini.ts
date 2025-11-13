
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { ConfigData, Plan, Meal } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY, vertexai: true });

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Nombre del plato" },
    description: { type: Type.STRING, description: "Breve descripción del plato" },
    calories: { type: Type.NUMBER, description: "Calorías totales del plato" },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Lista de ingredientes, un item por línea."
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Pasos de la receta, un paso por línea."
    },
    cookTime: { type: Type.STRING, description: "Tiempo de cocción estimado (ej: '25 min')" }
  },
  required: ["name", "description", "calories", "ingredients", "instructions", "cookTime"]
};

const parseJsonResponse = <T>(text: string): T | null => {
  try {
    const cleanedText = text.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch (error) {
    console.error("Error parsing JSON response:", error, "Raw text:", text);
    return null;
  }
};

export const useGemini = () => {

  const generatePlan = async (config: ConfigData, mealTypes: string[]): Promise<Plan | null> => {
    const daySchema = {
      type: Type.OBJECT,
      properties: mealTypes.reduce((acc, type) => {
        acc[type] = mealSchema;
        return acc;
      }, {} as Record<string, typeof mealSchema>),
      required: mealTypes,
    };

    const planSchema = {
      type: Type.ARRAY,
      items: daySchema
    };

    const prompt = `Crea un plan de comidas JSON para ${config.days} días.

REGLAS ESTRICTAS:
1. El JSON de salida DEBE ser un array.
2. El array DEBE contener ${config.days} objetos, uno por cada día.
3. CADA objeto de día DEBE tener TODAS las siguientes claves: "${mealTypes.join('", "')}". NO OMITAS NINGUNA CLAVE.
4. El valor para cada clave de comida (ej. "Desayuno") DEBE ser un objeto de comida completo que siga el schema.

DATOS DEL PLAN:
- Objetivo: ${config.objective}
- Estilo de Dieta: ${config.dietStyle}
- Restricciones: ${config.restrictions || 'Ninguna'}
- Calorías diarias: ~${config.calories} kcal

Responde SOLAMENTE con el JSON. Sin texto adicional.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: planSchema,
          temperature: 0.7,
        }
      });
      return parseJsonResponse<Plan>(response.text);
    } catch (error) {
      console.error("Error generating plan:", error);
      return null;
    }
  };

  const fillMealDetails = async (mealName: string, config: ConfigData, calPerMeal: number): Promise<Meal | null> => {
    const prompt = `Rellena los detalles para el plato: "${mealName}".
Es para un plan con objetivo: ${config.objective}.
Estilo de Dieta OBLIGATORIO: ${config.dietStyle}.
Restricciones OBLIGATORIAS: ${config.restrictions || 'Ninguna'}.
Calorías objetivo para este plato: ${calPerMeal} kcal.
Responde SOLAMENTE con un JSON que se ajuste al schema.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: mealSchema,
        }
      });
      const mealData = parseJsonResponse<Meal>(response.text);
      if (mealData) {
        // Gemini sometimes returns the name slightly different, so we enforce the original name
        mealData.name = mealName;
      }
      return mealData;
    } catch (error) {
      console.error("Error filling meal details:", error);
      return null;
    }
  };
  
  const regenerateMeal = async (type: string, config: ConfigData, calPerMeal: number): Promise<Meal | null> => {
     const prompt = `Genera un plato de tipo '${type}' de aproximadamente ${calPerMeal} kcal.
Estilo de Dieta OBLIGATORIO: ${config.dietStyle}.
Restricciones OBLIGATORIAS: ${config.restrictions || 'Ninguna'}.
Objetivo del plan: ${config.objective}.
Responde SOLAMENTE con un JSON que se ajuste al schema.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: mealSchema,
        }
      });
      return parseJsonResponse<Meal>(response.text);
    } catch (error) {
      console.error("Error regenerating meal:", error);
      return null;
    }
  };

  const generateImageForMeal = async (mealName: string, mealDescription: string): Promise<string | null> => {
    const prompt = `Fotografía de comida profesional, apetitosa y de alta calidad del siguiente plato:
Plato: "${mealName}"
Descripción: "${mealDescription}"
La imagen debe ser brillante, clara y centrada en la comida. Sin texto, logos o personas.`;
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
        },
      });
      const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
      return base64ImageBytes ? `data:image/jpeg;base64,${base64ImageBytes}` : null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const generateShoppingList = async (plan: Plan, config: ConfigData): Promise<string | null> => {
    const prompt = `Genera una lista de compras en formato Markdown para el siguiente plan de comidas: ${JSON.stringify(plan)}.
Estilo de Dieta: ${config.dietStyle}.
Restricciones: ${config.restrictions}.
Responde SOLAMENTE con la lista en Markdown, agrupando por categorías (ej: ### Frutas y Verduras) y usando guiones (-) para los ítems. No incluyas ningún texto introductorio, ni frases explicativas o finales. SOLO la lista.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: prompt }] },
      });
      return response.text;
    } catch (error) {
      console.error("Error generating shopping list:", error);
      return null;
    }
  };

  return { generatePlan, fillMealDetails, regenerateMeal, generateImageForMeal, generateShoppingList };
};

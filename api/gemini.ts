
import { GoogleGenAI, GenerateContentResponse, Type, Plan, Meal, ConfigData } from '@google/genai';

// This code runs on the server, so process.env is secure.
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set on the server");
}
const ai = new GoogleGenAI({ apiKey: API_KEY, vertexai: true });

// Define a generic handler for all incoming requests to this endpoint
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    let result;

    switch (type) {
      case 'generatePlan':
        result = await handleGeneratePlan(payload);
        break;
      case 'fillMealDetails':
        result = await handleFillMealDetails(payload);
        break;
      case 'regenerateMeal':
        result = await handleRegenerateMeal(payload);
        break;
      case 'generateImage':
        result = await handleGenerateImage(payload);
        break;
      case 'generateShoppingList':
        result = await handleGenerateShoppingList(payload);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid request type' }), { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(`Error in /api/gemini: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}


// --- Handlers for each action ---

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING }, description: { type: Type.STRING }, calories: { type: Type.NUMBER },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
    cookTime: { type: Type.STRING }
  },
  required: ["name", "description", "calories", "ingredients", "instructions", "cookTime"]
};

async function handleGeneratePlan({ config, mealTypes }: { config: ConfigData, mealTypes: string[] }) {
  const daySchema = {
    type: Type.OBJECT,
    properties: mealTypes.reduce((acc, type) => ({ ...acc, [type]: mealSchema }), {}),
    required: mealTypes,
  };
  const planSchema = { type: Type.ARRAY, items: daySchema };
  const prompt = `Crea un plan de comidas JSON para ${config.days} días. REGLAS ESTRICTAS: 1. El JSON de salida DEBE ser un array. 2. El array DEBE contener ${config.days} objetos. 3. CADA objeto de día DEBE tener TODAS las siguientes claves: "${mealTypes.join('", "')}". NO OMITAS NINGUNA. 4. El valor para cada clave de comida DEBE ser un objeto de comida completo. DATOS DEL PLAN: - Objetivo: ${config.objective} - Estilo de Dieta: ${config.dietStyle} - Restricciones: ${config.restrictions || 'Ninguna'} - Calorías diarias: ~${config.calories} kcal. Responde SOLAMENTE con el JSON.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: planSchema, temperature: 0.7 }
  });
  return JSON.parse(response.text);
}

async function handleFillMealDetails({ mealName, config, calPerMeal }: { mealName: string, config: ConfigData, calPerMeal: number }) {
  const prompt = `Rellena los detalles para el plato: "${mealName}". DATOS: Objetivo: ${config.objective}, Dieta: ${config.dietStyle}, Restricciones: ${config.restrictions || 'Ninguna'}, Calorías: ${calPerMeal} kcal. Responde SOLAMENTE con un JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: mealSchema }
  });
  const mealData = JSON.parse(response.text);
  if (mealData) mealData.name = mealName;
  return mealData;
}

async function handleRegenerateMeal({ type, config, calPerMeal }: { type: string, config: ConfigData, calPerMeal: number }) {
  const prompt = `Genera un plato de tipo '${type}' de ~${calPerMeal} kcal. DATOS: Objetivo: ${config.objective}, Dieta: ${config.dietStyle}, Restricciones: ${config.restrictions || 'Ninguna'}. Responde SOLAMENTE con un JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', contents: { role: 'user', parts: [{ text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: mealSchema }
  });
  return JSON.parse(response.text);
}

async function handleGenerateImage({ mealName, mealDescription }: { mealName: string, mealDescription: string }) {
  const prompt = `Fotografía de comida profesional, apetitosa, del plato: "${mealName}" (${mealDescription}). Imagen brillante, clara, centrada. Sin texto, logos o personas.`;
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001', prompt,
    config: { numberOfImages: 1, aspectRatio: '1:1' }
  });
  const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
  return base64ImageBytes ? `data:image/jpeg;base64,${base64ImageBytes}` : null;
}

async function handleGenerateShoppingList({ plan, config }: { plan: Plan, config: ConfigData }) {
  const prompt = `Genera una lista de compras en Markdown para este plan: ${JSON.stringify(plan)}. DATOS: Dieta: ${config.dietStyle}, Restricciones: ${config.restrictions}. Responde SOLAMENTE con la lista en Markdown, agrupando por categorías (### Categoria) y usando guiones (-). Sin texto introductorio.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', contents: { role: 'user', parts: [{ text: prompt }] }
  });
  return response.text;
}

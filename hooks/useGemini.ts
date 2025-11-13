
import { ConfigData, Plan, Meal } from '../types';

// This is a generic fetcher for our backend API
async function apiFetcher<T>(type: string, payload: any): Promise<T | null> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API fetcher error for type "${type}":`, error);
    return null;
  }
}

export const useGemini = () => {
  const generatePlan = async (config: ConfigData, mealTypes: string[]): Promise<Plan | null> => {
    return apiFetcher<Plan>('generatePlan', { config, mealTypes });
  };

  const fillMealDetails = async (mealName: string, config: ConfigData, calPerMeal: number): Promise<Meal | null> => {
    return apiFetcher<Meal>('fillMealDetails', { mealName, config, calPerMeal });
  };
  
  const regenerateMeal = async (type: string, config: ConfigData, calPerMeal: number): Promise<Meal | null> => {
    return apiFetcher<Meal>('regenerateMeal', { type, config, calPerMeal });
  };

  const generateImageForMeal = async (mealName: string, mealDescription: string): Promise<string | null> => {
    return apiFetcher<string>('generateImage', { mealName, mealDescription });
  };

  const generateShoppingList = async (plan: Plan, config: ConfigData): Promise<string | null> => {
    return apiFetcher<string>('generateShoppingList', { plan, config });
  };

  return { generatePlan, fillMealDetails, regenerateMeal, generateImageForMeal, generateShoppingList };
};

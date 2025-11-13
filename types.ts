
export interface Meal {
  name: string;
  description: string;
  calories: number;
  ingredients: string[] | string;
  instructions: string[] | string;
  cookTime?: string;
}

export interface DayPlan {
  [mealType: string]: Meal | {};
}

export type Plan = DayPlan[];

export interface ConfigData {
  clientName: string;
  planName: string;
  objective: string;
  dietStyle: string;
  days: number;
  meals: number;
  calories: number;
  restrictions: string;
  mode: 'ai' | 'manual';
}

export interface ImageCache {
  [key: string]: 'loading' | 'failed' | string;
}

export interface EditingMeal {
  dayIndex: number;
  type: string;
  data: Meal | {};
}

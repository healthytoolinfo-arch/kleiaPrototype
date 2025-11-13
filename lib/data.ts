
import { Meal } from '../types';

export const FALLBACK_DB = {
  proteins: ["Pollo a la plancha", "Salmón al horno", "Tofu marinado", "Ternera magra", "Huevos revueltos", "Lentejas estofadas", "Pechuga de pavo", "Bacalao al pil pil", "Queso cottage"],
  carbs: ["con arroz integral", "con quinoa", "con batata asada", "con pasta integral", "con tostadas de aguacate", "con puré de patatas", "con cuscús", "con pan de pita integral"],
  veggies: ["y brócoli al vapor", "y ensalada mixta", "y espárragos trigueros", "y espinacas salteadas", "y calabacín a la plancha", "y pimientos asados", "y champiñones salteados"],
  breakfasts: [
    { name: "Avena con Frutos Rojos", calories: 350, description: "Avena cocida con leche o agua, decorada con fresas y arándanos frescos.", ingredients: "- 50g Avena\n- 150ml Leche\n- 50g Frutos Rojos", instructions: "1. Cocer avena con leche.\n2. Servir con frutos rojos." },
    { name: "Tostada de Aguacate y Huevo", calories: 400, description: "Pan integral tostado con medio aguacate machacado y un huevo poché encima.", ingredients: "- 2 rebanadas Pan Integral\n- 1 Aguacate\n- 2 Huevos", instructions: "1. Tostar el pan.\n2. Machacar aguacate.\n3. Hacer huevos." },
    { name: "Yogur Griego con Granola", calories: 300, description: "Yogur griego natural sin azúcar con granola crujiente y un toque de miel.", ingredients: "- 150g Yogur Griego\n- 30g Granola\n- 1 cda Miel", instructions: "1. Poner yogur en bol.\n2. Añadir granola y miel." },
  ],
  vegProteins: ["Tofu marinado", "Lentejas estofadas", "Garbanzos especiados", "Heura a la plancha", "Tempeh salteado", "Frijoles negros", "Seitan", "Edamame"],
  vegBreakfasts: [
    { name: "Avena con Frutos Rojos (Vegana)", calories: 350, description: "Avena cocida con leche de almendras, decorada con fresas y arándanos frescos.", ingredients: "- 50g Avena\n- 150ml Leche de Almendras\n- 50g Frutos Rojos", instructions: "1. Cocer avena con leche.\n2. Servir con frutos rojos." },
    { name: "Tostada de Aguacate y Tomate", calories: 300, description: "Pan integral tostado con medio aguacate machacado y tomate cherry.", ingredients: "- 2 rebanadas Pan Integral\n- 1 Aguacate\n- 5 Tomates Cherry", instructions: "1. Tostar el pan.\n2. Machacar aguacate y poner encima con los tomates." },
    { name: "Revuelto de Tofu", calories: 320, description: "Tofu firme desmigado y salteado con cúrcuma, espinacas y pimiento.", ingredients: "- 150g Tofu Firme\n- 50g Espinacas\n- 1/4 Pimiento Rojo\n- 1/2 cdta Cúrcuma", instructions: "1. Desmigar tofu.\n2. Saltear con verduras y cúrcuma." },
  ]
};

export const generateFallbackMeal = (type: string, caloriesPerMeal: number, dietStyle = "Equilibrada"): Meal => {
  const isVeg = dietStyle.toLowerCase().includes("veg");

  if (type.toLowerCase().includes("desayuno")) {
    const breakfastSet = isVeg ? FALLBACK_DB.vegBreakfasts : FALLBACK_DB.breakfasts;
    const meal = breakfastSet[Math.floor(Math.random() * breakfastSet.length)];
    return {
      ...meal,
      calories: Math.round(caloriesPerMeal),
      cookTime: "10 min",
    };
  }

  const pSet = isVeg ? FALLBACK_DB.vegProteins : FALLBACK_DB.proteins;
  const p = pSet[Math.floor(Math.random() * pSet.length)];
  const c = FALLBACK_DB.carbs[Math.floor(Math.random() * FALLBACK_DB.carbs.length)];
  const v = FALLBACK_DB.veggies[Math.floor(Math.random() * FALLBACK_DB.veggies.length)];

  const ingredientsArray = [
    p.replace(/con.*$/, '').trim(),
    c.replace(/con |y /, '').trim(),
    v.replace(/y /, '').trim(),
    "Aceite de oliva virgen extra",
    "Sal y pimienta al gusto"
  ];

  return {
    name: `${p} ${c} ${v}`,
    description: "Un plato equilibrado y nutritivo generado automáticamente por el sistema de respaldo.",
    calories: Math.round(caloriesPerMeal),
    cookTime: "20-30 min",
    ingredients: ingredientsArray.map(i => `- ${i}`).join('\n'),
    instructions: "1. Cocinar la proteína al gusto (plancha o horno).\n2. Preparar la guarnición de carbohidratos.\n3. Servir junto con las verduras y aderezar."
  };
};

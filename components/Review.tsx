
import React, { useMemo, useEffect, useState } from 'react';
import { Plan, ConfigData, ImageCache, Meal } from '../types';
import { useGemini } from '../hooks/useGemini';
import { Button, Card, Spinner } from './ui';
import { useToasts } from './toasts/ToastContext';

const InteractiveShoppingList: React.FC<{ listText: string }> = ({ listText }) => {
  const categories = useMemo(() => {
    if (!listText) return [];
    const cleanedText = listText.replace(/.*?(### |\*\*)/s, '$1');
    const categoryRegex = /(?:### |\*\*)(.*?)(?:\n|$)/g;
    const itemRegex = /-\s*(.*)/g;
    
    const sections = cleanedText.split(categoryRegex).filter(Boolean);
    if (sections.length === 0) return [];

    const result: { title: string; items: string[] }[] = [];
    for (let i = 0; i < sections.length; i += 2) {
        const title = sections[i].trim();
        const content = sections[i+1] || "";
        const items = Array.from(content.matchAll(itemRegex), m => m[1].trim());
        if (title && items.length > 0) {
            result.push({ title, items });
        }
    }
    if (result.length === 0 && listText.includes('-')) {
        const items = listText.split('\n').map(l => l.replace(/-\s*/, '').trim()).filter(Boolean);
        return [{title: "General", items}];
    }

    return result;
  }, [listText]);

  if (categories.length === 0) {
    return <p className="text-gray-500 italic">No se ha generado la lista de compras todavía.</p>;
  }

  return (
    <div className="space-y-6">
      {categories.map((cat, i) => (
        <div key={i}>
          <h4 className="font-bold text-lg mb-3 border-b pb-2">{cat.title}</h4>
          <ul className="space-y-2">
            {cat.items.map((item, j) => (
              <li key={j} className="flex items-center gap-3">
                <input type="checkbox" id={`item-${i}-${j}`} className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 border-gray-300" />
                <label htmlFor={`item-${i}-${j}`} className="text-gray-700">{item}</label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const RecipeDetailModal: React.FC<{ meal: Meal; imageUrl: string | null; onClose: () => void; }> = ({ meal, imageUrl, onClose }) => {
  const renderList = (items: string | string[]) => {
    const list = Array.isArray(items) ? items : String(items || "").split('\n');
    return list.filter(Boolean).map((item, i) => <li key={i}>{String(item).replace(/^- /, '')}</li>);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeln">
      <Card className="w-full max-w-3xl max-h-[95vh] overflow-y-auto animate-slideUp">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-2xl font-black text-orange-600">{meal.name}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
          </div>
          {imageUrl && <img src={imageUrl} alt={meal.name} className="w-full h-64 object-cover rounded-lg border shadow-md" />}
          <p className="text-gray-700 font-medium">{meal.description}</p>
          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-3">
              <h4 className="text-xl font-bold text-gray-800">Ingredientes</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 pl-4">{renderList(meal.ingredients)}</ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-bold text-gray-800">Instrucciones</h4>
              <ol className="list-decimal list-inside text-gray-700 space-y-2 pl-4">{renderList(meal.instructions)}</ol>
            </div>
          </div>
           <div className="text-sm text-gray-500 pt-4 border-t flex justify-between">
              <span><strong>Calorías:</strong> {meal.calories || 'N/A'} kcal</span>
              <span><strong>Tiempo:</strong> {meal.cookTime || 'N/A'}</span>
            </div>
        </div>
      </Card>
    </div>
  );
};

export const PrintablePlan: React.FC<{ plan: Plan; data: ConfigData; imageCache: ImageCache; shoppingList: string; }> = ({ plan, data, imageCache, shoppingList }) => {
  if (!plan) return null;
  const mealTypes = useMemo(() => {
    const m = ["Desayuno", "Almuerzo", "Cena"];
    if (data.meals >= 4) m.splice(2, 0, "Merienda");
    if (data.meals >= 5) m.splice(4, 0, "Recena");
    return m;
  }, [data.meals]);

  return (
    <div className="printable-plan-container">
      <div className="print-page">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-orange-600">{data.planName || "Plan Nutricional"}</h1>
          <p className="text-2xl text-gray-700 mt-4">Preparado para: {data.clientName}</p>
        </div>
        <div className="border p-6 rounded-lg max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-gray-800">Resumen del Plan</h2>
          <p className="text-lg mt-2"><strong>Objetivo:</strong> {data.objective}</p>
          <p className="text-lg mt-1"><strong>Estilo de Dieta:</strong> {data.dietStyle}</p>
          <p className="text-lg mt-1"><strong>Duración:</strong> {data.days} Días</p>
          <p className="text-lg mt-1"><strong>Calorías:</strong> ~{data.calories} kcal/día</p>
          <p className="text-lg mt-1"><strong>Comidas:</strong> {data.meals} por día</p>
          <p className="text-lg mt-1"><strong>Restricciones:</strong> {data.restrictions || 'Ninguna'}</p>
        </div>
      </div>
      {plan.map((day, dayIndex) => (
        <div key={dayIndex} className="print-page">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-orange-600 pb-2">Día {dayIndex + 1}</h2>
          <div className="space-y-8">
            {mealTypes.map(mealType => {
              const meal = day[mealType] as Meal;
              if (!meal || !meal.name) return null;
              const cacheKey = `${dayIndex}-${mealType}-${meal.name}`;
              const imageUrl = (imageCache[cacheKey] && imageCache[cacheKey] !== 'loading' && imageCache[cacheKey] !== 'failed') ? imageCache[cacheKey] : null;
              return (
                <div key={mealType} className="meal-item-print">
                  <h3 className="text-2xl font-bold text-orange-600">{mealType}: {meal.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{meal.calories || 0} kcal | {meal.cookTime || 'N/A'}</p>
                  {imageUrl && <img src={imageUrl} alt={meal.name} className="w-full h-64 object-cover rounded-lg my-3 border" />}
                  <p className="text-gray-700 my-3">{meal.description}</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-bold">Ingredientes</h4>
                      <ul className="list-disc list-inside text-gray-600">{Array.isArray(meal.ingredients) ? meal.ingredients.map((ing, i) => <li key={i}>{String(ing).replace(/^- /, '')}</li>) : String(meal.ingredients || "").split('\n').map((ing, i) => <li key={i}>{String(ing).replace(/^- /, '')}</li>)}</ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">Instrucciones</h4>
                      <div className="text-gray-600 whitespace-pre-wrap">{Array.isArray(meal.instructions) ? meal.instructions.join('\n') : String(meal.instructions || "").trim()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="print-page">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-orange-600 pb-2">Lista de Compras</h2>
        <InteractiveShoppingList listText={shoppingList} />
      </div>
    </div>
  );
};

export const Review: React.FC<{ plan: Plan; data: ConfigData; onBack: () => void; imageCache: ImageCache; shoppingList: string; setShoppingList: React.Dispatch<React.SetStateAction<string>>; }> = ({ plan, data, onBack, imageCache, shoppingList, setShoppingList }) => {
  const { generateShoppingList } = useMemo(() => useGemini(), []);
  const { addToast } = useToasts();
  const [loadingList, setLoadingList] = useState(false);
  const [modalMeal, setModalMeal] = useState<{ meal: Meal; imageUrl: string | null } | null>(null);

  const mealTypes = useMemo(() => {
    const m = ["Desayuno", "Almuerzo", "Cena"];
    if (data.meals >= 4) m.splice(2, 0, "Merienda");
    if (data.meals >= 5) m.splice(4, 0, "Recena");
    return m;
  }, [data.meals]);

  useEffect(() => {
    const genList = async () => {
      if (!plan || plan.length === 0) return;
      
      setLoadingList(true);
      try {
        const res = await generateShoppingList(plan, data);
        if (res) {
          setShoppingList(res);
        } else {
          throw new Error("AI failed to generate shopping list.");
        }
      } catch (error) {
        console.error(error);
        addToast("La IA no pudo generar la lista, creando una de respaldo.", "info");
        let simpleList = "### Lista de Compras (Respaldo)\n";
        plan.forEach(day => Object.values(day).forEach((m: any) => {
          if (m.name && m.ingredients) {
            const ingredients = Array.isArray(m.ingredients) ? m.ingredients.join('\n') : m.ingredients;
            simpleList += `\n**Para ${m.name}:**\n${ingredients}\n`;
          }
        }));
        setShoppingList(simpleList);
      } finally {
        setLoadingList(false);
      }
    };
    genList();
  }, [plan, data, setShoppingList, generateShoppingList, addToast]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error("Failed to open print dialog:", error);
      addToast("No se pudo abrir la impresión. Use Ctrl+P o la opción de su navegador.", "error");
    }
  };

  return (
    <div className="space-y-8">
      {modalMeal && <RecipeDetailModal meal={modalMeal.meal} imageUrl={modalMeal.imageUrl} onClose={() => setModalMeal(null)} />}
      <div className="text-center space-y-2 bg-orange-50 p-8 rounded-2xl border border-orange-100">
        <h2 className="text-3xl font-black text-gray-900">{data.planName || "Tu Plan Nutricional"}</h2>
        <p className="text-gray-600 font-medium">Preparado para {data.clientName}</p>
        <p className="text-sm text-gray-500 pt-2">{data.objective} | {data.dietStyle} | {data.calories} kcal/día</p>
      </div>
      <div className="grid gap-8">
        {plan.map((day, i) => (
          <div key={i} className="border-b pb-8 last:border-0">
            <h3 className="text-xl font-bold text-orange-600 mb-4">Día {i + 1}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealTypes.map(type => {
                const meal = day[type] as Meal;
                if (!meal || !meal.name) return <div key={type} className="hidden"></div>;
                const cacheKey = (meal && meal.name) ? `${i}-${type}-${meal.name}` : null;
                const imageUrl = cacheKey ? imageCache[cacheKey] : null;
                return (
                  <Card key={type} className="bg-white border hover:shadow-lg transition">
                    <div className="p-4 flex gap-4 items-center">
                      {imageUrl && imageUrl !== 'loading' && imageUrl !== 'failed' && <img src={imageUrl} alt={meal.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />}
                      {(!imageUrl || imageUrl === 'loading' || imageUrl === 'failed') && <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-400 text-xs"><Spinner className="w-6 h-6"/></div>}
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">{type}</span>
                        <h4 className="font-bold text-gray-800">{meal.name}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 border-t flex justify-center">
                      <Button variant="ghost" className="text-sm py-1" onClick={() => setModalMeal({ meal, imageUrl })}>Ver Receta Completa</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 p-8 rounded-2xl shadow-inner border">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Lista de Compras</h3>
        {loadingList ? <p className="animate-pulse">Generando lista inteligente...</p> : <InteractiveShoppingList listText={shoppingList} />}
      </div>
      <div className="flex justify-between pt-4 print-hidden">
        <Button variant="secondary" onClick={onBack}>&larr; Editar Plan</Button>
        <Button onClick={handlePrint}>🖨️ Imprimir PDF</Button>
      </div>
    </div>
  );
};


import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plan, ConfigData, ImageCache, Meal, EditingMeal } from '../types';
import { useGemini } from '../hooks/useGemini';
import { generateFallbackMeal } from '../lib/data';
import { Button, Card, Spinner } from './ui';
import { MealEditor } from './MealEditor';
import { useToasts } from './toasts/ToastContext';

const CalorieProgressFooter: React.FC<{ clientName: string; planName: string; targetCalories: number; currentCalories: number; }> = ({ clientName, planName, targetCalories, currentCalories }) => {
  const percentage = targetCalories > 0 ? Math.min((currentCalories / targetCalories) * 100, 100) : 0;
  const isOver = currentCalories > targetCalories;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 print-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-sm font-bold text-gray-800">{clientName}</span>
            <span className="text-sm text-gray-500"> / {planName || "Plan Personalizado"}</span>
          </div>
          <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-800'}`}>
            {Math.round(currentCalories)} / {targetCalories} kcal (Día)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-orange-600'}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export const Builder: React.FC<{ plan: Plan; setPlan: React.Dispatch<React.SetStateAction<Plan>>; data: ConfigData; onBack: () => void; onNext: () => void; imageCache: ImageCache; setImageCache: React.Dispatch<React.SetStateAction<ImageCache>>; }> = ({ plan, setPlan, data, onBack, onNext, imageCache, setImageCache }) => {
  const [day, setDay] = useState(0);
  const [editingMeal, setEditingMeal] = useState<EditingMeal | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const { regenerateMeal, generateImageForMeal } = useGemini();
  const { addToast } = useToasts();

  const mealTypes = useMemo(() => {
    const m = ["Desayuno", "Almuerzo", "Cena"];
    if (data.meals >= 4) m.splice(2, 0, "Merienda");
    if (data.meals >= 5) m.splice(4, 0, "Recena");
    return m;
  }, [data.meals]);

  const totalCaloriesToday = useMemo(() => {
    if (!plan || !plan[day]) return 0;
    const currentDayData = plan[day];
    return mealTypes.reduce((sum, type) => {
      const meal = currentDayData[type] as Meal;
      return sum + (Number(meal?.calories) || 0);
    }, 0);
  }, [plan, day, mealTypes]);

  const generateImage = useCallback(async (mealName: string, mealDescription: string, dayIndex: number, mealType: string) => {
    const cacheKey = `${dayIndex}-${mealType}-${mealName}`;
    if (imageCache[cacheKey] === 'loading' || imageCache[cacheKey]) return;
    setImageCache(prev => ({ ...prev, [cacheKey]: 'loading' }));
    const result = await generateImageForMeal(mealName, mealDescription);
    if (!result) {
        addToast(`Error al generar imagen para: ${mealName}`, 'error');
    }
    setImageCache(prev => ({ ...prev, [cacheKey]: result || 'failed' }));
  }, [generateImageForMeal, imageCache, setImageCache, addToast]);

  useEffect(() => {
    if (!plan || !plan[day]) return;
    const currentDayPlan = plan[day];
    mealTypes.forEach(mealType => {
      const meal = currentDayPlan[mealType] as Meal;
      if (meal && meal.name) {
        generateImage(meal.name, meal.description, day, mealType);
      }
    });
  }, [plan, day, mealTypes, generateImage]);

  const handleEdit = (type: string) => {
    setEditingMeal({
      dayIndex: day,
      type,
      data: plan[day]?.[type] || { name: "", description: "" }
    });
  };

  const handleDeleteMeal = (type: string) => {
    if (!confirm("¿Seguro que quieres eliminar este plato?")) return;
    const newPlan = [...plan];
    if (newPlan[day] && newPlan[day][type]) {
      const oldMeal = newPlan[day][type] as Meal;
      if (oldMeal.name) {
        const oldCacheKey = `${day}-${type}-${oldMeal.name}`;
        setImageCache(prevCache => {
          const newCache = { ...prevCache };
          delete newCache[oldCacheKey];
          return newCache;
        });
      }
      newPlan[day][type] = {};
      setPlan(newPlan);
      addToast('Plato eliminado.', 'success');
    }
  };

  const saveMeal = (newData: Meal) => {
    const { dayIndex, type } = editingMeal!;
    const newPlan = [...plan];
    const oldMeal = (plan[dayIndex]?.[type] || {}) as Meal;

    if (oldMeal && oldMeal.name !== newData.name) {
      const oldCacheKey = `${dayIndex}-${type}-${oldMeal.name}`;
      setImageCache(prevCache => {
        const newCache = { ...prevCache };
        delete newCache[oldCacheKey];
        return newCache;
      });
    }
    
    if (!newPlan[dayIndex]) newPlan[dayIndex] = {};
    newPlan[dayIndex][type] = newData;
    setPlan(newPlan);
    setEditingMeal(null);
    addToast('Plato guardado con éxito.', 'success');
  };

  const handleRegenerateMeal = async (type: string) => {
    setIsRegenerating(type);
    try {
      const calPerMeal = Math.round(data.calories / data.meals);
      let newMeal = await regenerateMeal(type, data, calPerMeal);
      let source = 'IA';
      if (!newMeal) {
        newMeal = generateFallbackMeal(type, calPerMeal, data.dietStyle);
        source = 'respaldo local';
      }
      
      const newPlan = [...plan];
      if (!newPlan[day]) newPlan[day] = {};
      newPlan[day][type] = newMeal;
      setPlan(newPlan);
      addToast(`Plato regenerado desde ${source}.`, 'success');

    } catch (e) {
      addToast('Error al regenerar el plato.', 'error');
      console.error("Error al regenerar", e);
    } finally {
      setIsRegenerating(null);
    }
  };

  return (
    <div className="relative pb-24">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Constructor del Plan</h2>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {plan.map((_, i) => (
              <button key={i} onClick={() => setDay(i)} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${day === i ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
                Día {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mealTypes.map(type => {
            const meal = (plan[day]?.[type] || {}) as Meal;
            const hasMeal = meal && meal.name;
            const cacheKey = hasMeal ? `${day}-${type}-${meal.name}` : null;
            const imageUrl = cacheKey ? imageCache[cacheKey] : null;
            const isThisRegenerating = isRegenerating === type;

            return (
              <Card key={type} className={`flex flex-col h-full group ${isThisRegenerating ? 'opacity-50 pointer-events-none animate-pulse' : 'transition-opacity'}`}>
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <span className="font-bold text-gray-700 uppercase tracking-wide text-xs">{type}</span>
                  {hasMeal && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">{meal.calories} kcal</span>}
                </div>
                
                {hasMeal ? (
                  <div className="flex-grow flex flex-col">
                    <div className="relative w-full h-40 bg-gray-100 group-hover:opacity-90 transition-opacity">
                      {imageUrl === 'loading' && <div className="absolute inset-0 flex items-center justify-center bg-black/10"><Spinner /></div>}
                      {imageUrl && imageUrl !== 'loading' && imageUrl !== 'failed' ? (
                        <img src={imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                          {imageUrl === 'failed' ? <span className="text-red-500">Error de API</span> : <Spinner />}
                          <span className="mt-1">Generando...</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-2">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">{meal.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-3">{meal.description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center p-6">
                    <button onClick={() => handleEdit(type)} className="w-full text-center py-4 px-6 border-2 border-gray-300 border-dashed rounded-lg text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition">
                      + Añadir Plato
                    </button>
                  </div>
                )}

                <div className="p-2 bg-gray-50 border-t grid grid-cols-3 gap-1">
                  <Button variant="ghost" onClick={() => handleRegenerateMeal(type)} disabled={!!isRegenerating} className="text-xs py-2">
                    {isThisRegenerating ? <Spinner className="w-4 h-4"/> : '🔄'}
                  </Button>
                  <Button variant="ghost" onClick={() => handleEdit(type)} className="text-xs py-2" disabled={!hasMeal || !!isRegenerating}>✏️</Button>
                  <Button variant="ghost" onClick={() => handleDeleteMeal(type)} className="text-xs py-2 text-red-500 hover:bg-red-50 hover:text-red-700" disabled={!hasMeal || !!isRegenerating}>🗑️</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
        <Button variant="secondary" onClick={onBack}>&larr; Atrás</Button>
        <Button onClick={onNext}>Finalizar y Revisar &rarr;</Button>
      </div>
      {editingMeal && <MealEditor meal={editingMeal.data} onSave={saveMeal} onClose={() => setEditingMeal(null)} data={data} />}
      <CalorieProgressFooter clientName={data.clientName} planName={data.planName} targetCalories={data.calories} currentCalories={totalCaloriesToday} />
    </div>
  );
};

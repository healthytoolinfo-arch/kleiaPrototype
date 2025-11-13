
import React, { useState } from 'react';
import { ConfigData, Meal } from '../types';
import { useGemini } from '../hooks/useGemini';
import { Button, Card } from './ui';
import { useToasts } from './toasts/ToastContext';

export const MealEditor: React.FC<{ meal: Meal | {}; onSave: (meal: Meal) => void; onClose: () => void; data: ConfigData; }> = ({ meal: initialMeal, onSave, onClose, data }) => {
  const [localMeal, setLocalMeal] = useState<Partial<Meal>>(initialMeal);
  const [isFilling, setIsFilling] = useState(false);
  const { fillMealDetails } = useGemini();
  const { addToast } = useToasts();

  const handleAiFill = async () => {
    if (!localMeal.name) {
      addToast("Por favor, escribe un nombre para el plato primero.", 'info');
      return;
    }
    setIsFilling(true);
    try {
      const calPerMeal = Math.round(data.calories / data.meals);
      const aiData = await fillMealDetails(localMeal.name, data, calPerMeal);
      if (aiData) {
        setLocalMeal(prev => ({
          ...prev,
          ...aiData,
          ingredients: Array.isArray(aiData.ingredients) ? aiData.ingredients.join('\n') : aiData.ingredients,
          instructions: Array.isArray(aiData.instructions) ? aiData.instructions.join('\n') : aiData.instructions,
        }));
        addToast("Detalles rellenados con IA.", 'success');
      } else {
        throw new Error("La IA no devolvió datos válidos.");
      }
    } catch (error) {
      addToast("Error de la IA. No se pudieron rellenar los datos.", 'error');
      console.error(error);
    } finally {
      setIsFilling(false);
    }
  };

  const handleSave = () => {
    const finalMeal: Meal = {
      name: localMeal.name || "Sin nombre",
      description: localMeal.description || "",
      calories: Number(localMeal.calories) || 0,
      ingredients: localMeal.ingredients || "",
      instructions: localMeal.instructions || "",
      cookTime: localMeal.cookTime || "N/A",
    };
    onSave(finalMeal);
    onClose();
  };

  const handleInputChange = (field: keyof Meal, value: string | number) => {
    setLocalMeal(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeln">
      <Card className="w-full max-w-lg p-6 space-y-4 animate-slideUp max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-xl font-bold text-gray-800">Editar Plato</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="space-y-3">
          <input className="w-full p-3 border rounded-xl font-bold text-lg" placeholder="Nombre del plato" value={localMeal.name || ''} onChange={e => handleInputChange('name', e.target.value)} />
          <Button variant="ghost" onClick={handleAiFill} disabled={isFilling} className="w-full text-sm py-2">
            {isFilling ? "✨ Rellenando..." : "✨ Rellenar detalles con IA basado en el título"}
          </Button>
          <textarea className="w-full p-3 border rounded-xl text-sm text-gray-600" placeholder="Descripción corta" rows={2} value={localMeal.description || ''} onChange={e => handleInputChange('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="p-3 border rounded-xl text-sm" placeholder="Calorías" value={localMeal.calories || ''} onChange={e => handleInputChange('calories', Number(e.target.value))} />
            <input className="p-3 border rounded-xl text-sm" placeholder="Tiempo (ej: 20 min)" value={localMeal.cookTime || ''} onChange={e => handleInputChange('cookTime', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Ingredientes (uno por línea)</label>
            <textarea className="w-full p-3 border rounded-xl text-sm" rows={4} value={typeof localMeal.ingredients === 'string' ? localMeal.ingredients : ''} onChange={e => handleInputChange('ingredients', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Instrucciones (una por línea)</label>
            <textarea className="w-full p-3 border rounded-xl text-sm" rows={4} value={typeof localMeal.instructions === 'string' ? localMeal.instructions : ''} onChange={e => handleInputChange('instructions', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </div>
      </Card>
    </div>
  );
};

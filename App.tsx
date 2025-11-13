
import React, { useMemo } from 'react';
import { ConfigData, Plan, ImageCache, DayPlan } from './types';
import { useGemini } from './hooks/useGemini';
import usePersistentState from './hooks/usePersistentState';
import { generateFallbackMeal } from './lib/data';
import { Button, Card, Input, Select, Textarea, LoadingModal, ErrorBoundary } from './components/ui';
import { Builder } from './components/Builder';
import { Review, PrintablePlan } from './components/Review';

// --- PRINT STYLES ---
const printStyles = `
  @media print {
    body { font-size: 10pt; background: #fff; }
    #main-app, .print-hidden { display: none; }
    .printable-plan-container { display: block !important; }
    .print-page { page-break-after: always; padding: 1in; margin: 0; width: 100%; box-shadow: none; border: none; }
    .print-page:last-child { page-break-after: auto; }
    .meal-item-print { break-inside: avoid; padding-top: 20px; }
    .meal-item-print img { max-width: 80%; margin-left: auto; margin-right: auto; display: block; }
    .printable-plan-container input[type="checkbox"], .printable-plan-container label { display: none; }
  }
  @media screen {
    .printable-plan-container { display: none; }
  }
`;

// --- INITIAL STATES ---
const initialConfigData: ConfigData = {
  clientName: "", planName: "", objective: "", dietStyle: "Omnívora",
  days: 3, meals: 3, calories: 2000, restrictions: "", mode: 'ai'
};

// --- VIEWS (kept simple ones here) ---
const Intro: React.FC<{ onNext: (mode: 'ai' | 'manual') => void }> = ({ onNext }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 p-4">
    <div className="space-y-4">
      <div className="inline-block p-4 bg-orange-100 rounded-full text-4xl mb-2">🥗</div>
      <h1 className="text-5xl font-black text-gray-900 tracking-tight">Kleia<span className="text-orange-600">.</span></h1>
      <p className="text-xl text-gray-500 max-w-md mx-auto">Tu nutricionista personal inteligente. Crea planes semanales en segundos.</p>
    </div>
    <div className="flex gap-4 flex-col sm:flex-row w-full max-w-md">
      <Button onClick={() => onNext('ai')} className="w-full">✨ Generar Automáticamente</Button>
      <Button onClick={() => onNext('manual')} variant="secondary" className="w-full">✍️ Diseñar Manualmente</Button>
    </div>
  </div>
);

const ConfigForm: React.FC<{ data: ConfigData; setData: React.Dispatch<React.SetStateAction<ConfigData>>; onNext: () => void; }> = ({ data, setData, onNext }) => {
  const handleChange = (key: keyof ConfigData, val: string | number) => setData(p => ({ ...p, [key]: val }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-800">Configura el Plan</h2>
        <p className="text-gray-500">Dinos qué necesitas para personalizar el menú.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nombre del Cliente" value={data.clientName} onChange={e => handleChange('clientName', e.target.value)} placeholder="Ej: María López" required />
            <Input label="Nombre del Plan" value={data.planName} onChange={e => handleChange('planName', e.target.value)} placeholder="Ej: Plan Verano Fit" required />
          </div>
          <Input label="Objetivo Principal" value={data.objective} onChange={e => handleChange('objective', e.target.value)} placeholder="Ej: Perder grasa, ganar músculo" required />
          <Select label="Estilo de Alimentación" value={data.dietStyle} onChange={e => handleChange('dietStyle', e.target.value)}>
            <option value="Omnívora">Omnívora - Come de todo</option>
            <option value="Vegetariana">Vegetariana – Sin carne ni pescado</option>
            <option value="Vegana">Vegana - Sin productos animales</option>
            <option value="Pescetariana">Pescetariana - Incluye pescado</option>
            <option value="Sin gluten">Sin gluten - Evita el gluten</option>
            <option value="Sin lactosa">Sin lactosa - Evita la lactosa</option>
            <option value="Baja en carbohidratos">Baja en carbohidratos</option>
            <option value="Cetogénica (Keto)">Cetogénica (Keto)</option>
            <option value="Mediterránea">Mediterránea</option>
          </Select>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Días" type="number" min="1" max="7" value={data.days} onChange={e => handleChange('days', parseInt(e.target.value))} className="text-center" />
            <Select label="Comidas" value={data.meals} onChange={e => handleChange('meals', parseInt(e.target.value))}>
              <option value="3">3 (Desayuno/Almuerzo/Cena)</option>
              <option value="4">4 (+ Merienda)</option>
              <option value="5">5 (+ 2 Meriendas)</option>
            </Select>
            <Input label="Calorías/día" type="number" step="50" value={data.calories} onChange={e => handleChange('calories', parseInt(e.target.value))} className="text-center" />
          </div>
          <Textarea label="Restricciones / Preferencias (Opcional)" value={data.restrictions} onChange={e => handleChange('restrictions', e.target.value)} placeholder="Ej: Alergia a las nueces, no le gusta el pescado..." />
        </Card>
        <div className="flex justify-end mt-6">
          <Button type="submit" className="w-full md:w-auto">Crear Plan &rarr;</Button>
        </div>
      </form>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [step, setStep] = usePersistentState<'intro' | 'config' | 'builder' | 'review'>('kleia-step', 'intro');
  const [loading, setLoading] = usePersistentState('kleia-loading', false);
  const { generatePlan } = useGemini();
  const [data, setData] = usePersistentState<ConfigData>('kleia-data', initialConfigData);
  const [plan, setPlan] = usePersistentState<Plan>('kleia-plan', []);
  const [imageCache, setImageCache] = usePersistentState<ImageCache>('kleia-imageCache', {});
  const [shoppingList, setShoppingList] = usePersistentState("kleia-shoppingList", "");

  const mealTypes = useMemo(() => {
    const m = ["Desayuno", "Almuerzo", "Cena"];
    if (data.meals >= 4) m.splice(2, 0, "Merienda");
    if (data.meals >= 5) m.splice(4, 0, "Recena");
    return m;
  }, [data.meals]);

  const handleGeneratePlan = async () => {
    setLoading(true);
    let finalPlan: Plan;
    const daysCount = Number(data.days) || 3;
    
    if (data.mode === 'ai') {
      let generatedPlan = await generatePlan(data, mealTypes);
      if (!generatedPlan || generatedPlan.length === 0) {
        console.warn("AI plan generation failed, using fallback.");
        const calPerMeal = Math.round(data.calories / data.meals);
        finalPlan = Array.from({ length: daysCount }, () => {
          const dayObj: DayPlan = {};
          mealTypes.forEach(t => {
            dayObj[t] = generateFallbackMeal(t, calPerMeal, data.dietStyle);
          });
          return dayObj;
        });
      } else {
        finalPlan = generatedPlan;
      }
    } else { // Manual mode
      finalPlan = Array.from({ length: daysCount }, () => {
        const dayObj: DayPlan = {};
        mealTypes.forEach(t => {
          dayObj[t] = {}; // Create empty slots for all meal types
        });
        return dayObj;
      });
    }
    
    setPlan(finalPlan);
    setLoading(false);
    setStep('builder');
  };

  const goHome = () => {
    // Clear persisted state
    window.localStorage.removeItem('kleia-step');
    window.localStorage.removeItem('kleia-data');
    window.localStorage.removeItem('kleia-plan');
    window.localStorage.removeItem('kleia-imageCache');
    window.localStorage.removeItem('kleia-shoppingList');
    window.localStorage.removeItem('kleia-loading');

    // Reset state variables to initial values
    setStep('intro');
    setData(initialConfigData);
    setPlan([]);
    setImageCache({});
    setShoppingList("");
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return <Intro onNext={(mode) => { setData(d => ({ ...d, mode })); setStep('config'); }} />;
      case 'config':
        return <ConfigForm data={data} setData={setData} onNext={handleGeneratePlan} />;
      case 'builder':
        return <ErrorBoundary><Builder plan={plan} setPlan={setPlan} data={data} onBack={() => setStep('config')} onNext={() => setStep('review')} imageCache={imageCache} setImageCache={setImageCache} /></ErrorBoundary>;
      case 'review':
        return <ErrorBoundary><Review plan={plan} data={data} onBack={() => setStep('builder')} imageCache={imageCache} shoppingList={shoppingList} setShoppingList={setShoppingList} /></ErrorBoundary>;
      default:
        // If state is somehow corrupted, go home
        goHome();
        return null;
    }
  };

  return (
    <>
      <style>{printStyles}</style>
      <div id="main-app" className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20 selection:bg-orange-100">
        {loading && <LoadingModal message="Generando tu plan..." />}
        <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-xl sm:my-8 sm:min-h-0 sm:rounded-3xl overflow-hidden border border-gray-100">
          <div className="bg-white border-b p-4 sm:p-6 flex justify-between items-center print-hidden">
            <div className="flex items-center gap-2">
              <button onClick={goHome} title="Volver al inicio" className="text-gray-400 hover:text-orange-600 transition p-2 rounded-lg hover:bg-orange-50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              </button>
              <span className="font-black text-2xl tracking-tighter text-gray-900">Kleia<span className="text-orange-600">.</span></span>
            </div>
            {step !== 'intro' && <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wide text-gray-500">{step}</span>}
          </div>
          <div className="p-4 sm:p-6 md:p-10">
            {renderStep()}
          </div>
        </div>
      </div>
      <PrintablePlan plan={plan} data={data} imageCache={imageCache} shoppingList={shoppingList} />
    </>
  );
}

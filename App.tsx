import React, { useState, useEffect } from 'react';
import { ChefHat, FileText, Utensils, PenTool, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Pantry } from './components/Pantry.tsx';
import { RecipeBook } from './components/RecipeBook.tsx';
import { CoverLetterStation } from './components/CoverLetterStation.tsx';
import { CookMode, ChefState, Ingredient, ToastMessage, ToastType } from './types.ts';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CookMode>(CookMode.PANTRY);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Initialize state with persistence check
  const [chefState, setChefState] = useState<ChefState>(() => {
    try {
      const savedIngredients = localStorage.getItem('jobcook_ingredients');
      return {
        ingredients: savedIngredients ? JSON.parse(savedIngredients) : [],
        currentRecipe: '',
        companyName: '',
        analysis: null,
        companyResearch: null,
        generatedCoverLetter: null,
        isCooking: false,
      };
    } catch (e) {
      console.error("Failed to load ingredients from storage", e);
      return {
        ingredients: [],
        currentRecipe: '',
        companyName: '',
        analysis: null,
        companyResearch: null,
        generatedCoverLetter: null,
        isCooking: false,
      };
    }
  });

  // Persist ingredients whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('jobcook_ingredients', JSON.stringify(chefState.ingredients));
    } catch (e) {
      console.error("Failed to save ingredients to storage", e);
    }
  }, [chefState.ingredients]);

  // Toast Handler
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen w-full bg-stone-100 font-sans">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-xl shadow-xl flex items-start gap-3 transform transition-all animate-fadeIn ${
              toast.type === 'error' ? 'bg-white border-l-4 border-red-500 text-stone-800' :
              toast.type === 'success' ? 'bg-white border-l-4 border-green-500 text-stone-800' :
              'bg-white border-l-4 border-blue-500 text-stone-800'
            }`}
          >
            <div className="mt-0.5">
              {toast.type === 'error' && <AlertTriangle size={18} className="text-red-500" />}
              {toast.type === 'success' && <CheckCircle size={18} className="text-green-500" />}
              {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-sm ${
                 toast.type === 'error' ? 'text-red-600' :
                 toast.type === 'success' ? 'text-green-600' :
                 'text-blue-600'
              }`}>
                {toast.type === 'error' ? 'Kitchen Alert' : toast.type === 'success' ? 'Order Up!' : 'Chef Note'}
              </h4>
              <p className="text-sm text-stone-600 leading-snug">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <nav className="w-20 md:w-64 bg-white border-r border-stone-200 flex flex-col flex-shrink-0 z-20">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-stone-100">
          <div className="bg-amber-500 p-2 rounded-xl">
             <Utensils className="text-white w-6 h-6" />
          </div>
          <span className="ml-3 font-display font-bold text-xl text-stone-800 hidden md:block tracking-tight">JobCook</span>
        </div>

        <div className="p-4 space-y-2 flex-1">
          <NavButton 
            active={activeMode === CookMode.PANTRY} 
            onClick={() => setActiveMode(CookMode.PANTRY)}
            icon={<ChefHat size={20} />}
            label="Pantry"
            desc="Resume Ingredients"
          />
          <NavButton 
            active={activeMode === CookMode.RECIPE} 
            onClick={() => setActiveMode(CookMode.RECIPE)}
            icon={<FileText size={20} />}
            label="Recipe Book"
            desc="Job & Analysis"
          />
          <NavButton 
            active={activeMode === CookMode.COVER_LETTER} 
            onClick={() => setActiveMode(CookMode.COVER_LETTER)}
            icon={<PenTool size={20} />}
            label="Special Sauce"
            desc="Cook Cover Letter"
          />
        </div>

        <div className="p-4 border-t border-stone-100">
          <div className="bg-amber-50 rounded-xl p-4 hidden md:block">
            <h4 className="font-bold text-amber-900 text-sm">Chef Status</h4>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${chefState.isCooking ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs text-amber-700">{chefState.isCooking ? 'Cooking...' : 'Ready to Cook'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 h-full overflow-hidden relative">
        <div className="max-w-7xl mx-auto h-full transition-all duration-500 ease-in-out">
          {activeMode === CookMode.PANTRY && (
            <Pantry 
              ingredients={chefState.ingredients} 
              setIngredients={(newIngredients) => {
                  if (typeof newIngredients === 'function') {
                      setChefState(prev => ({...prev, ingredients: newIngredients(prev.ingredients)}));
                  } else {
                      setChefState(prev => ({...prev, ingredients: newIngredients}));
                  }
              }} 
              onShowToast={showToast}
            />
          )}
          {activeMode === CookMode.RECIPE && (
            <RecipeBook state={chefState} setState={setChefState} onShowToast={showToast} />
          )}
          {activeMode === CookMode.COVER_LETTER && (
            <CoverLetterStation state={chefState} setState={setChefState} onShowToast={showToast} />
          )}
        </div>
      </main>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, desc }) => (
  <button
    onClick={onClick}
    className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-200 group ${
      active 
        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
        : 'text-stone-500 hover:bg-stone-50 hover:text-amber-600'
    }`}
  >
    <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-amber-100'}`}>
      {icon}
    </div>
    <div className="text-left hidden md:block">
      <p className={`font-bold text-sm ${active ? 'text-white' : 'text-stone-700'}`}>{label}</p>
      <p className={`text-xs ${active ? 'text-amber-100' : 'text-stone-400'}`}>{desc}</p>
    </div>
  </button>
);

export default App;
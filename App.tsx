import React, { useState, useEffect } from 'react';
import { ChefHat, FileText, PenTool, MessageSquare, Menu } from 'lucide-react';
import { Pantry } from './components/Pantry.tsx';
import { RecipeBook } from './components/RecipeBook.tsx';
import { CoverLetterStation } from './components/CoverLetterStation.tsx';
import { TasteTest } from './components/TasteTest.tsx';
import { CookMode, ChefState, ToastMessage, ToastType } from './types.ts';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CookMode>(CookMode.PANTRY);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
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
        interviewHistory: [],
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
        interviewHistory: [],
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
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] font-sans text-slate-800">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3 transform transition-all animate-fadeIn bg-white border-l-4 ${
              toast.type === 'error' ? 'border-red-500' :
              toast.type === 'success' ? 'border-emerald-500' :
              'border-blue-500'
            }`}
          >
             <div className={`w-2 h-2 rounded-full ${
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'success' ? 'bg-emerald-500' :
                'bg-blue-500'
             }`} />
             <p className="text-sm font-medium text-slate-700">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <nav className={`bg-white border-r border-slate-100 flex flex-col flex-shrink-0 transition-all duration-300 z-20 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-50">
          <div className="bg-slate-900 p-2 rounded-lg flex-shrink-0">
             <ChefHat className="text-white w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="ml-3 font-display font-bold text-lg text-slate-800 tracking-tight">JobCook</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="ml-auto text-slate-400 hover:text-slate-600 lg:hidden">
            <Menu size={20} />
          </button>
        </div>

        <div className="p-4 space-y-1 flex-1">
          <NavButton 
            active={activeMode === CookMode.PANTRY} 
            onClick={() => setActiveMode(CookMode.PANTRY)}
            icon={<ChefHat size={20} />}
            label="My Experience"
            expanded={isSidebarOpen}
          />
          <NavButton 
            active={activeMode === CookMode.RECIPE} 
            onClick={() => setActiveMode(CookMode.RECIPE)}
            icon={<FileText size={20} />}
            label="Job Analysis"
            expanded={isSidebarOpen}
          />
          <NavButton 
            active={activeMode === CookMode.COVER_LETTER} 
            onClick={() => setActiveMode(CookMode.COVER_LETTER)}
            icon={<PenTool size={20} />}
            label="Cover Letter"
            expanded={isSidebarOpen}
          />
           <NavButton 
            active={activeMode === CookMode.TASTE_TEST} 
            onClick={() => setActiveMode(CookMode.TASTE_TEST)}
            icon={<MessageSquare size={20} />}
            label="Mock Interview"
            expanded={isSidebarOpen}
          />
        </div>
        
        {isSidebarOpen && (
          <div className="p-6 border-t border-slate-50">
             <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
               <div className="flex items-center gap-2 mb-2">
                 <div className={`w-2 h-2 rounded-full ${chefState.isCooking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Status</span>
               </div>
               <p className="text-sm font-medium text-slate-700">{chefState.isCooking ? 'Chef is busy...' : 'Kitchen Ready'}</p>
             </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative bg-[#F8F9FA]">
        <div className="h-full w-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 md:p-12 min-h-full">
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
            {activeMode === CookMode.TASTE_TEST && (
              <TasteTest state={chefState} setState={setChefState} onShowToast={showToast} />
            )}
          </div>
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
  expanded: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, expanded }) => (
  <button
    onClick={onClick}
    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${
      active 
        ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
        : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
      {icon}
    </div>
    {expanded && <span className="font-medium text-sm">{label}</span>}
  </button>
);

export default App;
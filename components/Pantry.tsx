import React, { useState, useRef, useMemo } from 'react';
import { Ingredient, ToastType } from '../types.ts';
import { parseResume } from '../services/geminiService.ts';
import { Plus, Trash2, ChefHat, Scroll, Award, Briefcase, FileUp, Loader2, X, AlertCircle } from 'lucide-react';

interface PantryProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const Pantry: React.FC<PantryProps> = ({ ingredients, setIngredients, onShowToast }) => {
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    category: 'skill',
    name: '',
    details: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addIngredient = () => {
    if (!newIngredient.name) return;
    const item: Ingredient = {
      id: Date.now().toString(),
      name: newIngredient.name,
      category: newIngredient.category as any,
      details: newIngredient.details
    };
    setIngredients([...ingredients, item]);
    setNewIngredient({ ...newIngredient, name: '', details: '' });
    onShowToast("Ingredient added to pantry!", "success");
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };
  
  const handleClearClick = () => {
    if (isConfirmingClear) {
      setIngredients([]);
      setIsConfirmingClear(false);
      onShowToast("Pantry cleared.", "info");
    } else {
      setIsConfirmingClear(true);
      // Auto-reset confirmation state after 3 seconds
      setTimeout(() => setIsConfirmingClear(false), 3000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast("File is too large. Please upload a document under 5MB.", "error");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    onShowToast("Unpacking groceries... (Parsing resume)", "info");
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const extractedIngredients = await parseResume(base64Data, file.type);
          
          if (extractedIngredients.length === 0) {
            onShowToast("Couldn't find any ingredients in that file. Is it empty?", "error");
          } else {
            setIngredients(prev => [...prev, ...extractedIngredients]);
            onShowToast(`Successfully stocked ${extractedIngredients.length} ingredients!`, "success");
          }
        } catch (innerErr: any) {
          onShowToast(innerErr.message || "Failed to parse resume content.", "error");
        } finally {
           setIsUploading(false);
        }
      };
      reader.onerror = () => {
        onShowToast("Error reading file from disk.", "error");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast(err.message || "Error processing upload.", "error");
      setIsUploading(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const groupedIngredients = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {
      skill: [],
      experience: [],
      education: [],
      certification: []
    };
    ingredients.forEach(i => {
      if (groups[i.category]) groups[i.category].push(i);
    });
    return groups;
  }, [ingredients]);

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'skill': return { icon: <ChefHat className="w-5 h-5 text-amber-600" />, label: 'Skills', color: 'bg-amber-50 border-amber-200' };
      case 'experience': return { icon: <Briefcase className="w-5 h-5 text-orange-600" />, label: 'Experience', color: 'bg-orange-50 border-orange-200' };
      case 'education': return { icon: <Scroll className="w-5 h-5 text-blue-600" />, label: 'Education', color: 'bg-blue-50 border-blue-200' };
      default: return { icon: <Award className="w-5 h-5 text-green-600" />, label: 'Certifications', color: 'bg-green-50 border-green-200' };
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-amber-100 flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shrink-0 flex justify-between items-center shadow-md z-10">
        <div>
          <h2 className="text-3xl font-display font-bold flex items-center gap-3">
            <ChefHat size={32} className="drop-shadow-sm" />
            The Pantry
          </h2>
          <p className="text-amber-100 mt-1 text-sm font-medium">Stock your shelves with your raw career ingredients.</p>
        </div>
        
        <div className="flex gap-2">
          {ingredients.length > 0 && (
             <button 
              onClick={handleClearClick}
              type="button"
              className={`backdrop-blur-sm border font-bold p-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                isConfirmingClear 
                  ? 'bg-red-500 border-red-400 text-white w-auto px-4' 
                  : 'bg-white/20 hover:bg-red-500/80 hover:border-red-400 border-white/40 text-white'
              }`}
              title={isConfirmingClear ? "Confirm Delete" : "Clear Pantry"}
            >
              {isConfirmingClear ? <AlertCircle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              {isConfirmingClear && <span>Sure?</span>}
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.docx,.txt" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            type="button"
            className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white backdrop-blur-sm border border-white/40 font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isUploading ? <Loader2 className="animate-spin w-5 h-5" /> : <FileUp className="w-5 h-5" />}
            {isUploading ? 'Stocking...' : 'Import Resume'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
        {/* Input Form */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm mb-8 transition-shadow hover:shadow-md">
          <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 bg-amber-100 rounded-full p-0.5 text-amber-600" />
            Add Ingredient Manually
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <select 
                className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                value={newIngredient.category}
                onChange={(e) => setNewIngredient({...newIngredient, category: e.target.value as any})}
              >
                <option value="skill">Skill</option>
                <option value="experience">Experience</option>
                <option value="education">Education</option>
                <option value="certification">Certification</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <input 
                type="text" 
                placeholder="Name (e.g., React, Google)" 
                className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
              />
            </div>
             <div className="md:col-span-4">
              <input 
                type="text" 
                placeholder="Details (e.g., 5 years, Senior Dev)" 
                className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                value={newIngredient.details}
                onChange={(e) => setNewIngredient({...newIngredient, details: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              />
            </div>
            <div className="md:col-span-1">
              <button 
                onClick={addIngredient}
                disabled={!newIngredient.name}
                type="button"
                className="w-full h-full min-h-[46px] flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md active:shadow-sm"
              >
                <Plus strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Grouped Ingredients List */}
        {ingredients.length === 0 ? (
          <div className="text-center py-16 text-stone-400 bg-white rounded-2xl border border-stone-200 border-dashed">
            <ChefHat className="w-20 h-20 mx-auto mb-4 opacity-20 text-stone-500" />
            <h3 className="text-xl font-display font-bold text-stone-500">Your pantry is empty</h3>
            <p className="mt-2 text-stone-400">Add some skills manually or import your resume to start cooking!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            {(['skill', 'experience', 'education', 'certification'] as const).map(category => {
              const items = groupedIngredients[category];
              if (items.length === 0) return null;
              const meta = getCategoryMeta(category);
              
              return (
                <div key={category} className={`rounded-2xl border ${meta.color} bg-white overflow-hidden shadow-sm h-fit animate-slideUp`}>
                  <div className={`px-4 py-3 flex items-center gap-2 border-b ${meta.color.split(' ')[1]} bg-opacity-30 bg-stone-50`}>
                    {meta.icon}
                    <h4 className="font-bold text-stone-700 capitalize">{meta.label}</h4>
                    <span className="ml-auto bg-stone-100 text-stone-500 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {items.map(ing => (
                      <div key={ing.id} className="group flex items-start justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors">
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-800 text-sm truncate">{ing.name}</p>
                          {ing.details && <p className="text-xs text-stone-500 truncate">{ing.details}</p>}
                        </div>
                        <button 
                          onClick={() => removeIngredient(ing.id)}
                          type="button"
                          className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
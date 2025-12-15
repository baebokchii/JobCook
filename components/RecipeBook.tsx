import React, { useRef, useState } from 'react';
import { ChefState, ToastType } from '../types.ts';
import { analyzeDish, researchCompany, extractJobDescriptionFromImage } from '../services/geminiService.ts';
import { Search, Flame, FileText, CheckCircle, AlertTriangle, PieChart, Store, ExternalLink, UtensilsCrossed, TrendingUp, Info, Trash2, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RecipeBookProps {
  state: ChefState;
  setState: React.Dispatch<React.SetStateAction<ChefState>>;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const RecipeBook: React.FC<RecipeBookProps> = ({ state, setState, onShowToast }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!state.currentRecipe || state.ingredients.length === 0) return;
    
    setState(prev => ({ ...prev, isCooking: true }));
    onShowToast("The chef is analyzing your recipe...", "info");

    try {
      const analysis = await analyzeDish(state.ingredients, state.currentRecipe);
      
      let companyResearch = null;
      if (analysis.companyName && analysis.companyName !== 'Unknown Company') {
          setState(prev => ({ ...prev, companyName: analysis.companyName }));
          companyResearch = await researchCompany(analysis.companyName, state.ingredients);
      }

      setState(prev => ({ 
        ...prev, 
        analysis, 
        companyResearch,
        companyName: analysis.companyName,
        isCooking: false 
      }));
      onShowToast("Analysis complete!", "success");

    } catch (e: any) {
      console.error(e);
      onShowToast(e.message || "Failed to analyze the recipe.", "error");
      setState(prev => ({ ...prev, isCooking: false }));
    }
  };

  const handleClear = () => {
    setState(prev => ({
      ...prev,
      currentRecipe: '',
      companyName: '',
      analysis: null,
      companyResearch: null
    }));
    onShowToast("Recipe book cleared.", "info");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast("Image is too large. Please upload under 5MB.", "error");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsExtracting(true);
    onShowToast("Scanning recipe...", "info");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            const text = await extractJobDescriptionFromImage(base64Data, file.type);
            if (!text) throw new Error("Could not read text from image.");
            
            setState(prev => ({ ...prev, currentRecipe: text }));
            onShowToast("Recipe extracted successfully!", "success");
        } catch (innerErr: any) {
            onShowToast(innerErr.message || "Failed to read image text.", "error");
        } finally {
            setIsExtracting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast(err.message || "OCR failed.", "error");
      setIsExtracting(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', label: 'Excellent Match' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', label: 'Good Potential' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', label: 'Needs Improvement' };
  };

  const matchColors = state.analysis ? getMatchColor(state.analysis.matchScore) : null;

  return (
    <div className="flex flex-col h-full animate-fadeIn pb-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-slate-800">Job Analysis</h1>
        <p className="text-slate-500 mt-1">Paste a job description to check your fit and research the company.</p>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Input Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <UtensilsCrossed size={16} />
                    Target Job Description
                </label>
                <div className="flex gap-2">
                   {!state.currentRecipe ? (
                       <>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting}
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 transition-all"
                        >
                            {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                            {isExtracting ? 'Scanning...' : 'Upload Image'}
                        </button>
                       </>
                   ) : (
                       <button 
                        onClick={handleClear}
                        className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                        <Trash2 size={14} />
                        Clear
                        </button>
                   )}
                </div>
            </div>

            <textarea
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-all resize-none text-slate-700 font-medium text-sm leading-relaxed mb-4 placeholder-slate-400"
                placeholder="Paste the full job description here..."
                value={state.currentRecipe}
                onChange={(e) => setState({ ...state, currentRecipe: e.target.value })}
            />

            <button
              onClick={handleAnalyze}
              disabled={state.isCooking || !state.currentRecipe || state.ingredients.length === 0 || isExtracting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-200"
            >
              {state.isCooking ? <Loader2 className="animate-spin" /> : <Search size={18} />}
              <span>{state.isCooking ? 'Analyzing...' : 'Analyze Match'}</span>
            </button>
        </div>

        {/* Results Section */}
        {(state.analysis || state.companyResearch) && (
            <div className="space-y-6 animate-slideUp">
              
              {/* Match Overview Grid */}
              {state.analysis && matchColors && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Score Card */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-6">Match Score</h3>
                        
                        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                                <circle 
                                    cx="80" cy="80" r="70" 
                                    stroke="currentColor" strokeWidth="12" fill="transparent" 
                                    className={`${matchColors.text} transition-all duration-1000 ease-out`}
                                    strokeDasharray={439.8}
                                    strokeDashoffset={439.8 - (439.8 * state.analysis.matchScore) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-display font-bold text-slate-800">{state.analysis.matchScore}%</span>
                            </div>
                        </div>

                        <div className={`px-3 py-1.5 rounded-full font-bold text-xs ${matchColors.bg} ${matchColors.text} flex items-center gap-1.5`}>
                            <TrendingUp size={14} />
                            {matchColors.label}
                        </div>
                    </div>

                    {/* Taste Profile Card */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                            <UtensilsCrossed size={14} />
                            Analysis Summary
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-lg flex-1">
                            "{state.analysis.tasteProfile}"
                        </p>
                    </div>
                </div>
              )}

              {/* Details Grid */}
              {state.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Missing Ingredients */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <AlertTriangle size={18} className="text-amber-500" /> 
                            Missing Requirements
                        </h4>
                        <div className="space-y-3">
                            {state.analysis.missingIngredients.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 leading-snug">{item}</span>
                                </div>
                            ))}
                            {state.analysis.missingIngredients.length === 0 && (
                                <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-lg">
                                  No missing requirements found!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chef Tips */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <CheckCircle size={18} className="text-emerald-500" /> 
                            Optimization Tips
                        </h4>
                        <div className="space-y-3">
                            {state.analysis.chefTips.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}

              {/* Company Research */}
              {state.companyResearch && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <Store size={18} className="text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Company Intelligence</h3>
                                <p className="text-xs text-slate-500">{state.companyName || 'Establishment Review'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8 prose prose-slate max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-slate-600 prose-li:text-slate-600">
                       <ReactMarkdown>{state.companyResearch.summary}</ReactMarkdown>
                    </div>

                    {/* Sources */}
                    {state.companyResearch.sources.length > 0 && (
                      <div className="bg-slate-50 p-4 border-t border-slate-100">
                         <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                            <Info size={12} />
                            <span>Sources</span>
                         </div>
                        <div className="flex flex-wrap gap-2">
                          {state.companyResearch.sources.map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                            >
                              <ExternalLink size={12} />
                              <span className="truncate max-w-[200px] font-medium">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
};
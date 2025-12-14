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
      // Step 1: Analyze the dish first to get the company name
      const analysis = await analyzeDish(state.ingredients, state.currentRecipe);
      
      let companyResearch = null;
      // Step 2: If company name is found, research it
      if (analysis.companyName && analysis.companyName !== 'Unknown Company') {
          // Update state immediately with the company name so user sees progress or result
          setState(prev => ({ ...prev, companyName: analysis.companyName }));
          // Pass ingredients for personalized research
          companyResearch = await researchCompany(analysis.companyName, state.ingredients);
      }

      setState(prev => ({ 
        ...prev, 
        analysis, 
        companyResearch,
        companyName: analysis.companyName, // Ensure extracted name persists
        isCooking: false 
      }));
      onShowToast("Analysis complete! Order up!", "success");

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
    onShowToast("Scanning recipe... (Extracting text)", "info");

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
      reader.onerror = () => {
          onShowToast("Error reading file.", "error");
          setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Error extracting text from image", err);
      onShowToast(err.message || "OCR failed.", "error");
      setIsExtracting(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return { stroke: 'text-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Chef\'s Kiss!' };
    if (score >= 60) return { stroke: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Good Potential' };
    return { stroke: 'text-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Needs Prep' };
  };

  const matchColors = state.analysis ? getMatchColor(state.analysis.matchScore) : null;

  return (
    <div className="bg-stone-50 rounded-3xl shadow-xl overflow-hidden border-2 border-stone-200 flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 border-b border-stone-200 shrink-0 z-10">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-display font-bold flex items-center gap-3 text-stone-800">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                    <FileText size={24} />
                </div>
                Recipe Book
                </h2>
                <p className="text-stone-500 mt-1 text-sm font-medium ml-1">Analyze job descriptions and research companies.</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Input Section */}
        <div className="p-6 md:p-8 shrink-0 space-y-6 bg-white border-b border-stone-200">
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />

            {/* Input Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                 <div className="space-y-1">
                    <label className="text-lg font-bold text-stone-700 flex items-center gap-2">
                        <UtensilsCrossed size={20} className="text-orange-500"/>
                        Target Recipe
                    </label>
                    <p className="text-sm text-stone-400">Paste the job description or upload a screenshot to begin.</p>
                </div>

                <div className="flex gap-2">
                   {!state.currentRecipe ? (
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting}
                            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl transition-all font-semibold border border-stone-200 shadow-sm"
                        >
                            {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                            {isExtracting ? 'Scanning...' : 'Upload Screenshot'}
                        </button>
                   ) : (
                       <button 
                        onClick={handleClear}
                        className="text-sm font-bold text-stone-500 hover:text-red-600 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-stone-200 hover:border-red-200 transition-all shadow-sm"
                        >
                        <Trash2 size={16} />
                        Clear Recipe
                        </button>
                   )}
                </div>
            </div>

            {/* Main Input Area */}
            <div className="relative group">
                 {!state.currentRecipe && !isExtracting && (
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-stone-50/50 rounded-xl z-10"
                   >
                       <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                         <UploadCloud className="text-stone-300 w-8 h-8" />
                       </div>
                       <p className="text-stone-400 font-medium">Paste text here or <span className="text-orange-500 font-bold">Upload Image</span></p>
                   </div>
                 )}
                 
                 <textarea
                    className="w-full h-48 p-6 rounded-2xl border-2 border-stone-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all outline-none bg-stone-50 focus:bg-white shadow-inner font-mono text-sm leading-relaxed"
                    placeholder=""
                    value={state.currentRecipe}
                    onChange={(e) => setState({ ...state, currentRecipe: e.target.value })}
                />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={state.isCooking || !state.currentRecipe || state.ingredients.length === 0 || isExtracting}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
            >
              {state.isCooking ? <Flame className="animate-bounce" /> : <Search />}
              <span className="text-lg">{state.isCooking ? 'Cooking in Progress...' : 'Analyze Recipe'}</span>
            </button>
        </div>

        {/* Results Section */}
        {(state.analysis || state.companyResearch) && (
            <div className="p-6 md:p-8 space-y-6 bg-stone-50 animate-slideUp">
              
              {/* Analysis Grid */}
              {state.analysis && matchColors && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Card 1: Match Score (Left Column) */}
                      <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-md transition-shadow">
                          <div className={`absolute top-0 left-0 w-full h-1.5 ${matchColors.bg.replace('bg-', 'bg-opacity-100 bg-')}`}></div>
                          <div className="flex items-center gap-2 mb-6">
                            <PieChart size={18} className="text-stone-400" />
                            <h3 className="text-stone-500 font-bold uppercase text-xs tracking-wider">Match Score</h3>
                          </div>
                          
                          <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                              <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 160 160">
                                  <circle cx="80" cy="80" r="70" stroke="#f5f5f4" strokeWidth="12" fill="transparent" />
                                  <circle 
                                      cx="80" cy="80" r="70" 
                                      stroke="currentColor" strokeWidth="12" fill="transparent" 
                                      className={`${matchColors.stroke} transition-all duration-1000 ease-out`}
                                      strokeDasharray={439.8}
                                      strokeDashoffset={439.8 - (439.8 * state.analysis.matchScore) / 100}
                                      strokeLinecap="round"
                                  />
                              </svg>
                              <div className="absolute flex flex-col items-center">
                                  <span className="text-4xl font-display font-bold text-stone-800">{state.analysis.matchScore}%</span>
                              </div>
                          </div>

                          <div className={`px-4 py-2 rounded-full font-bold text-sm border ${matchColors.bg} ${matchColors.border} ${matchColors.text} flex items-center gap-2`}>
                              <TrendingUp size={14} />
                              {matchColors.label}
                          </div>
                      </div>

                      {/* Card 2: Taste Profile (Right Column - Spans 2) */}
                      <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-100">
                              <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                  <UtensilsCrossed size={20} />
                              </div>
                              <h3 className="text-xl font-bold text-stone-800">Taste Profile</h3>
                           </div>
                           <div className="flex-1 text-stone-600 leading-relaxed text-lg">
                              {state.analysis.tasteProfile}
                           </div>
                      </div>
                  </div>

                  {/* Card 3 & 4: Missing & Tips */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden transition-all hover:border-red-200">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <AlertTriangle size={100} className="text-red-900" />
                        </div>
                        <h4 className="font-bold text-red-900 flex items-center gap-2 mb-6 text-lg">
                            <div className="p-1.5 bg-red-100 rounded-md">
                              <AlertTriangle size={18} className="text-red-600" /> 
                            </div>
                            Missing Ingredients
                        </h4>
                        <ul className="space-y-3">
                            {state.analysis.missingIngredients.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-red-800 bg-red-50/50 p-3 rounded-xl border border-red-50">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    <span className="font-medium leading-snug">{item}</span>
                                </li>
                            ))}
                            {state.analysis.missingIngredients.length === 0 && (
                                <li className="text-stone-500 italic p-3 flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  No missing ingredients! Perfect match.
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden transition-all hover:border-amber-200">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <CheckCircle size={100} className="text-amber-900" />
                        </div>
                        <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-6 text-lg">
                            <div className="p-1.5 bg-amber-100 rounded-md">
                              <CheckCircle size={18} className="text-amber-600" /> 
                            </div>
                            Chef's Tips
                        </h4>
                        <ul className="space-y-3">
                            {state.analysis.chefTips.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-amber-900 bg-amber-50/50 p-3 rounded-xl border border-amber-50">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span className="font-medium leading-snug">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Company Research (Full Width) */}
              {state.companyResearch && (
                 <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden mt-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 border-b border-blue-100 flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
                          <Store size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-blue-900">
                              Establishment Review
                              {state.companyName && <span className="ml-2 text-blue-700 font-normal">({state.companyName})</span>}
                          </h3>
                          <p className="text-blue-600/80 text-xs font-semibold uppercase tracking-wider">Company Intelligence</p>
                        </div>
                    </div>
                    
                    <div className="p-8 prose prose-blue prose-headings:font-display prose-headings:font-bold prose-p:text-stone-600 max-w-none">
                       <ReactMarkdown>{state.companyResearch.summary}</ReactMarkdown>
                    </div>

                    {/* Sources */}
                    {state.companyResearch.sources.length > 0 && (
                      <div className="bg-stone-50 p-4 border-t border-stone-100 flex flex-col gap-2">
                         <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-wider px-1">
                            <Info size={12} />
                            <span>Menu Sources</span>
                         </div>
                        <div className="flex flex-wrap gap-2">
                          {state.companyResearch.sources.map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group flex items-center gap-2 text-xs bg-white border border-stone-200 px-3 py-2 rounded-lg text-stone-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                            >
                              <ExternalLink size={12} className="text-stone-300 group-hover:text-blue-500" />
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
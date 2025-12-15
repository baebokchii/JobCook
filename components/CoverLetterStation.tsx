import React, { useState, useRef } from 'react';
import { ChefState, ToastType } from '../types.ts';
import { cookCoverLetter, extractJobDescriptionFromImage } from '../services/geminiService.ts';
import { Flame, PenTool, Copy, Check, Sparkles, Pencil, Eye, RefreshCw, Trash2, ImagePlus, Loader2, UploadCloud, UtensilsCrossed, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CoverLetterStationProps {
  state: ChefState;
  setState: React.Dispatch<React.SetStateAction<ChefState>>;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const CoverLetterStation: React.FC<CoverLetterStationProps> = ({ state, setState, onShowToast }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCookLetter = async () => {
    if (!state.currentRecipe) return;
    setState(prev => ({ ...prev, isCooking: true }));
    onShowToast("Writing cover letter...", "info");

    try {
      const letter = await cookCoverLetter(state.ingredients, state.currentRecipe);
      setState(prev => ({ ...prev, generatedCoverLetter: letter, isCooking: false }));
      setIsEditing(false);
      onShowToast("Cover letter ready!", "success");
    } catch (e: any) {
      console.error(e);
      onShowToast(e.message || "Generation failed.", "error");
      setState(prev => ({ ...prev, isCooking: false }));
    }
  };

  const handleCopy = () => {
    if (state.generatedCoverLetter) {
      navigator.clipboard.writeText(state.generatedCoverLetter);
      setCopied(true);
      onShowToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleClear = () => {
    setState(prev => ({
      ...prev,
      currentRecipe: '',
      generatedCoverLetter: null
    }));
    setCopied(false);
    setIsEditing(false);
    onShowToast("Station cleared.", "info");
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
    onShowToast("Reading text...", "info");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            const text = await extractJobDescriptionFromImage(base64Data, file.type);
            if (!text) throw new Error("Could not extract text.");

            setState(prev => ({ ...prev, currentRecipe: text }));
            onShowToast("Job description captured.", "success");
        } catch (innerErr: any) {
            onShowToast(innerErr.message || "Failed to parse image.", "error");
        } finally {
            setIsExtracting(false);
        }
      };
      reader.onerror = () => {
          setIsExtracting(false);
          onShowToast("Error reading file.", "error");
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast(err.message || "OCR failed.", "error");
      setIsExtracting(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn pb-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-slate-800">Cover Letter</h1>
        <p className="text-slate-500 mt-1">Generate a professional, personalized cover letter based on your experience.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Left Column: Input */}
        <div className="flex flex-col gap-6">
             <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <UtensilsCrossed size={16} />
                        Job Description
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
                                {isExtracting ? 'Scanning...' : 'Upload'}
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

                <div className="relative flex-1 mb-4">
                     {!state.currentRecipe && !isExtracting && (
                       <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-slate-50/50 rounded-xl z-10 border-2 border-dashed border-slate-200"
                       >
                           <div className="bg-white p-3 rounded-full shadow-sm mb-2 border border-slate-100">
                             <UploadCloud className="text-slate-400 w-6 h-6" />
                           </div>
                           <p className="text-slate-400 font-medium text-sm">Paste text or upload image</p>
                       </div>
                     )}
                     
                  <textarea
                    className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-all resize-none text-slate-700 font-medium text-sm leading-relaxed"
                    placeholder="Paste job description here..."
                    value={state.currentRecipe}
                    onChange={(e) => setState({ ...state, currentRecipe: e.target.value })}
                  />
                </div>

                <button
                    onClick={handleCookLetter}
                    disabled={state.isCooking || !state.currentRecipe || state.ingredients.length === 0 || isExtracting}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-200"
                  >
                    {state.isCooking ? <Loader2 className="animate-spin" /> : <PenTool size={18} />}
                    <span className="text-lg">{state.isCooking ? 'Generating...' : 'Generate Letter'}</span>
                  </button>
             </div>
        </div>

        {/* Right Column: Result */}
        <div className="flex flex-col h-full min-h-[500px]">
           {state.generatedCoverLetter ? (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden animate-slideUp">
                 {/* Toolbar */}
                 <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-2 px-2">
                        <FileText size={16} className="text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">Draft.md</span>
                     </div>
                     <div className="flex gap-1">
                      <button 
                        onClick={handleCookLetter}
                        disabled={state.isCooking}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-800 transition-all"
                        title="Regenerate"
                      >
                        <RefreshCw size={16} className={state.isCooking ? "animate-spin" : ""} />
                      </button>
                      <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all ${isEditing ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Toggle Edit"
                      >
                        {isEditing ? <Eye size={16} /> : <Pencil size={16} />}
                      </button>
                      <button 
                        onClick={handleCopy}
                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 hover:text-emerald-600 transition-all"
                        title="Copy"
                      >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                 </div>
                 
                 {/* Document View */}
                 <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                    <div className="bg-white shadow-sm border border-slate-100 min-h-full p-8 md:p-10 mx-auto max-w-[650px]">
                       {isEditing ? (
                          <textarea
                            className="w-full h-full text-slate-800 font-serif text-base leading-relaxed resize-none focus:outline-none bg-transparent"
                            value={state.generatedCoverLetter}
                            onChange={(e) => setState(prev => ({ ...prev, generatedCoverLetter: e.target.value }))}
                            spellCheck={false}
                          />
                       ) : (
                          <div className="prose prose-slate max-w-none font-serif prose-p:leading-loose">
                            <ReactMarkdown>{state.generatedCoverLetter}</ReactMarkdown>
                          </div>
                       )}
                    </div>
                 </div>
             </div>
           ) : (
              <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                     <FileText size={32} className="text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-600 text-lg">No Letter Generated Yet</h3>
                  <p className="max-w-xs mt-2 text-sm">Upload a job description and click generate to create your custom cover letter.</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
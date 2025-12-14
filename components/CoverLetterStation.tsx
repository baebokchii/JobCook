import React, { useState, useRef } from 'react';
import { ChefState, ToastType } from '../types.ts';
import { cookCoverLetter, extractJobDescriptionFromImage } from '../services/geminiService.ts';
import { Flame, PenTool, Copy, Check, Sparkles, Pencil, Eye, RefreshCw, Trash2, ImagePlus, Loader2, UploadCloud, UtensilsCrossed } from 'lucide-react';
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
    onShowToast("Firing up the grill... (Writing letter)", "info");

    try {
      const letter = await cookCoverLetter(state.ingredients, state.currentRecipe);
      setState(prev => ({ ...prev, generatedCoverLetter: letter, isCooking: false }));
      setIsEditing(false); // Reset to preview mode on new generation
      onShowToast("Special Sauce ready!", "success");
    } catch (e: any) {
      console.error(e);
      onShowToast(e.message || "The chef burned the sauce (Generation failed).", "error");
      setState(prev => ({ ...prev, isCooking: false }));
    }
  };

  const handleCopy = () => {
    if (state.generatedCoverLetter) {
      navigator.clipboard.writeText(state.generatedCoverLetter);
      setCopied(true);
      onShowToast("Cover letter copied to clipboard", "success");
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
    onShowToast("Reading the order ticket...", "info");

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
      console.error("Error extracting text from image", err);
      onShowToast(err.message || "OCR failed.", "error");
      setIsExtracting(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-stone-50 rounded-3xl shadow-xl overflow-hidden border-2 border-stone-200 flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-6 border-b border-stone-200 shrink-0 z-10">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-display font-bold flex items-center gap-3 text-stone-800">
                <div className="bg-red-100 p-2 rounded-xl text-red-600">
                    <PenTool size={24} />
                </div>
                Special Sauce
                </h2>
                <p className="text-stone-500 mt-1 text-sm font-medium ml-1">Cook up a custom cover letter based on your ingredients.</p>
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
                      <UtensilsCrossed size={20} className="text-red-500"/>
                      The Order <span className="text-stone-400 font-normal text-sm">(Job Description)</span>
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
                      Clear Order
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
                     <p className="text-stone-400 font-medium">Paste text here or <span className="text-red-500 font-bold">Upload Image</span></p>
                 </div>
               )}
               
            <textarea
              className="w-full h-48 p-6 rounded-2xl border-2 border-stone-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-none transition-all outline-none bg-stone-50 focus:bg-white shadow-inner font-mono text-sm leading-relaxed"
              placeholder=""
              value={state.currentRecipe}
              onChange={(e) => setState({ ...state, currentRecipe: e.target.value })}
            />
          </div>

          <button
              onClick={handleCookLetter}
              disabled={state.isCooking || !state.currentRecipe || state.ingredients.length === 0 || isExtracting}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-stone-300 disabled:to-stone-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
            >
              {state.isCooking ? <Flame className="animate-bounce" /> : <PenTool />}
              <span className="text-lg">{state.isCooking ? 'Simmering...' : 'Cook Cover Letter'}</span>
            </button>
        </div>

        {/* Results Section */}
        {state.generatedCoverLetter && (
           <div className="flex-1 p-6 md:p-8 bg-stone-50 animate-slideUp">
               <div className="bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col overflow-hidden h-full">
                   {/* Result Header */}
                   <div className="bg-white border-b border-stone-100 p-4 md:p-6 flex items-center justify-between">
                       <div className="flex items-center gap-3 text-red-600">
                            <div className="bg-red-50 p-2 rounded-lg">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold uppercase tracking-wide text-stone-800">Your Special Sauce</h3>
                       </div>
                       
                       <div className="flex gap-2">
                        <button 
                          onClick={handleCookLetter}
                          disabled={state.isCooking}
                          className="bg-stone-50 border border-stone-200 p-2 rounded-lg shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-stone-500 hover:text-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generate Again"
                        >
                          <RefreshCw size={18} className={state.isCooking ? "animate-spin" : ""} />
                        </button>
                        <button 
                          onClick={() => setIsEditing(!isEditing)}
                          className="bg-stone-50 border border-stone-200 p-2 rounded-lg shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-stone-500 hover:text-blue-600"
                          title={isEditing ? "Preview Mode" : "Edit Letter"}
                        >
                          {isEditing ? <Eye size={18} /> : <Pencil size={18} />}
                        </button>
                        <button 
                          onClick={handleCopy}
                          className="bg-stone-50 border border-stone-200 p-2 rounded-lg shadow-sm hover:shadow-md hover:border-green-200 transition-all text-stone-500 hover:text-green-600"
                          title="Copy to Clipboard"
                        >
                          {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      </div>
                   </div>
                   
                   {/* Content */}
                   {isEditing ? (
                      <textarea
                        className="w-full flex-1 bg-white p-6 md:p-8 text-stone-700 font-sans text-base leading-relaxed resize-none focus:outline-none focus:bg-stone-50 transition-all"
                        value={state.generatedCoverLetter}
                        onChange={(e) => setState(prev => ({ ...prev, generatedCoverLetter: e.target.value }))}
                        spellCheck={false}
                      />
                   ) : (
                      <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto prose prose-amber max-w-none">
                        <ReactMarkdown>{state.generatedCoverLetter}</ReactMarkdown>
                      </div>
                   )}
               </div>
           </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useRef, useMemo } from 'react';
import { Ingredient, ToastType } from '../types.ts';
import { refineDescription, parseResume } from '../services/geminiService.ts';
import { Plus, Trash2, FileUp, Loader2, X, Calendar, Sparkles, Wand2, ArrowRight, Edit3 } from 'lucide-react';

interface PantryProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const Pantry: React.FC<PantryProps> = ({ ingredients, setIngredients, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Ingredient>>({
    category: 'experience',
    name: '',
    details: ''
  });

  // AI & Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancements, setEnhancements] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Actions ---

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ category: 'experience', name: '', details: '' });
    setEnhancements([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Ingredient) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setEnhancements([]);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
        onShowToast("Please give this ingredient a name.", "error");
        return;
    }

    if (editingId) {
        // Update existing
        setIngredients(prev => prev.map(i => i.id === editingId ? { ...i, ...formData } as Ingredient : i));
        onShowToast("Experience updated successfully!", "success");
    } else {
        // Add new
        const newItem: Ingredient = {
            id: Date.now().toString(),
            name: formData.name!,
            category: formData.category as any,
            details: formData.details
        };
        setIngredients(prev => [...prev, newItem]);
        onShowToast("Experience added to pantry!", "success");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIngredients(ingredients.filter(i => i.id !== id));
    onShowToast("Removed from pantry.", "info");
  };

  const handleEnhance = async () => {
    if (!formData.details || formData.details.length < 5) {
        onShowToast("Please enter some details first to enhance.", "error");
        return;
    }
    
    setIsEnhancing(true);
    setEnhancements([]);
    try {
        const variations = await refineDescription(formData.details, formData.category || 'experience');
        setEnhancements(variations);
    } catch (e) {
        onShowToast("Could not enhance text right now.", "error");
    } finally {
        setIsEnhancing(false);
    }
  };

  const applyEnhancement = (text: string) => {
      setFormData({ ...formData, details: text });
      setEnhancements([]); 
      onShowToast("Applied enhanced description!", "success");
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
    onShowToast("Analyzing resume ingredients...", "info");
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          const extractedIngredients = await parseResume(base64Data, file.type);
          
          if (extractedIngredients.length === 0) {
            onShowToast("Couldn't extract data. Is the file empty?", "error");
          } else {
            setIngredients(prev => [...prev, ...extractedIngredients]);
            onShowToast(`Imported ${extractedIngredients.length} items!`, "success");
          }
        } catch (innerErr: any) {
          onShowToast(innerErr.message || "Failed to parse resume.", "error");
        } finally {
           setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onShowToast("Error processing upload.", "error");
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Filtering & Styling ---

  // Order of categories: Education -> Experience (Intern) -> Project -> Certification -> Skill
  const sortOrder: Record<string, number> = {
    'education': 0,
    'experience': 1,
    'project': 2,
    'certification': 3,
    'skill': 4
  };

  const filteredIngredients = useMemo(() => {
    let result = ingredients;
    if (activeTab !== 'all') {
      result = ingredients.filter(i => i.category === activeTab);
    }
    // Sort items based on the defined Category order
    return result.sort((a, b) => {
      const orderA = sortOrder[a.category] ?? 99;
      const orderB = sortOrder[b.category] ?? 99;
      return orderA - orderB;
    });
  }, [ingredients, activeTab]);

  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case 'education': return { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Education' };
      case 'experience': return { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', label: 'Intern/Work' };
      case 'project': return { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Project' };
      case 'certification': return { dot: 'bg-pink-500', text: 'text-pink-600', bg: 'bg-pink-50', label: 'Cert/Award' };
      default: return { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Skill' };
    }
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* 1. Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-800">My Pantry</h1>
        <p className="text-slate-500 mt-1">Stock up on your skills and experiences. Click any item to refine it with AI.</p>
        
        {/* Simple Stats & Actions */}
        <div className="mt-6 flex items-center justify-between border-b border-slate-200 pb-4">
           <div className="flex items-baseline gap-2">
             <span className="text-3xl font-bold text-slate-800">{ingredients.length}</span>
             <span className="text-sm font-medium text-slate-500">Ingredients Available</span>
           </div>
           
           <div className="flex gap-3">
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
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:border-slate-300 transition-all"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                {isUploading ? 'Restocking...' : 'Import Resume'}
              </button>
           </div>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex items-center gap-8 mb-6 overflow-x-auto no-scrollbar">
         {[
           { id: 'all', label: 'View All' },
           { id: 'education', label: 'Education' },
           { id: 'experience', label: 'Intern/Work' },
           { id: 'project', label: 'Projects' },
           { id: 'certification', label: 'Certifications' },
           { id: 'skill', label: 'Skills' }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`pb-2 text-sm font-bold transition-all whitespace-nowrap ${
               activeTab === tab.id 
                 ? 'text-slate-800 border-b-2 border-slate-800' 
                 : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             {tab.label}
           </button>
         ))}
      </div>

      {/* 3. Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        
        {/* Add New Card */}
        <button 
          onClick={handleOpenAdd}
          className="min-h-[200px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
             <Plus size={24} />
          </div>
          <span className="font-medium">Add New Ingredient</span>
        </button>

        {/* Ingredient Cards */}
        {filteredIngredients.map(item => {
          const style = getCategoryStyle(item.category);

          return (
            <div 
                key={item.id} 
                onClick={() => handleOpenEdit(item)}
                className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col relative group"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`text-xs font-bold ${style.text}`}>{style.label}</span>
                 </div>
                 <button 
                    onClick={(e) => handleDelete(item.id, e)} 
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Remove"
                 >
                    <Trash2 size={16} />
                 </button>
              </div>

              {/* Card Content */}
              <div className="flex-1 mb-4">
                 <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 line-clamp-2">{item.name}</h3>
                 <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                   {item.details || "No details provided."}
                 </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-auto">
                 <div className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Edit3 size={12} />
                    <span>Click to edit</span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slideUp flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-lg text-slate-800">
                   {editingId ? 'Edit Ingredient' : 'New Ingredient'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-6 space-y-5 overflow-y-auto">
                {/* Category Selection */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                   <div className="grid grid-cols-5 gap-2">
                      {['education', 'experience', 'project', 'certification', 'skill'].map(cat => (
                         <button
                           key={cat}
                           onClick={() => setFormData({...formData, category: cat as any})}
                           className={`text-xs font-bold py-2 px-1 rounded-lg border transition-all text-center capitalize ${
                             formData.category === cat 
                               ? 'bg-slate-800 text-white border-slate-800' 
                               : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                           }`}
                         >
                           {getCategoryStyle(cat).label}
                         </button>
                      ))}
                   </div>
                </div>

                {/* Name Input */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title / Name</label>
                   <input 
                      type="text" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all font-medium text-slate-800"
                      placeholder="e.g. Frontend Developer Intern"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                   />
                </div>

                {/* Details & AI Enhance */}
                <div>
                   <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Details</label>
                        <button 
                            onClick={handleEnhance}
                            disabled={isEnhancing || !formData.details}
                            className="flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                            title="Rewrite with AI to be more professional"
                        >
                            {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {isEnhancing ? 'Cooking...' : 'AI Enhance'}
                        </button>
                   </div>
                   <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all text-sm text-slate-600 h-32 resize-none leading-relaxed"
                      placeholder="Describe your role, key achievements, or specific skills..."
                      value={formData.details}
                      onChange={(e) => setFormData({...formData, details: e.target.value})}
                   />
                   
                   {/* Enhancement Suggestions */}
                   {enhancements.length > 0 && (
                       <div className="mt-3 bg-purple-50 rounded-xl p-3 border border-purple-100 animate-fadeIn">
                           <h4 className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                               <Sparkles size={12} />
                               Chef's Suggestions (Click to apply)
                           </h4>
                           <div className="space-y-2">
                               {enhancements.map((suggestion, idx) => (
                                   <button 
                                        key={idx}
                                        onClick={() => applyEnhancement(suggestion)}
                                        className="w-full text-left text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all flex items-start group"
                                   >
                                       <span className="flex-1 leading-relaxed">{suggestion}</span>
                                       <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-purple-500 mt-1 ml-2 transition-opacity" />
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}
                </div>
             </div>

             <div className="p-6 pt-0 mt-auto">
                <button 
                  onClick={handleSave}
                  disabled={!formData.name}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-200"
                >
                  {editingId ? 'Save Changes' : 'Add to Pantry'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
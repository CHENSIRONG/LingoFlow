import React from 'react';
import { LanguageOption, LANGUAGES } from '../types';
import { X, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLang: LanguageOption;
  setSourceLang: (lang: LanguageOption) => void;
  targetLang: LanguageOption;
  setTargetLang: (lang: LanguageOption) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, sourceLang, setSourceLang, targetLang, setTargetLang 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full sm:w-[400px] max-h-[80vh] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300 border border-slate-800">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-100">Language Settings</h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Source Lang */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Translate From</label>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={`source-${lang.code}`}
                  onClick={() => setSourceLang(lang)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center justify-between border transition-all ${
                    sourceLang.code === lang.code 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {lang.label}
                  {sourceLang.code === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Target Lang */}
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Translate To</label>
             <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={`target-${lang.code}`}
                  onClick={() => setTargetLang(lang)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center justify-between border transition-all ${
                    targetLang.code === lang.code 
                    ? 'bg-violet-500/20 border-violet-500 text-violet-300' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {lang.label}
                  {targetLang.code === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
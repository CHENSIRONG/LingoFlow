
import React, { useState, useEffect } from 'react';
import { Tab, Flashcard, LANGUAGES } from './types';
import { Navbar } from './components/Navbar';
import { ExploreView } from './components/ExploreView';
import { FlashcardView } from './components/FlashcardView';
import { SettingsModal } from './components/SettingsModal';
import { Settings, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Explore);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Persistent State
  const [sourceLang, setSourceLang] = useState(LANGUAGES[0]); // Default English
  const [targetLang, setTargetLang] = useState(LANGUAGES[1]); // Default Chinese
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Load flashcards from local storage on mount
  useEffect(() => {
    const savedCards = localStorage.getItem('lingoflow_flashcards_v2');
    if (savedCards) {
      try {
        setFlashcards(JSON.parse(savedCards));
      } catch (e) {
        console.error("Failed to parse flashcards", e);
      }
    }
  }, []);

  // Save flashcards whenever they change
  useEffect(() => {
    localStorage.setItem('lingoflow_flashcards_v2', JSON.stringify(flashcards));
  }, [flashcards]);

  const addFlashcard = (card: Flashcard) => {
    // Prevent duplicates based on sourceText
    if (!flashcards.find(f => f.sourceText.toLowerCase() === card.sourceText.toLowerCase())) {
      setFlashcards(prev => [card, ...prev]);
    }
  };

  const removeFlashcard = (id: string) => {
    setFlashcards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="flex-none px-6 py-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-20 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 animate-[bounce_3s_infinite]">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            LingoFlow
          </h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ease-in-out ${activeTab === Tab.Explore ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <ExploreView 
            sourceLang={sourceLang} 
            targetLang={targetLang} 
            onAddFlashcard={addFlashcard}
          />
        </div>
        <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ease-in-out ${activeTab === Tab.Flashcards ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <FlashcardView flashcards={flashcards} onRemove={removeFlashcard} />
        </div>
      </main>

      {/* Bottom Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          sourceLang={sourceLang}
          setSourceLang={setSourceLang}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
        />
      )}
    </div>
  );
}

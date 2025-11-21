import React from 'react';
import { Tab } from '../types';
import { Compass, Layers } from 'lucide-react';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="flex-none bg-slate-900 border-t border-slate-800 px-6 pb-8 pt-4 flex justify-around items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <button 
        onClick={() => setActiveTab(Tab.Explore)}
        className={`flex flex-col items-center gap-1.5 transition-all duration-300 w-16 group ${activeTab === Tab.Explore ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
      >
        <div className="relative flex items-center justify-center h-7 w-7">
          {activeTab === Tab.Explore ? (
            // Active: Glowing Compass
            <Compass 
              className="w-7 h-7 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-in zoom-in duration-200" 
              strokeWidth={2.5} 
            />
          ) : (
            // Inactive: Compass
            <Compass className="w-7 h-7 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          )}
        </div>
        <span className={`text-[10px] font-bold tracking-wide transition-colors ${activeTab === Tab.Explore ? 'text-indigo-400' : 'text-slate-500'}`}>
          Explore
        </span>
      </button>
      
      <div className="w-px h-8 bg-slate-800/50"></div>

      <button 
        onClick={() => setActiveTab(Tab.Flashcards)}
        className={`flex flex-col items-center gap-1.5 transition-all duration-300 w-16 group ${activeTab === Tab.Flashcards ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
      >
        <div className="relative flex items-center justify-center h-7 w-7">
          {activeTab === Tab.Flashcards ? (
             // Active: Layers with Glow (Outline style to match Compass)
             <Layers 
               className="w-7 h-7 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-in zoom-in duration-200" 
               strokeWidth={2.5} 
             />
          ) : (
             // Inactive: Layers Outline
             <Layers className="w-7 h-7 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          )}
        </div>
        <span className={`text-[10px] font-bold tracking-wide transition-colors ${activeTab === Tab.Flashcards ? 'text-indigo-400' : 'text-slate-500'}`}>
          Cards
        </span>
      </button>
    </nav>
  );
};

import React, { useState, useRef } from 'react';
import { Flashcard, VisualType } from '../types';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Layers, RefreshCw, Download, RotateCw } from 'lucide-react';
import { toPng } from 'html-to-image';

interface FlashcardViewProps {
  flashcards: Flashcard[];
  onRemove: (id: string) => void;
}

// Helper component for text highlighting
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight || !highlight.trim()) return <>{text}</>;
  
  // Escape special regex chars
  const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safeHighlight})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="text-indigo-400 font-bold">{part}</span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

// --- Sub-components for Face Rendering ---

const FrontFace = ({ card, isExport = false }: { card: Flashcard, isExport?: boolean }) => {
  // Styles adapted for export vs view
  // Export: Fixed width (match typical phone), Auto height to fit content, No absolute positioning
  // View: Absolute inset, Fixed height (parent), Scrollable content
  const containerClass = isExport 
    ? "relative w-[375px] min-h-[600px] h-auto bg-gradient-to-br from-slate-800 to-slate-950 rounded-[40px] flex flex-col items-center p-8 border border-slate-800/50"
    : "absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 rounded-[40px] flex flex-col items-center p-8 backface-hidden border border-slate-800/50";

  const contentContainerClass = isExport
    ? "flex flex-col items-center justify-center w-full gap-6 py-4"
    : "flex-1 flex flex-col items-center justify-center w-full gap-6 overflow-hidden min-h-0"; 

  const definitionBoxClass = isExport
    ? "w-full text-left bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30 backdrop-blur-sm"
    : "w-full text-left bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30 backdrop-blur-sm flex-1 min-h-0 overflow-y-auto scrollbar-hide";

  return (
     <div className={containerClass} style={!isExport ? { backfaceVisibility: 'hidden' } : {}}>
        <span className="absolute top-8 right-8 text-xs font-bold text-slate-600 border border-slate-700 px-2 py-1 rounded-full uppercase">
          {card.sourceLangCode}
        </span>

        <div className={contentContainerClass}>
          {/* Added mt-8 to push text down from absolute badge, px-4 for side spacing. 
              Responsive font size: text-3xl on mobile, 4xl on larger screens. */}
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 text-center leading-tight tracking-tight break-words w-full drop-shadow-lg flex-none line-clamp-2 overflow-hidden text-ellipsis mt-8 px-4">
            {card.sourceText}
          </h2>
          
          {/* Removed the indigo divider bar here */}
          
          <div className={definitionBoxClass}>
            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 tracking-wider opacity-80">Explanation</p>
            <p className="text-slate-200 text-sm leading-relaxed mb-3 font-medium whitespace-pre-wrap">
              <HighlightedText text={card.definition} highlight={card.sourceText} />
            </p>
            <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700/50 pt-2 whitespace-pre-wrap">
              {card.definitionTranslation}
            </p>
          </div>
        </div>

        {!isExport && (
           <div className="mt-auto text-slate-500 text-sm font-medium tracking-widest uppercase flex items-center gap-2 pt-6 flex-none">
             Tap to Flip
           </div>
        )}
        
        {isExport && (
           <div className="mt-8 flex items-center justify-center gap-2 opacity-50">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">LingoFlow AI</span>
           </div>
        )}
     </div>
  );
};

const BackFace = ({ card, isExport = false }: { card: Flashcard, isExport?: boolean }) => {
   const containerClass = isExport
    ? "relative w-[375px] min-h-[600px] h-auto bg-slate-900 rounded-[40px] border border-slate-800/50 flex flex-col p-5"
    : "absolute inset-0 w-full h-full bg-slate-900 rounded-[40px] backface-hidden border border-slate-800/50 flex flex-col p-5";

    // Visual: View=Flexible, Export=Fixed Aspect
    const visualClass = isExport
      ? "w-full aspect-square bg-black/40 rounded-3xl overflow-hidden mb-4 relative border border-white/5 flex flex-col shadow-inner flex-none"
      : "flex-1 w-full min-h-0 bg-black/40 rounded-3xl overflow-hidden mb-4 relative border border-white/5 flex flex-col shadow-inner"; 
    
    // Story: View=Scrollable max-height, Export=Full content
    const storyClass = isExport
      ? "flex-none bg-slate-800/30 rounded-3xl p-5 border border-slate-700/30"
      : "flex-none bg-slate-800/30 rounded-3xl p-5 border border-slate-700/30 max-h-[40%] overflow-y-auto scrollbar-hide";

    return (
      <div className={containerClass} style={!isExport ? { backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' } : {}}>
        <div className={`w-full h-full flex flex-col ${isExport ? '' : 'overflow-hidden'}`}>
           <div className={visualClass}>
               {card.visualContent ? (
                  card.visualType === VisualType.Image ? (
                    <img src={card.visualContent} className="w-full h-full object-cover opacity-90" alt="Visual Memory" />
                  ) : (
                    <div className="w-full h-full p-6 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: card.visualContent }} />
                  )
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Visual</div>
               )}
            </div>

            <div className={storyClass}>
               {/* Removed sticky top-0 to fix overlap issue */}
               <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Example</h4>
               </div>
               <p className="text-sm text-slate-200 leading-relaxed mb-2 whitespace-pre-wrap">
                 <HighlightedText text={card.story} highlight={card.sourceText} />
               </p>
               <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-700/30 pt-2 whitespace-pre-wrap">
                 {card.storyTranslation}
               </p>
            </div>
        </div>
        
        {isExport && (
           <div className="mt-4 flex items-center justify-center gap-2 opacity-50 pb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">LingoFlow AI</span>
           </div>
        )}
      </div>
    );
};


export const FlashcardView: React.FC<FlashcardViewProps> = ({ flashcards, onRemove }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Ref for the hidden export container
  const exportRef = useRef<HTMLDivElement>(null);

  // Handle empty state
  if (flashcards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 shadow-2xl shadow-black/50">
          <Layers className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-2">Deck is Empty</h3>
        <p className="text-slate-500">Translate words in Explore tab to build your flashcard deck.</p>
      </div>
    );
  }

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
  };

  const handleDownload = async () => {
    const targetRef = exportRef.current;

    if (targetRef) {
      setIsDownloading(true);
      try {
        // Slight delay to ensure render stability
        await new Promise(r => setTimeout(r, 100));
        
        const options = { 
          cacheBust: true, 
          pixelRatio: 2,
          backgroundColor: '#020617', // slate-950
          style: { transform: 'none' },
          skipAutoScale: true, // Added to fix potential font/layout shift issues
        };

        const dataUrl = await toPng(targetRef, options);
        
        const link = document.createElement('a');
        const currentCard = flashcards[currentIndex];
        link.download = `lingoflow-${currentCard.sourceText}-${isFlipped ? 'back' : 'front'}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to download card image', err);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const currentCard = flashcards[currentIndex];

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0f] overflow-hidden relative">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Card Area */}
      <div className="flex-1 relative flex items-center justify-center px-4 pt-8">
        
        {/* Navigation Button Left */}
        <button 
          onClick={prevCard}
          disabled={currentIndex === 0}
          className="absolute left-4 z-40 w-12 h-12 rounded-full bg-slate-800/50 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-200 shadow-lg disabled:opacity-0 hover:bg-slate-700 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Navigation Button Right */}
        <button 
          onClick={nextCard}
          disabled={currentIndex === flashcards.length - 1}
          className="absolute right-4 z-40 w-12 h-12 rounded-full bg-slate-800/50 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-200 shadow-lg disabled:opacity-0 hover:bg-slate-700 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Card Stack */}
        <div className="relative w-full max-w-[300px] sm:max-w-[360px] aspect-[3/4] perspective-1000">
          {flashcards.map((card, index) => {
            if (index < currentIndex - 1 || index > currentIndex + 2) return null;

            const isCurrent = index === currentIndex;
            const offset = index - currentIndex;
            const zIndex = 30 - offset;
            const scale = 1 - (offset * 0.05);
            const translateY = offset * 15;
            const brightness = 1 - (offset * 0.3);
            const opacity = offset > 2 ? 0 : 1;

            return (
              <motion.div
                key={card.id}
                className="absolute inset-0 w-full h-full"
                initial={false}
                animate={{
                  scale: isCurrent ? 1 : scale,
                  y: isCurrent ? 0 : translateY,
                  x: index < currentIndex ? -400 : 0,
                  opacity: index < currentIndex ? 0 : opacity,
                  zIndex: zIndex,
                  filter: `brightness(${brightness})`
                }}
                transition={{ type: "spring", stiffness: 250, damping: 25 }}
                style={{ transformStyle: 'preserve-3d' }}
                onClick={() => isCurrent && setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="relative w-full h-full rounded-[40px] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)]"
                  animate={{ rotateY: (isCurrent && isFlipped) ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                   <FrontFace card={card} isExport={false} />
                   <BackFace card={card} isExport={false} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex-none h-24 px-8 pb-6 flex flex-col justify-end z-50">
        <div className="flex items-center gap-4 mb-3">
           {/* Progress Bar */}
           <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-indigo-500 rounded-full"
               initial={{ width: 0 }}
               animate={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
             />
           </div>
        </div>

        <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-slate-800 rounded-full hover:text-white transition-colors"
            title="Reset to start"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <span className="font-mono tracking-wide text-slate-500">
            {currentIndex + 1} / {flashcards.length} <span className="text-xs ml-1">CARDS</span>
          </span>

          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 hover:bg-slate-800 rounded-full hover:text-white transition-colors disabled:opacity-50"
            title="Download Card"
          >
            {isDownloading ? <RotateCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Hidden Export Container (Fixed position off-screen) */}
      {/* This renders the active face with full content for image generation */}
      <div className="fixed top-0 left-[-9999px] pointer-events-none z-[-1]">
        <div ref={exportRef}>
           {isFlipped 
             ? <BackFace card={currentCard} isExport={true} />
             : <FrontFace card={currentCard} isExport={true} />
           }
        </div>
      </div>

    </div>
  );
};

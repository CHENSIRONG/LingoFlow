
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LanguageOption, Flashcard, TranslationResult, VisualType } from '../types';
import { translateTextSimple, getRichContext, generateVisualImage, generateVisualSvg, generateSpeech, playAudio, stopAudio, chatWithAI } from '../services/geminiService';
import { ArrowRight, Volume2, Image as ImageIcon, Video, Plus, RefreshCw, Loader2, MessageCircle, X, Send, Square, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ExploreViewProps {
  sourceLang: LanguageOption;
  targetLang: LanguageOption;
  onAddFlashcard: (card: Flashcard) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Helper component for text highlighting
const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight || !highlight.trim()) return <>{text}</>;
  
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

// Skeleton Loader Component
const TextSkeleton = ({ width = "w-full", rows = 2 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`h-4 bg-slate-800 rounded ${i === rows - 1 ? 'w-2/3' : width}`}></div>
    ))}
  </div>
);

export const ExploreView: React.FC<ExploreViewProps> = ({ sourceLang, targetLang, onAddFlashcard }) => {
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  
  const [visualType, setVisualType] = useState<VisualType>(VisualType.Image);
  const [visualContent, setVisualContent] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  
  const [hasAddedToFlashcards, setHasAddedToFlashcards] = useState(false);

  // Audio states
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null); // New state for loading feedback
  const [useAltVoice, setUseAltVoice] = useState(false); 

  // Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Typewriter state
  const [typewriterText, setTypewriterText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Typewriter Effect Logic
  useEffect(() => {
    const words = ["word", "phrase", "sentence", "paragraph"];
    let i = 0; 
    let j = 0; 
    let isDeleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const type = () => {
      const currentWord = words[i];
      
      if (isDeleting) {
        setTypewriterText(currentWord.substring(0, j - 1));
        j--;
        if (j === 0) {
          isDeleting = false;
          i = (i + 1) % words.length;
        }
      } else {
        setTypewriterText(currentWord.substring(0, j + 1));
        j++;
        if (j === currentWord.length) {
          isDeleting = true;
        }
      }

      const speed = isDeleting ? 75 : 150;
      const delay = !isDeleting && j === currentWord.length ? 3000 : speed;
      
      timeoutId = setTimeout(type, delay);
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  // Helper to get voice
  const getVoiceForLang = (langCode: string) => {
    const langOption = [sourceLang, targetLang].find(l => l.code === langCode);
    if (langOption) {
      if (langCode === 'en') {
        return useAltVoice && langOption.altVoice ? langOption.altVoice : langOption.defaultVoice;
      }
      return langOption.defaultVoice;
    }
    return 'Puck';
  };

  const handleSearch = async () => {
    if (!inputText.trim()) return;
    
    setIsSearching(true);
    setHasAddedToFlashcards(false);
    setChatMessages([]); 
    stopAudio();
    setActiveAudioId(null);
    setLoadingAudioId(null);
    setVisualContent(null);

    // STEP 1: Initialize with Input & Loading State
    // We set a partial result so the card renders immediately with the input word
    setResult({
      translation: '', // Empty string triggers loading skeleton
      definition: '',
      story: '',
      definitionTranslation: '',
      storyTranslation: ''
    });

    try {
      // STEP 2: Fast Translation (Parallel to Rich Context if we wanted, but sequential is safer for order)
      // Actually, let's run simple translate first for instant feedback
      const simpleTranslation = await translateTextSimple(inputText, targetLang.label);
      
      setResult(prev => ({ ...prev!, translation: simpleTranslation }));
      
      // Pre-fetch audio for input & simple translation immediately
      const voiceSource = getVoiceForLang(sourceLang.code);
      const voiceTarget = getVoiceForLang(targetLang.code);
      generateSpeech(inputText, voiceSource);
      if (simpleTranslation) generateSpeech(simpleTranslation, voiceTarget);

      // STEP 3: Rich Context (Explanation & Story)
      const richData = await getRichContext(inputText, sourceLang.label, targetLang.label);
      
      // Update with full details
      setResult({
        translation: simpleTranslation || richData.translation, // Prefer simple if available, or fallback
        definition: richData.definition,
        story: richData.story,
        definitionTranslation: richData.definitionTranslation,
        storyTranslation: richData.storyTranslation
      });
      
      // STEP 4: Generate Visuals
      handleGenerateVisual(VisualType.Image, inputText, richData.definition, richData.story); 
      
      // Pre-fetch audio for the new rich content
      generateSpeech(richData.definition, voiceSource);
      generateSpeech(richData.story, voiceSource);

    } catch (error) {
      console.error("Translation flow failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateVisual = async (type: VisualType, inputTxt: string, definitionTxt?: string, storyTxt?: string) => {
    setVisualType(type);
    setIsGeneratingVisual(true);
    setVisualContent(null);
    
    try {
      let content = null;
      if (type === VisualType.Image) {
        content = await generateVisualImage(inputTxt, definitionTxt, storyTxt); 
      } else if (type === VisualType.SVG) {
        content = await generateVisualSvg(inputTxt, definitionTxt, storyTxt);
      }
      
      if (content) setVisualContent(content);
    } catch (e) {
      console.error("Visual gen failed", e);
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  const handlePlayAudio = async (text: string, langCode: string, elementId: string) => {
    if (activeAudioId === elementId) {
      stopAudio();
      setActiveAudioId(null);
      return;
    }

    setActiveAudioId(null); // Reset active state immediately
    setLoadingAudioId(elementId); // Set loading state

    try {
      const voice = getVoiceForLang(langCode);
      const audioData = await generateSpeech(text, voice);
      
      setLoadingAudioId(null); // Clear loading

      if (audioData) {
        setActiveAudioId(elementId); // Set active
        await playAudio(audioData, () => {
            setActiveAudioId(prev => prev === elementId ? null : prev);
        });
      }
    } catch (e) {
        console.error("Play failed", e);
        setLoadingAudioId(null);
        setActiveAudioId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !result) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const context = `Word: ${inputText}. Definition: ${result.definition}. Story: ${result.story}`;
      const apiHistory = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const aiResponseText = await chatWithAI(userMsg, context, apiHistory);
      setChatMessages(prev => [...prev, { role: 'model', text: aiResponseText }]);
    } catch (e) {
      console.error("Chat failed", e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddToFlashcards = () => {
    if (!result) return;
    const newCard: Flashcard = {
      id: Date.now().toString(),
      sourceText: inputText,
      definition: result.definition || '',
      story: result.story || '',
      translation: result.translation || '',
      definitionTranslation: result.definitionTranslation || '',
      storyTranslation: result.storyTranslation || '',
      targetLangCode: targetLang.code,
      sourceLangCode: sourceLang.code,
      createdAt: Date.now(),
      visualType: visualType,
      visualContent: visualContent || undefined
    };
    onAddFlashcard(newCard);
    setHasAddedToFlashcards(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const renderAudioButton = (text: string | undefined, langCode: string, id: string) => {
    if (!text) return null; // Don't render if no text
    
    const isPlaying = activeAudioId === id;
    const isLoading = loadingAudioId === id;

    return (
      <button 
        onClick={(e) => { e.stopPropagation(); handlePlayAudio(text, langCode, id); }} 
        disabled={isLoading}
        className={`ml-2 p-1.5 rounded-full transition-all inline-flex align-middle ${isPlaying ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-slate-800'}`}
        title={isPlaying ? "Pause" : "Listen"}
      >
        {isLoading ? (
           <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : isPlaying ? (
           <Square className="w-3 h-3 fill-current" />
        ) : (
           <Volume2 className="w-4 h-4" />
        )}
      </button>
    );
  };

  return (
    <div className={`h-full overflow-y-auto p-6 pb-24 flex flex-col bg-slate-950 text-slate-100 relative scrollbar-hide ${!result ? 'justify-center' : ''}`}>
      
      <AnimatePresence>
        {!result && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="flex flex-col items-center justify-center mb-10 text-center space-y-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-200 via-white to-violet-200 bg-clip-text text-transparent min-h-[80px] sm:min-h-[96px]">
              Visualize Meaning of <br/>
              <span className="text-indigo-400 inline-block relative">
                 {typewriterText}
                 <span className="animate-pulse ml-0.5 text-indigo-300">|</span>
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
              Enhance language fluency with AI.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div 
        layout
        className={`w-full max-w-2xl mx-auto transition-all duration-500 ${result ? 'mt-0' : 'mt-4'}`}
      >
        <div className="relative group flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type in ${sourceLang.label}...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-full py-4 pl-6 pr-16 text-lg sm:text-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm items-center"
          />
          <div className="absolute right-2">
            <button 
              onClick={handleSearch}
              disabled={isSearching || !inputText.trim()}
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                inputText.trim() 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                  : 'bg-slate-800 text-slate-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" /> }
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-6 w-full max-w-2xl mx-auto"
          >
            {/* Content Card */}
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">{sourceLang.code}</span>
                  <div className="flex items-center gap-2">
                    {(sourceLang.code === 'en' || targetLang.code === 'en') && (
                       <button 
                         onClick={() => setUseAltVoice(!useAltVoice)}
                         className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-indigo-400 transition-colors uppercase"
                       >
                         {useAltVoice ? 'US' : 'UK'}
                       </button>
                    )}
                  </div>
                </div>
                
                <div>
                   <h2 className="text-3xl font-bold text-white leading-snug mb-1 flex items-center">
                     {inputText}
                     {renderAudioButton(inputText, sourceLang.code, 'input')}
                   </h2>
                   
                   {/* Translation Section with Skeleton */}
                   <div className="flex items-center min-h-[32px]">
                     {result.translation ? (
                       <>
                         <p className="text-lg text-indigo-400 font-medium">{result.translation}</p>
                         {renderAudioButton(result.translation, targetLang.code, 'translation')}
                       </>
                     ) : (
                       <div className="w-32 h-6 bg-slate-800/50 rounded animate-pulse"></div>
                     )}
                   </div>
                </div>

                <div className="h-px bg-slate-800 w-full"></div>

                <div>
                   <p className="text-xs font-bold text-slate-500 uppercase mb-2">Explanation</p>
                   {result.definition ? (
                     <>
                        <p className="text-base text-slate-300 leading-relaxed mb-1">
                            <HighlightedText text={result.definition} highlight={inputText} />
                            {renderAudioButton(result.definition, sourceLang.code, 'definition')}
                        </p>
                        <p className="text-sm text-indigo-400/80 leading-relaxed">
                            {result.definitionTranslation}
                            {renderAudioButton(result.definitionTranslation, targetLang.code, 'definitionTrans')}
                        </p>
                     </>
                   ) : (
                     <TextSkeleton rows={3} />
                   )}
                </div>

                <div className="">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Example</p>
                  {result.story ? (
                    <>
                      <p className="text-slate-300 text-base leading-relaxed mb-1">
                        <HighlightedText text={result.story} highlight={inputText} />
                        {renderAudioButton(result.story, sourceLang.code, 'story')}
                      </p>
                      <p className="text-indigo-400/80 text-sm leading-relaxed">
                        {result.storyTranslation}
                        {renderAudioButton(result.storyTranslation, targetLang.code, 'storyTrans')}
                      </p>
                    </>
                  ) : (
                     <TextSkeleton rows={2} />
                  )}
                </div>
              </div>
            </div>

            {/* Visualization Section */}
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-3xl p-2 shadow-xl border border-slate-800">
              <div className="flex items-center justify-between p-2 mb-2">
                <h3 className="text-sm font-bold text-slate-400">Visualization</h3>
                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                  <button 
                    onClick={() => handleGenerateVisual(VisualType.Image, inputText, result.definition, result.story)}
                    className={`p-1.5 rounded-md transition-all ${visualType === VisualType.Image ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleGenerateVisual(VisualType.SVG, inputText, result.definition, result.story)}
                    className={`p-1.5 rounded-md transition-all ${visualType === VisualType.SVG ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center relative group border border-slate-800">
                {isGeneratingVisual ? (
                  <div className="flex flex-col items-center gap-2 text-indigo-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-medium animate-pulse">Creating visual...</span>
                  </div>
                ) : visualContent ? (
                  <>
                    {visualType === VisualType.Image ? (
                       <img src={visualContent} alt="Visual mnemonic" className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full p-4 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: visualContent }} />
                    )}
                    <button 
                      onClick={() => handleGenerateVisual(visualType, inputText, result.definition, result.story)}
                      className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur p-2 rounded-full shadow-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  // If result is fully loaded but no visual (initial state before auto-gen finishes)
                  isSearching && !visualContent ? (
                      <div className="flex flex-col items-center gap-2 text-slate-600">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Waiting for context...</span>
                      </div>
                  ) : (
                     <span className="text-slate-600 text-sm">Select type to generate</span>
                  )
                )}
              </div>
            </div>

            <button 
              onClick={handleAddToFlashcards}
              disabled={hasAddedToFlashcards || !result.definition} // Disable until definition loads
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                hasAddedToFlashcards 
                ? 'bg-green-900/30 text-green-400 border border-green-900/50' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {hasAddedToFlashcards ? (
                 <>Added to Flash Card</>
              ) : (
                 <><Plus className="w-5 h-5" /> Add to Flashcards</>
              )}
            </button>
            
            <div className="h-8"></div> 

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !isChatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-32 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-900/50 hover:bg-indigo-500 hover:scale-110 transition-all z-50"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {isChatOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-20 z-[9999] bg-slate-900 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col border-t border-slate-800"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">AI Chat</h3>
                  <p className="text-xs text-slate-400">Ask about "{inputText}"</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                  <p>Ask me anything about this word!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 pb-8 bg-slate-900 border-t border-slate-800 w-full">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your question..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-full py-3 pl-5 pr-12 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

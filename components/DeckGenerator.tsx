import React, { useState, useRef } from 'react';
import { TarotCardData, DeckSection, DeckTheme } from '../types';
import { generateDeckSectionMetadata, generateCardImage } from '../services/geminiService';
import TarotCard from './TarotCard';
import { Sparkles, Search, Download, Loader2, Layers, AlertCircle, Wand2, Upload, Image as ImageIcon, X, Key } from 'lucide-react';
import JSZip from 'jszip';

const SECTIONS: DeckSection[] = ['Major Arcana', 'Wands', 'Cups', 'Swords', 'Pentacles'];

const DeckGenerator: React.FC = () => {
  // Default to the requested "Gnome Deck" settings
  const [themeInput, setThemeInput] = useState('Gnome World');
  const [artStyleInput, setArtStyleInput] = useState('Rider-Waite, storybook illustration, whimsical, detailed, vintage colors');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  const [activeSection, setActiveSection] = useState<DeckSection>('Major Arcana');
  const [deck, setDeck] = useState<Record<DeckSection, TarotCardData[]>>({
    'Major Arcana': [],
    'Wands': [],
    'Cups': [],
    'Swords': [],
    'Pentacles': []
  });

  const [loadingSection, setLoadingSection] = useState<DeckSection | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateSection = async (section: DeckSection) => {
    if (!themeInput.trim()) return;

    setLoadingSection(section);
    setError(null);
    setProgress({ current: 0, total: section === 'Major Arcana' ? 22 : 14 });

    try {
      // 1. Generate Metadata
      const initialCards = await generateDeckSectionMetadata(section, themeInput, artStyleInput);
      
      // Update deck with metadata placeholders
      setDeck(prev => ({
        ...prev,
        [section]: initialCards
      }));

      // 2. Generate Images sequentially
      // Reduced concurrency to 1 and added delay to respect rate limits (approx 15 RPM for free tier)
      const CONCURRENCY = 1;
      const cardsToProcess = [...initialCards];
      const results: TarotCardData[] = [...initialCards];

      for (let i = 0; i < cardsToProcess.length; i += CONCURRENCY) {
        const batch = cardsToProcess.slice(i, i + CONCURRENCY);
        
        await Promise.all(batch.map(async (card) => {
          try {
            // Pass reference image if available
            const imageUrl = await generateCardImage(card.visualPrompt, referenceImage || undefined);
            const index = results.findIndex(c => c.id === card.id);
            if (index !== -1) {
              results[index] = { ...results[index], imageUrl, isLoadingImage: false };
            }
          } catch (e) {
            console.error(`Failed to generate image for ${card.name}`, e);
            const index = results.findIndex(c => c.id === card.id);
            if (index !== -1) {
              results[index] = { ...results[index], isLoadingImage: false };
            }
          }
        }));

        // Update state after each batch to show progress
        setDeck(prev => ({
          ...prev,
          [section]: [...results]
        }));
        setProgress(prev => prev ? { ...prev, current: Math.min(prev.total, i + CONCURRENCY) } : null);

        // Add a delay between batches to respect API rate limits
        // 2000ms delay helps keep us within typical free tier limits (approx 15 requests per minute)
        if (i + CONCURRENCY < cardsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate this section. Please try again.");
    } finally {
      setLoadingSection(null);
      setProgress(null);
    }
  };

  const regenerateImage = async (cardId: string, prompt: string) => {
    // Find the card and section
    let cardSection: DeckSection | undefined;
    let card: TarotCardData | undefined;

    for (const s of SECTIONS) {
      const found = deck[s].find(c => c.id === cardId);
      if (found) {
        cardSection = s;
        card = found;
        break;
      }
    }

    if (!cardSection || !card) return;

    // Update state to loading
    setDeck(prev => ({
      ...prev,
      [cardSection!]: prev[cardSection!].map(c => c.id === cardId ? { ...c, isLoadingImage: true } : c)
    }));

    try {
      // Pass reference image here too
      const newUrl = await generateCardImage(prompt + ` random seed ${Math.random()}`, referenceImage || undefined);
      setDeck(prev => ({
        ...prev,
        [cardSection!]: prev[cardSection!].map(c => c.id === cardId ? { ...c, imageUrl: newUrl, isLoadingImage: false } : c)
      }));
    } catch (e) {
      setDeck(prev => ({
        ...prev,
        [cardSection!]: prev[cardSection!].map(c => c.id === cardId ? { ...c, isLoadingImage: false } : c)
      }));
    }
  };

  // Helper to save file without external dependency
  const saveBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadDeck = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${themeInput.replace(/\s+/g, '_')}_Deck`);
      
      let count = 0;
      SECTIONS.forEach(section => {
        const cards = deck[section];
        if (cards.length > 0) {
           const sectionFolder = folder?.folder(section.replace(/\s+/g, '_'));
           cards.forEach(card => {
             if (card.imageUrl && card.imageUrl.startsWith('data:image')) {
                // Remove header
                const data = card.imageUrl.split(',')[1];
                const filename = `${card.name.replace(/\s+/g, '_')}.png`;
                sectionFolder?.file(filename, data, { base64: true });
                count++;
             }
             // Add text metadata as well
             const textContent = `Name: ${card.name}\nDescription: ${card.description}\nUpright: ${card.uprightMeaning}\nReversed: ${card.reversedMeaning}`;
             sectionFolder?.file(`${card.name.replace(/\s+/g, '_')}.txt`, textContent);
           });
        }
      });

      if (count === 0) {
        alert("No images generated yet!");
        setIsZipping(false);
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveBlob(content, `${themeInput.replace(/\s+/g, '_')}_Tarot_Deck.zip`);

    } catch (e) {
      console.error("Zip error", e);
      alert("Failed to zip files.");
    } finally {
      setIsZipping(false);
    }
  };

  // Safe flattening using reduce to avoid TypeScript/environment issues with flat()
  const allCards = (Object.values(deck) as TarotCardData[][]).reduce((acc, val) => acc.concat(val), [] as TarotCardData[]);
  const totalCardsGenerated = allCards.filter(c => !c.isLoadingImage && c.imageUrl).length;
  const activeCards = deck[activeSection];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      
      {/* Control Panel */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl border border-indigo-500/20 shadow-2xl mb-8 p-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-6 border-b border-indigo-500/20 pb-6">
           <div>
             <h2 className="text-2xl font-cinzel text-indigo-100 flex items-center">
               <Layers className="w-6 h-6 mr-3 text-indigo-400" />
               Deck Factory
             </h2>
             <p className="text-sm text-indigo-300/60 mt-1">Design, Generate, and Export your custom 78-card deck.</p>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-2xl font-bold text-white font-cinzel">{totalCardsGenerated} / 78</p>
                 <p className="text-xs text-indigo-400 uppercase tracking-widest">Cards Crafted</p>
              </div>
              <button
                onClick={downloadDeck}
                disabled={totalCardsGenerated === 0 || isZipping}
                className={`flex items-center px-6 py-3 rounded-lg font-bold tracking-wide transition-all ${
                  totalCardsGenerated > 0 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isZipping ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Download className="w-5 h-5 mr-2" />}
                {isZipping ? 'Zipping...' : 'Download Deck'}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
           {/* Inputs */}
           <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Deck Theme</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="e.g. Gnome World"
                    className="w-full bg-black/40 border border-indigo-900/50 rounded-lg pl-10 pr-4 py-2 text-indigo-100 focus:border-indigo-500 outline-none"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                </div>
                <p className="text-[10px] text-gray-500">e.g. "Gnome World", "Space Marines", "Cat Empire"</p>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Art Style Prompt</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={artStyleInput}
                    onChange={(e) => setArtStyleInput(e.target.value)}
                    className="w-full bg-black/40 border border-indigo-900/50 rounded-lg pl-10 pr-4 py-2 text-indigo-100 focus:border-indigo-500 outline-none"
                  />
                   <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                </div>
                <p className="text-[10px] text-gray-500">Describes the visual finish (e.g. "Oil painting", "Pixel art")</p>
             </div>
           </div>

           {/* Image Upload */}
           <div className="md:col-span-4 space-y-2">
             <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex justify-between">
                <span>Style Reference</span>
                {referenceImage && <span className="text-emerald-400 text-[10px] flex items-center"><Sparkles className="w-3 h-3 mr-1"/> Active</span>}
             </label>
             
             {!referenceImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[76px] border-2 border-dashed border-indigo-900/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-indigo-500/50 transition-colors group"
                >
                  <Upload className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 mb-1" />
                  <span className="text-[10px] text-gray-500 group-hover:text-indigo-300">Upload Example Card</span>
                </div>
             ) : (
                <div className="relative w-full h-[76px] rounded-lg overflow-hidden border border-indigo-500/50 group">
                  <img src={referenceImage} alt="Reference" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  <button 
                    onClick={clearReferenceImage}
                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-900/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2">
                    <p className="text-[9px] text-white truncate">Style Reference Loaded</p>
                  </div>
                </div>
             )}
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleImageUpload} 
               accept="image/*" 
               className="hidden" 
             />
           </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-1">
          {SECTIONS.map((section) => {
             const count = deck[section].length;
             const isComplete = count > 0 && deck[section].every(c => !c.isLoadingImage);
             const isActive = activeSection === section;
             
             return (
               <button
                 key={section}
                 onClick={() => setActiveSection(section)}
                 className={`
                   px-4 py-2 rounded-t-lg text-sm font-medium transition-colors relative
                   ${isActive ? 'bg-indigo-900/50 text-white border-t border-x border-indigo-500/30' : 'text-gray-400 hover:text-indigo-300 hover:bg-white/5'}
                 `}
               >
                 {section}
                 {count > 0 && (
                   <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isComplete ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                     {count}
                   </span>
                 )}
               </button>
             );
          })}
        </div>
        
        {/* Generator Action */}
        <div className="mt-6 bg-indigo-950/20 p-6 rounded-xl border border-indigo-900/30 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-cinzel text-white mb-1">{activeSection}</h3>
              <p className="text-sm text-indigo-300/70">
                 {deck[activeSection].length === 0 
                   ? "Not generated yet." 
                   : `${deck[activeSection].length} cards generated.`}
              </p>
            </div>
            
            {loadingSection === activeSection ? (
              <div className="flex items-center bg-indigo-900/50 px-6 py-3 rounded-lg text-indigo-200">
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                <span>
                  Creating {progress ? `${progress.current} / ${progress.total}` : '...'}
                </span>
              </div>
            ) : (
              <button
                onClick={() => handleGenerateSection(activeSection)}
                disabled={!!loadingSection}
                className={`
                   flex items-center px-6 py-3 rounded-lg font-bold tracking-wide transition-all
                   ${!!loadingSection 
                      ? 'opacity-50 cursor-not-allowed bg-gray-700' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'}
                `}
              >
                {deck[activeSection].length > 0 ? <Wand2 className="w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {deck[activeSection].length > 0 ? 'Regenerate Entire Section' : `Generate ${activeSection}`}
              </button>
            )}
        </div>
        
        {error && (
            <div className="mt-4 p-4 bg-red-950/40 border border-red-900/50 rounded-lg text-red-200 text-sm">
              <div className="flex items-center font-bold mb-2">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 <span>{error}</span>
              </div>
              
              {/* Specialized Help for API Key issues */}
              {error.includes("API Key") && (
                 <div className="ml-6 text-xs text-red-300/80 space-y-2 mt-2 border-t border-red-900/30 pt-2">
                    <p className="font-semibold text-white">How to fix this:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                       <li>Do not paste the key directly into the code files.</li>
                       <li>Look for a <strong>"Secrets"</strong>, <strong>"Environment Variables"</strong>, or <strong>".env"</strong> section in your editor.</li>
                       <li>Create a new variable named <code className="bg-black/30 px-1 rounded text-red-100">API_KEY</code>.</li>
                       <li>Paste your Google Gemini key string as the value.</li>
                       <li>Restart the development server if running locally.</li>
                    </ol>
                    <div className="flex items-center text-indigo-300 mt-2">
                      <Key className="w-3 h-3 mr-1" />
                      <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-white">Get a free key from Google AI Studio</a>
                    </div>
                 </div>
              )}
            </div>
        )}

      </div>

      {/* Grid Display */}
      <div className="animate-fade-in-up">
         {activeCards.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-indigo-400/30 border-2 border-dashed border-indigo-900/30 rounded-3xl bg-black/20">
              <Layers className="w-16 h-16 mb-4" />
              <p className="text-lg font-cinzel">This section of the deck is empty.</p>
              <p className="text-sm">Click "Generate {activeSection}" to conjure the cards.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
             {activeCards.map((card, idx) => (
                <div key={card.id} className="animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                  <TarotCard card={card} onRegenerateImage={regenerateImage} />
                </div>
             ))}
           </div>
         )}
      </div>

    </div>
  );
};

export default DeckGenerator;
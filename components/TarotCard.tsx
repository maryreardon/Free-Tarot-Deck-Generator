import React, { useState } from 'react';
import { TarotCardData } from '../types';
import { Sparkles, RefreshCcw, Maximize2, Paintbrush, Palette } from 'lucide-react';

interface TarotCardProps {
  card: TarotCardData;
  onRegenerateImage?: (cardId: string, prompt: string) => void;
  onGenerateImage?: (cardId: string, prompt: string) => void;
}

const TarotCard: React.FC<TarotCardProps> = ({ card, onRegenerateImage, onGenerateImage }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Check if this is a "Draft" card (Text exists, but no image and not loading)
  const isDraft = !card.imageUrl && !card.isLoadingImage;

  return (
    <div className="group relative w-full perspective-1000 h-[500px]">
      <div 
        className={`card-inner relative w-full h-full duration-700 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={handleFlip}
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front of Card */}
        <div className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden shadow-2xl border-4 border-indigo-900/50 bg-gray-900 flex flex-col">
          
          {/* Loading State */}
          {card.isLoadingImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 animate-pulse text-indigo-400">
              <Sparkles className="w-12 h-12 mb-4 animate-spin-slow" />
              <p className="text-sm font-cinzel">Conjuring Image...</p>
            </div>
          ) : isDraft ? (
            /* Draft State - Ready to Paint */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-6 relative">
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
               
               <div className="border-2 border-dashed border-indigo-700/30 w-full h-full rounded-lg flex flex-col items-center justify-center text-center p-4">
                  <h3 className="text-xl font-cinzel text-indigo-200 mb-2">{card.name}</h3>
                  <p className="text-xs text-indigo-400/60 line-clamp-3 mb-6 italic">"{card.description}"</p>
                  
                  {onGenerateImage && (
                    <button 
                       onClick={(e) => {
                          e.stopPropagation();
                          onGenerateImage(card.id, card.visualPrompt);
                       }}
                       className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full flex items-center shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-105"
                    >
                       <Palette className="w-4 h-4 mr-2" />
                       Paint Card
                    </button>
                  )}
               </div>
            </div>
          ) : (
            /* Completed Image State */
            <div className="relative w-full h-full">
               {/* Image Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10 opacity-80"></div>
              
              <img 
                src={card.imageUrl} 
                alt={card.name} 
                className="w-full h-full object-cover"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-center w-full">
                <h3 className="text-lg md:text-xl font-cinzel font-bold text-amber-100 drop-shadow-lg tracking-wider border-b border-amber-500/30 pb-2 inline-block max-w-full break-words leading-tight">
                  {card.name}
                </h3>
              </div>

              {/* Top decoration */}
              <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                    <Maximize2 className="w-4 h-4 text-white" />
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Back of Card (Details) */}
        <div 
          className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden shadow-2xl border-4 border-amber-700/50 bg-gray-900 p-6 text-amber-100 rotate-y-180 flex flex-col"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
          
          <div className="relative z-10 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-cinzel text-amber-400 mb-2 text-center">{card.name}</h3>
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mb-6"></div>

            <p className="text-sm italic text-gray-400 mb-4 font-light leading-relaxed">
              "{card.description}"
            </p>

            <div className="space-y-4 flex-grow">
              <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-900/30">
                <h4 className="text-indigo-300 font-cinzel text-sm uppercase tracking-widest mb-2 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span> Upright
                </h4>
                <p className="text-sm text-gray-300">{card.uprightMeaning}</p>
              </div>

              <div className="bg-rose-950/30 p-4 rounded-lg border border-rose-900/30">
                <h4 className="text-rose-300 font-cinzel text-sm uppercase tracking-widest mb-2 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span> Reversed
                </h4>
                <p className="text-sm text-gray-300">{card.reversedMeaning}</p>
              </div>
            </div>

            {/* Actions on Back */}
            <div className="mt-4 border-t border-white/5 pt-4">
                {isDraft && onGenerateImage && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onGenerateImage(card.id, card.visualPrompt);
                            setIsFlipped(false); // Flip back to show loading
                        }}
                        className="flex items-center justify-center w-full py-2 mb-2 text-xs uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-900/30 rounded transition-colors"
                    >
                        <Paintbrush className="w-3 h-3 mr-2" /> Generate Art
                    </button>
                )}

                {onRegenerateImage && !card.isLoadingImage && !isDraft && (
                <button 
                    onClick={(e) => {
                    e.stopPropagation();
                    onRegenerateImage(card.id, card.visualPrompt);
                    setIsFlipped(false); // Flip back to show loading
                    }}
                    className="flex items-center justify-center w-full py-2 text-xs uppercase tracking-widest text-indigo-300 hover:text-white hover:bg-indigo-900/50 rounded transition-colors"
                >
                    <RefreshCcw className="w-3 h-3 mr-2" /> Redraw Image
                </button>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TarotCard;
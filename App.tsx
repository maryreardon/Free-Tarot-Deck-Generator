import React from 'react';
import DeckGenerator from './components/DeckGenerator';
import { Moon, Star } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-[#0f0f13] relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-amber-900/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-sm rounded-full opacity-50"></div>
                <div className="relative bg-gradient-to-br from-gray-900 to-black p-2 rounded-full border border-indigo-500/50">
                   <Moon className="w-6 h-6 text-indigo-300" />
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-amber-100">
                  Personalized Tarot Deck Generator
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400">Design Your Own Oracle</p>
              </div>
            </div>
            
            <a href="#" className="hidden sm:flex items-center text-xs font-bold text-gray-500 hover:text-indigo-300 transition-colors uppercase tracking-widest">
              <Star className="w-3 h-3 mr-2" />
              History
            </a>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          <DeckGenerator />
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-black/20 backdrop-blur-sm mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center">
             <p className="text-gray-600 text-sm">
               Mysticism powered by Gemini 2.5 • Not financial or life advice
             </p>
          </div>
        </footer>
      </div>
      
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
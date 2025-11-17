import React from 'react';
import type { Reaction } from '../types';

interface ReactionSelectionProps {
  reactions: Reaction[];
  onSelect: (reaction: Reaction) => void;
  onCancel: () => void;
}

const ReactionItem: React.FC<{ reaction: Reaction; onSelect: () => void }> = ({ reaction, onSelect }) => {
  const commonalityColor: Record<string, string> = {
    "شائع جدًا": "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600",
    "شائع": "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600",
    "غير شائع": "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600",
    "نادر": "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600",
  };
  const colorClass = commonalityColor[reaction.commonality as keyof typeof commonalityColor] || "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600";

  return (
    <button
      onClick={onSelect}
      className="w-full text-right p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-500 flex items-center gap-4 shadow-md"
    >
      <div className="text-5xl">{reaction.emoji}</div>
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{reaction.name} <span className="font-mono text-lg text-slate-500 dark:text-slate-400">{reaction.formula}</span></h3>
        {reaction.commonality && (
          <div className={`mt-2 inline-block px-3 py-1 text-sm font-semibold rounded-full border ${colorClass}`}>
            {reaction.commonality}
          </div>
        )}
      </div>
      <div className="text-slate-400 dark:text-slate-500 mr-auto">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </div>
    </button>
  );
};


export const ReactionSelection: React.FC<ReactionSelectionProps> = ({ reactions, onSelect, onCancel }) => {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 animate-slide-up max-h-[90vh] flex flex-col">
        <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-300 mb-6 text-center flex-shrink-0">
          مركبات محتملة
        </h2>

        <div className="space-y-4 overflow-y-auto flex-grow p-2 -m-2 scrollbar-hide">
          {reactions.map((reaction) => (
            <ReactionItem key={reaction.id + reaction.formula} reaction={reaction} onSelect={() => onSelect(reaction)} />
          ))}
        </div>
        
        <div className="w-full mt-6 flex-shrink-0">
           <button 
                onClick={onCancel}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors w-full text-lg"
            >
                تجاهل والبدء من جديد
            </button>
        </div>
      </div>
    </div>
  );
};
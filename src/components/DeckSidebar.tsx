import React, { useMemo } from 'react';
import { PokemonSummary } from '../types';
import { Trash2, Info, Swords, Plus, Shuffle } from 'lucide-react';
import { TypeBadge } from './TypeBadge';
import { POKEMON_TYPES } from '../constants';

interface DeckSidebarProps {
  deck: PokemonSummary[];
  onRemove: (id: number) => void;
  onBattle: () => void;
  onRandomDeck: () => void;
  isSearching: boolean;
}

export const DeckSidebar: React.FC<DeckSidebarProps> = ({ deck, onRemove, onBattle, onRandomDeck, isSearching }) => {
  const typeCoverage = useMemo(() => {
    const counts: Record<string, number> = {};
    deck.forEach(p => {
      p.types.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [deck]);

  return (
    <div className="w-full lg:w-80 flex flex-col h-64 lg:h-full bg-slate-900 border-l border-slate-800 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Your Deck <span className="text-sm font-mono text-slate-500">({deck.length}/6)</span>
          </h2>
          <button 
            onClick={onRandomDeck}
            className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
            title="Random Deck"
          >
            <Shuffle size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500">Select up to 6 Pokémon for battle.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {deck.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-8">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center mb-4">
              <Plus size={24} />
            </div>
            <p className="text-sm">Your deck is empty.<br/>Add some Pokémon to start!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deck.map(pokemon => (
              <div key={pokemon.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700 group">
                <img src={pokemon.image} alt={pokemon.name} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold capitalize truncate">{pokemon.name}</h4>
                  <div className="flex gap-1 mt-1">
                    {pokemon.types.map(t => (
                      <div key={t} className="w-2 h-2 rounded-full bg-current" style={{ color: `var(--color-${t}-500)` }} />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => onRemove(pokemon.id)}
                  className="p-2 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {deck.length > 0 && (
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
            <Info size={12} /> Type Coverage
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {POKEMON_TYPES.map(type => {
              const count = typeCoverage[type] || 0;
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-[10px]">
                  <span className="capitalize">{type}</span>
                  <span className="font-bold text-blue-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6 border-t border-slate-800">
        <button
          onClick={onBattle}
          disabled={deck.length === 0 || isSearching}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 shadow-xl shadow-blue-600/20"
        >
          {isSearching ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Swords size={18} />
              Enter Arena
            </>
          )}
        </button>
      </div>
    </div>
  );
};

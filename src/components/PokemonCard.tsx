import React from 'react';
import { PokemonSummary } from '../types';
import { TypeBadge } from './TypeBadge';
import { Plus, Shield, Sword, Heart, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  onAdd: (pokemon: PokemonSummary) => void;
  isInDeck: boolean;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onAdd, isInDeck }) => {
  return (
    <div className="pokemon-card group">
      <div className="relative aspect-square bg-slate-800/50 p-4 flex items-center justify-center overflow-hidden">
        <img
          src={pokemon.image}
          alt={pokemon.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 text-slate-500 font-mono text-xs">
          #{String(pokemon.id).padStart(3, '0')}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold capitalize truncate mr-2">{pokemon.name}</h3>
          <div className="flex gap-1 flex-wrap justify-end">
            {pokemon.types.map(type => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-[10px]">
          <div className="flex items-center gap-1 text-rose-400">
            <Heart size={10} /> HP: {pokemon.stats.hp}
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <Sword size={10} /> ATK: {pokemon.stats.attack}
          </div>
          <div className="flex items-center gap-1 text-blue-400">
            <Shield size={10} /> DEF: {pokemon.stats.defense}
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <Zap size={10} /> SPD: {pokemon.stats.speed}
          </div>
        </div>

        <button
          onClick={() => onAdd(pokemon)}
          disabled={isInDeck}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all",
            isInDeck 
              ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
          )}
        >
          {isInDeck ? 'In Deck' : <><Plus size={16} /> Add to Deck</>}
        </button>
      </div>
    </div>
  );
};

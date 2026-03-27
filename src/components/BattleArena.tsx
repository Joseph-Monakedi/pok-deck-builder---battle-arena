import React from 'react';
import { BattleState, BattlePokemon } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Zap, Heart, LogOut } from 'lucide-react';
import { TypeBadge } from './TypeBadge';
import { cn } from '../lib/utils';

interface BattleArenaProps {
  state: BattleState;
  socketId: string;
  onAttack: (move: any) => void;
  onToggleAuto: () => void;
  onForfeit: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ state, socketId, onAttack, onToggleAuto, onForfeit }) => {
  const playerIds = Object.keys(state.players);
  const opponentId = playerIds.find(id => id !== socketId)!;
  
  const player = state.players[socketId];
  const opponent = state.players[opponentId];

  const activePlayerPoke = player.deck[player.activePokemonIndex];
  const activeOpponentPoke = opponent.deck[opponent.activePokemonIndex];

  const isMyTurn = state.turn === socketId && state.status === 'active';
  const isAuto = player.isAuto;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="glass-header px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", isMyTurn ? "bg-green-500 animate-pulse" : "bg-slate-700")} />
            <span className="font-mono text-sm uppercase tracking-widest">
              {state.status === 'finished' ? 'Battle Over' : (isMyTurn ? (isAuto ? "Auto Battling..." : "Your Turn") : (opponentId === 'cpu' ? "CPU Thinking..." : "Opponent's Turn"))}
            </span>
          </div>
          
          <button 
            onClick={onToggleAuto}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all",
              isAuto ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40" : "bg-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            <Zap size={12} fill={isAuto ? "currentColor" : "none"} />
            Auto Battle: {isAuto ? "ON" : "OFF"}
          </button>
        </div>
        <button onClick={onForfeit} className="text-slate-500 hover:text-red-500 transition-colors flex items-center gap-2 text-sm">
          <LogOut size={16} /> {state.status === 'finished' ? 'Exit' : 'Forfeit'}
        </button>
      </div>

      {/* Battle Field */}
      <div className="flex-1 relative flex flex-col lg:flex-row items-center justify-center gap-12 p-8 overflow-hidden">
        {/* Opponent Side */}
        <div className="flex flex-col items-center lg:items-end gap-4 w-full max-w-md">
          <div className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold capitalize">{activeOpponentPoke.name} {opponentId === 'cpu' && <span className="text-[10px] bg-slate-800 px-1 rounded">CPU</span>}</h3>
              <span className="font-mono text-xs text-slate-500">Lv. 50</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(activeOpponentPoke.currentHp / activeOpponentPoke.maxHp) * 100}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  (activeOpponentPoke.currentHp / activeOpponentPoke.maxHp) > 0.5 ? "bg-green-500" : 
                  (activeOpponentPoke.currentHp / activeOpponentPoke.maxHp) > 0.2 ? "bg-yellow-500" : "bg-red-500"
                )}
              />
            </div>
            <div className="flex justify-end font-mono text-[10px] text-slate-400">
              {activeOpponentPoke.currentHp} / {activeOpponentPoke.maxHp} HP
            </div>
          </div>
          
          <motion.div 
            key={activeOpponentPoke.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative"
          >
            <img 
              src={activeOpponentPoke.image} 
              alt={activeOpponentPoke.name} 
              className="w-48 h-48 lg:w-64 lg:h-64 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        {/* VS Divider */}
        <div className="hidden lg:flex flex-col items-center gap-4">
          <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
          <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center font-mono text-slate-500 italic">VS</div>
          <div className="w-px h-24 bg-gradient-to-t from-transparent via-slate-800 to-transparent" />
        </div>

        {/* Player Side */}
        <div className="flex flex-col-reverse lg:flex-col items-center lg:items-start gap-4 w-full max-w-md">
          <motion.div 
            key={activePlayerPoke.id}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative"
          >
            <img 
              src={activePlayerPoke.image} 
              alt={activePlayerPoke.name} 
              className="w-48 h-48 lg:w-64 lg:h-64 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold capitalize">{activePlayerPoke.name}</h3>
              <span className="font-mono text-xs text-slate-500">Lv. 50</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(activePlayerPoke.currentHp / activePlayerPoke.maxHp) * 100}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  (activePlayerPoke.currentHp / activePlayerPoke.maxHp) > 0.5 ? "bg-green-500" : 
                  (activePlayerPoke.currentHp / activePlayerPoke.maxHp) > 0.2 ? "bg-yellow-500" : "bg-red-500"
                )}
              />
            </div>
            <div className="flex justify-end font-mono text-[10px] text-slate-400">
              {activePlayerPoke.currentHp} / {activePlayerPoke.maxHp} HP
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Log */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deck Status */}
        <div className="hidden lg:block">
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Your Team</h4>
          <div className="flex gap-2">
            {player.deck.map((p, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center p-1 transition-all",
                  p.isFainted ? "bg-slate-950 border-slate-800 grayscale" : 
                  i === player.activePokemonIndex ? "bg-blue-600/20 border-blue-600" : "bg-slate-800 border-slate-700"
                )}
              >
                <img src={p.image} alt={p.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col justify-center gap-4">
          {state.status === 'finished' ? (
            <div className="text-center">
              <h2 className={cn("text-3xl font-bold mb-4", state.winner === socketId ? "text-green-500" : "text-red-500")}>
                {state.winner === socketId ? "VICTORY!" : "DEFEAT"}
              </h2>
              <button onClick={onForfeit} className="btn-primary w-full">Return to Deck Builder</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activePlayerPoke.moves.map((move, i) => (
                <button
                  key={i}
                  onClick={() => onAttack(move)}
                  disabled={!isMyTurn || isAuto}
                  className={cn(
                    "relative group p-4 rounded-xl border transition-all flex flex-col items-start gap-1 overflow-hidden",
                    isMyTurn && !isAuto 
                      ? "bg-slate-800 border-slate-700 hover:border-blue-600 hover:bg-slate-700 active:scale-95" 
                      : "bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex justify-between w-full items-center">
                    <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[80%]">{move.name.replace('-', ' ')}</span>
                    <TypeBadge type={move.type} className="scale-75 origin-right" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <Sword size={10} /> PWR: {move.power}
                  </div>
                  {isMyTurn && !isAuto && (
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Battle Log */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 h-48 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2">
          <AnimatePresence initial={false}>
            {state.log.map((entry, i) => (
              <motion.div 
                key={state.log.length - i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "pb-1 border-b border-slate-900 last:border-0",
                  i === 0 ? "text-blue-400 font-bold" : "text-slate-500"
                )}
              >
                {entry}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

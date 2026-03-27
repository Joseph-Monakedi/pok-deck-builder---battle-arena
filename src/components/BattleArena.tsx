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
  onSwitch: (index: number) => void;
  onForfeit: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ state, socketId, onAttack, onSwitch, onForfeit }) => {
  const [showSwitch, setShowSwitch] = React.useState(false);
  const playerIds = Object.keys(state.players);
  const opponentId = playerIds.find(id => id !== socketId)!;
  
  const player = state.players[socketId];
  const opponent = state.players[opponentId];

  const activePlayerPoke = player.deck[player.activePokemonIndex];
  const activeOpponentPoke = opponent.deck[opponent.activePokemonIndex];

  const isMyTurn = state.turn === socketId && state.status === 'active';
  const isSpectator = !playerIds.includes(socketId);

  // If spectator, show p1 as player and p2 as opponent for consistency
  const p1Id = playerIds[0];
  const p2Id = playerIds[1];
  const p1 = state.players[p1Id];
  const p2 = state.players[p2Id];

  const displayPlayer = isSpectator ? p1 : player;
  const displayOpponent = isSpectator ? p2 : opponent;
  const displayActivePlayerPoke = displayPlayer.deck[displayPlayer.activePokemonIndex];
  const displayActiveOpponentPoke = displayOpponent.deck[displayOpponent.activePokemonIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="glass-header px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", state.turn === socketId ? "bg-green-500 animate-pulse" : "bg-slate-700")} />
            <span className="font-mono text-sm uppercase tracking-widest">
              {state.status === 'finished' ? 'Battle Over' : (isSpectator ? `Turn: ${state.players[state.turn].name}` : (isMyTurn ? "Your Turn" : "Opponent's Turn"))}
            </span>
          </div>
          {isSpectator && (
            <div className="px-3 py-1 bg-blue-600/20 border border-blue-600/40 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Spectating
            </div>
          )}
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
              <h3 className="text-lg font-bold capitalize">{displayActiveOpponentPoke.name}</h3>
              <div className="flex gap-1">
                {displayOpponent.deck.map((p, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3 h-3 rounded-full border",
                      p.isFainted ? "bg-red-900 border-red-700" : 
                      displayOpponent.seenPokemonIndices.includes(i) ? "bg-green-500 border-green-400" : "bg-slate-700 border-slate-600"
                    )}
                    title={displayOpponent.seenPokemonIndices.includes(i) ? p.name : "Unknown"}
                  />
                ))}
              </div>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(displayActiveOpponentPoke.currentHp / displayActiveOpponentPoke.maxHp) * 100}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  (displayActiveOpponentPoke.currentHp / displayActiveOpponentPoke.maxHp) > 0.5 ? "bg-green-500" : 
                  (displayActiveOpponentPoke.currentHp / displayActiveOpponentPoke.maxHp) > 0.2 ? "bg-yellow-500" : "bg-red-500"
                )}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <div className="flex gap-2">
                {displayActiveOpponentPoke.types.map(t => <TypeBadge key={t} type={t} className="scale-75 origin-left" />)}
              </div>
              <span>{displayActiveOpponentPoke.currentHp} / {displayActiveOpponentPoke.maxHp} HP</span>
            </div>
          </div>
          
          <motion.div 
            key={displayActiveOpponentPoke.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative"
          >
            <img 
              src={displayActiveOpponentPoke.image} 
              alt={displayActiveOpponentPoke.name} 
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
            key={displayActivePlayerPoke.id}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative"
          >
            <img 
              src={displayActivePlayerPoke.image} 
              alt={displayActivePlayerPoke.name} 
              className="w-48 h-48 lg:w-64 lg:h-64 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold capitalize">{displayActivePlayerPoke.name}</h3>
              <div className="flex gap-1">
                {displayPlayer.deck.map((p, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3 h-3 rounded-full border",
                      p.isFainted ? "bg-red-900 border-red-700" : 
                      i === displayPlayer.activePokemonIndex ? "bg-blue-500 border-blue-400" : "bg-green-500 border-green-400"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(displayActivePlayerPoke.currentHp / displayActivePlayerPoke.maxHp) * 100}%` }}
                className={cn(
                  "h-full transition-all duration-500",
                  (displayActivePlayerPoke.currentHp / displayActivePlayerPoke.maxHp) > 0.5 ? "bg-green-500" : 
                  (displayActivePlayerPoke.currentHp / displayActivePlayerPoke.maxHp) > 0.2 ? "bg-yellow-500" : "bg-red-500"
                )}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <div className="flex gap-2">
                {displayActivePlayerPoke.types.map(t => <TypeBadge key={t} type={t} className="scale-75 origin-left" />)}
              </div>
              <span>{displayActivePlayerPoke.currentHp} / {displayActivePlayerPoke.maxHp} HP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Log */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Status / Switch */}
        <div className="hidden lg:block">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase text-slate-500">Your Team</h4>
            {!isSpectator && state.status === 'active' && (
              <button 
                onClick={() => setShowSwitch(!showSwitch)}
                className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded transition-all",
                  showSwitch ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {showSwitch ? "Back to Moves" : "Switch Pokemon"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {displayPlayer.deck.map((p, i) => (
              <button 
                key={i} 
                disabled={!showSwitch || p.isFainted || i === displayPlayer.activePokemonIndex || !isMyTurn}
                onClick={() => {
                  onSwitch(i);
                  setShowSwitch(false);
                }}
                className={cn(
                  "w-12 h-12 rounded-lg border flex items-center justify-center p-1 transition-all relative overflow-hidden",
                  p.isFainted ? "bg-slate-950 border-slate-800 grayscale opacity-50" : 
                  i === displayPlayer.activePokemonIndex ? "bg-blue-600/20 border-blue-600" : "bg-slate-800 border-slate-700",
                  showSwitch && !p.isFainted && i !== displayPlayer.activePokemonIndex && isMyTurn ? "hover:border-blue-400 hover:scale-105 cursor-pointer" : ""
                )}
              >
                <img src={p.image} alt={p.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                {p.isFainted && <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center text-[8px] font-bold text-red-500 uppercase">Fainted</div>}
              </button>
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
              <button onClick={onForfeit} className="btn-primary w-full">Return to Lobby</button>
            </div>
          ) : isSpectator ? (
            <div className="text-center p-6 border border-slate-800 rounded-2xl bg-slate-950/50">
              <Zap size={24} className="mx-auto mb-2 text-blue-500 animate-pulse" />
              <p className="text-sm text-slate-400">Spectating Match</p>
              <p className="text-xs text-slate-600 mt-1">You are watching {p1.name} vs {p2.name}</p>
            </div>
          ) : showSwitch ? (
            <div className="text-center p-4 border border-blue-600/20 rounded-2xl bg-blue-600/5">
              <p className="text-sm font-bold text-blue-400 mb-2">Select a Pokemon to Switch</p>
              <p className="text-xs text-slate-500">Switching takes your turn!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {displayActivePlayerPoke.moves.map((move, i) => (
                <button
                  key={i}
                  onClick={() => onAttack(move)}
                  disabled={!isMyTurn}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col items-start gap-1 transition-all group relative overflow-hidden",
                    isMyTurn ? "bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-700 active:scale-95" : "bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex justify-between w-full items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[70%]">{move.name.replace('-', ' ')}</span>
                    <TypeBadge type={move.type} className="scale-75 origin-right" />
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                    <Sword size={8} /> PWR: {move.power}
                  </div>
                  {isMyTurn && <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PokemonSummary, BattleState, LobbyState, Move } from './types';
import { fetchPokemonList, fetchPokemonByNameOrId } from './services/pokeApi';
import { PokemonCard } from './components/PokemonCard';
import { DeckSidebar } from './components/DeckSidebar';
import { BattleArena } from './components/BattleArena';
import { Search, Loader2, Swords, Trophy, Github, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [pokemonList, setPokemonList] = useState<PokemonSummary[]>([]);
  const [deck, setDeck] = useState<PokemonSummary[]>(() => {
    const saved = localStorage.getItem('poke-deck');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState>({ onlinePlayers: [], activeMatches: [] });
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('poke-player-name') || '');
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [challengeRequest, setChallengeRequest] = useState<{ fromId: string; fromName: string } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [globalSearchResult, setGlobalSearchResult] = useState<PokemonSummary | null>(null);
  const fetchedOffsets = useRef<Set<number>>(new Set());

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setOffset(prev => prev + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading]);

  useEffect(() => {
    const loadPokemon = async () => {
      if (fetchedOffsets.current.has(offset)) return;
      
      setLoading(true);
      try {
        const data = await fetchPokemonList(offset);
        setPokemonList(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = data.filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        fetchedOffsets.current.add(offset);
      } catch (error) {
        console.error('Failed to fetch pokemon:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPokemon();
  }, [offset]);

  useEffect(() => {
    localStorage.setItem('poke-deck', JSON.stringify(deck));
  }, [deck]);

  useEffect(() => {
    localStorage.setItem('poke-player-name', playerName);
  }, [playerName]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (playerName) {
        newSocket.emit('join_lobby', playerName);
      }
    });

    newSocket.on('lobby_update', (state: LobbyState) => {
      setLobbyState(state);
    });

    newSocket.on('battle_start', (state: BattleState) => {
      setBattleState(state);
      setIsSearching(false);
      setIsLobbyOpen(false);
      setChallengeRequest(null);
    });

    newSocket.on('challenge_received', (data: { fromId: string; fromName: string }) => {
      setChallengeRequest(data);
    });

    newSocket.on('battle_update', (state: BattleState) => {
      setBattleState(state);
    });

    newSocket.on('player_disconnected', () => {
      alert('Opponent disconnected');
      setBattleState(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && socket.connected && playerName) {
      socket.emit('join_lobby', playerName);
    }
  }, [playerName, socket]);

  useEffect(() => {
    const searchGlobal = async () => {
      if (!searchTerm || searchTerm.length < 3) {
        setGlobalSearchResult(null);
        return;
      }

      // Check if already in local list
      const localMatch = pokemonList.find(p => 
        p.name.toLowerCase() === searchTerm.toLowerCase() || 
        p.id.toString() === searchTerm
      );

      if (localMatch) {
        setGlobalSearchResult(null);
        return;
      }

      try {
        const result = await fetchPokemonByNameOrId(searchTerm);
        setGlobalSearchResult(result);
      } catch (e) {
        setGlobalSearchResult(null);
      }
    };

    const timer = setTimeout(searchGlobal, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, pokemonList]);

  const addToDeck = (pokemon: PokemonSummary) => {
    if (deck.length >= 6) return;
    if (deck.find(p => p.id === pokemon.id)) return;
    setDeck([...deck, pokemon]);
  };

  const removeFromDeck = (id: number) => {
    setDeck(deck.filter(p => p.id !== id));
  };

  const generateRandomDeck = () => {
    if (pokemonList.length < 6) return;
    // Ensure we only pick from unique IDs in case pokemonList has duplicates
    const uniquePokemon = Array.from(new Map(pokemonList.map(p => [p.id, p])).values());
    const shuffled = [...uniquePokemon].sort(() => 0.5 - Math.random());
    setDeck(shuffled.slice(0, 6));
  };

  const startBattle = () => {
    if (deck.length === 0 || !socket) return;
    setIsLobbyOpen(true);
  };

  const joinOnlineQueue = () => {
    if (!socket || !playerName) return;
    setIsSearching(true);
    socket.emit('join_queue', { name: playerName, deck });
  };

  const battleCPU = () => {
    if (!socket || !playerName) return;
    socket.emit('join_cpu_battle', { name: playerName, deck });
  };

  const spectateMatch = (roomId: string) => {
    if (!socket) return;
    socket.emit('spectate_match', roomId);
    setIsLobbyOpen(false);
  };

  const handleAttack = (move: Move) => {
    if (!battleState || !socket) return;
    socket.emit('attack', { roomId: battleState.roomId, move });
  };

  const handleSwitch = (index: number) => {
    if (!battleState || !socket) return;
    socket.emit('switch_pokemon', { roomId: battleState.roomId, index });
  };

  const acceptChallenge = () => {
    if (!socket || !challengeRequest) return;
    socket.emit('accept_challenge', { fromId: challengeRequest.fromId, deck });
    setChallengeRequest(null);
  };

  const declineChallenge = () => {
    if (!socket || !challengeRequest) return;
    socket.emit('decline_challenge', { fromId: challengeRequest.fromId });
    setChallengeRequest(null);
  };

  const filteredPokemon = pokemonList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm)
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header className="glass-header px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Swords className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">PokéDeck Arena</h1>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">v1.0.0 Stable</p>
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search Pokémon by name or ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-600 transition-colors text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="hidden md:flex items-center gap-4 text-slate-500">
              <Trophy size={20} className="hover:text-yellow-500 cursor-pointer transition-colors" />
              <Github size={20} className="hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {globalSearchResult && (
              <div className="mb-8">
                <h2 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <Search size={12} /> Global Search Result
                </h2>
                <div className="max-w-xs">
                  <PokemonCard
                    pokemon={globalSearchResult}
                    onAdd={addToDeck}
                    isInDeck={deck.some(p => p.id === globalSearchResult.id)}
                  />
                </div>
                <div className="mt-6 border-b border-slate-800" />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPokemon.map((pokemon, index) => (
                <div key={`${pokemon.id}-${index}`} ref={index === filteredPokemon.length - 1 ? lastElementRef : null}>
                  <PokemonCard
                    pokemon={pokemon}
                    onAdd={addToDeck}
                    isInDeck={deck.some(p => p.id === pokemon.id)}
                  />
                </div>
              ))}
            </div>
            
            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <DeckSidebar 
        deck={deck} 
        onRemove={removeFromDeck} 
        onBattle={startBattle}
        onRandomDeck={generateRandomDeck}
        isSearching={isSearching}
      />

      {/* Lobby Modal */}
      <AnimatePresence>
        {isLobbyOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Battle Lobby</h2>
                <button onClick={() => setIsLobbyOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 border border-blue-600/40 rounded-xl flex items-center justify-center">
                    <Trophy className="text-blue-400" size={24} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Trainer Profile</label>
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter trainer name..."
                      className="w-full bg-transparent border-none p-0 text-lg font-bold focus:outline-none focus:ring-0 placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={joinOnlineQueue}
                    disabled={isSearching || !playerName || deck.length === 0}
                    className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center gap-2 group"
                  >
                    <Swords size={24} className="group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                      <div className="font-bold text-sm">Find Match</div>
                      {isSearching && (
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          <Loader2 className="animate-spin" size={10} />
                          Searching...
                        </div>
                      )}
                    </div>
                  </button>

                  <button 
                    onClick={battleCPU}
                    disabled={!playerName || deck.length === 0}
                    className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center gap-2 group"
                  >
                    <Zap size={24} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-sm">Battle CPU</div>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                      Online Players
                      <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">{lobbyState.onlinePlayers.length}</span>
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                      {lobbyState.onlinePlayers.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">No players online</p>
                      ) : lobbyState.onlinePlayers.map(player => (
                        <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              player.status === 'battling' ? 'bg-red-500' : 
                              player.status === 'searching' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <span className="text-sm font-medium">{player.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {player.id !== socket?.id && player.status === 'idle' && (
                              <button 
                                onClick={() => socket?.emit('challenge_player', { targetId: player.id, deck })}
                                className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition-colors"
                              >
                                Challenge
                              </button>
                            )}
                            <span className="text-[10px] text-slate-500 uppercase">{player.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Active Matches</h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                      {lobbyState.activeMatches.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">No active matches</p>
                      ) : (
                        lobbyState.activeMatches.map(match => (
                          <div key={match.roomId} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                            <div className="text-xs">
                              <span className="text-blue-400">{match.p1Name}</span>
                              <span className="mx-1 text-slate-600">vs</span>
                              <span className="text-red-400">{match.p2Name}</span>
                            </div>
                            <button 
                              onClick={() => spectateMatch(match.roomId)}
                              className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                            >
                              Spectate
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-slate-500">
                Make sure your deck is ready before entering!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Overlay */}
      <AnimatePresence>
        {battleState && socket && (
          <BattleArena 
            state={battleState} 
            socketId={socket.id || ''} 
            onAttack={handleAttack}
            onSwitch={handleSwitch}
            onForfeit={() => setBattleState(null)}
          />
        )}
      </AnimatePresence>

      {/* Challenge Modal */}
      <AnimatePresence>
        {challengeRequest && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-[120] bg-slate-900 border border-blue-600 p-6 rounded-2xl shadow-2xl max-w-xs w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Swords className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Challenge Received!</h3>
                <p className="text-xs text-slate-400">{challengeRequest.fromName} wants to battle!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={acceptChallenge}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Accept
              </button>
              <button 
                onClick={declineChallenge}
                className="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


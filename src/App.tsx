import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PokemonSummary, BattleState } from './types';
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
  const [battleState, setBattleState] = useState<BattleState | null>(null);
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
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('battle_start', (state: BattleState) => {
      setBattleState(state);
      setIsSearching(false);
      setIsLobbyOpen(false);
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
    if (!socket) return;
    setIsSearching(true);
    socket.emit('join_queue', deck);
  };

  const battleCPU = () => {
    if (!socket) return;
    socket.emit('join_cpu_battle', deck);
  };

  const handleAttack = (move: any) => {
    if (!battleState || !socket) return;
    socket.emit('attack', { roomId: battleState.roomId, move });
  };

  const handleToggleAuto = () => {
    if (!battleState || !socket) return;
    socket.emit('toggle_auto', { roomId: battleState.roomId });
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

              <div className="space-y-4">
                <button 
                  onClick={joinOnlineQueue}
                  disabled={isSearching}
                  className="w-full p-6 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all flex flex-col items-center gap-2 group"
                >
                  <Swords size={32} className="group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="font-bold text-lg">Find Match (Online)</div>
                    <div className="text-xs text-blue-200">Battle against other trainers</div>
                  </div>
                  {isSearching && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Loader2 className="animate-spin" size={12} />
                      Searching for opponent...
                    </div>
                  )}
                </button>

                <button 
                  onClick={battleCPU}
                  className="w-full p-6 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all flex flex-col items-center gap-2 group"
                >
                  <Zap size={32} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="font-bold text-lg">Battle CPU</div>
                    <div className="text-xs text-slate-400">Practice against the computer</div>
                  </div>
                </button>
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
            onToggleAuto={handleToggleAuto}
            onForfeit={() => setBattleState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


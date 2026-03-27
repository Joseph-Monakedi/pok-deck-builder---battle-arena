import { Pokemon, PokemonSummary, Move } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';

async function fetchMoves(moveUrls: string[]): Promise<Move[]> {
  const detailedMoves = await Promise.all(
    moveUrls.slice(0, 4).map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return {
          name: data.name,
          power: data.power || 40, // Default power if not specified
          type: data.type.name
        };
      } catch (e) {
        return null;
      }
    })
  );
  return detailedMoves.filter((m): m is Move => m !== null);
}

export async function fetchPokemonList(offset: number = 0, limit: number = 20): Promise<PokemonSummary[]> {
  try {
    const response = await fetch(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const detailedPromises = data.results.map(async (p: any) => {
      try {
        const res = await fetch(p.url);
        if (!res.ok) return null;
        const details: Pokemon & { moves: { move: { url: string } }[] } = await res.json();
        const moves = await fetchMoves(details.moves.map(m => m.move.url));
        
        return {
          id: details.id,
          name: details.name,
          types: details.types.map((t: any) => t.type.name),
          image: details.sprites.other['official-artwork'].front_default,
          stats: {
            hp: details.stats.find(s => s.stat.name === 'hp')?.base_stat || 50,
            attack: details.stats.find(s => s.stat.name === 'attack')?.base_stat || 50,
            defense: details.stats.find(s => s.stat.name === 'defense')?.base_stat || 50,
            speed: details.stats.find(s => s.stat.name === 'speed')?.base_stat || 50,
          },
          moves
        };
      } catch (e) {
        console.error(`Failed to fetch details for ${p.name}:`, e);
        return null;
      }
    });

    const results = await Promise.all(detailedPromises);
    return results.filter((p): p is PokemonSummary => p !== null);
  } catch (error) {
    console.error('Error fetching pokemon list:', error);
    throw error;
  }
}

export async function fetchPokemonByNameOrId(nameOrId: string): Promise<PokemonSummary | null> {
  try {
    const res = await fetch(`${BASE_URL}/pokemon/${nameOrId.toLowerCase()}`);
    if (!res.ok) return null;
    const details: Pokemon & { moves: { move: { url: string } }[] } = await res.json();
    const moves = await fetchMoves(details.moves.map(m => m.move.url));
    
    return {
      id: details.id,
      name: details.name,
      types: details.types.map((t: any) => t.type.name),
      image: details.sprites.other['official-artwork'].front_default,
      stats: {
        hp: details.stats.find(s => s.stat.name === 'hp')?.base_stat || 50,
        attack: details.stats.find(s => s.stat.name === 'attack')?.base_stat || 50,
        defense: details.stats.find(s => s.stat.name === 'defense')?.base_stat || 50,
        speed: details.stats.find(s => s.stat.name === 'speed')?.base_stat || 50,
      },
      moves
    };
  } catch (e) {
    console.error(`Failed to fetch pokemon ${nameOrId}:`, e);
    return null;
  }
}

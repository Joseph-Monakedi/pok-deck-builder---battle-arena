import { Pokemon, PokemonSummary } from '../types';

const BASE_URL = 'https://pokeapi.co/api/v2';

export async function fetchPokemonList(offset: number = 0, limit: number = 20): Promise<PokemonSummary[]> {
  try {
    const response = await fetch(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const detailedPromises = data.results.map(async (p: any) => {
      try {
        const res = await fetch(p.url);
        if (!res.ok) return null;
        const details: Pokemon = await res.json();
        
        // Fetch 4 moves
        const moves = await Promise.all(
          details.moves.slice(0, 4).map(async (m: any) => {
            try {
              const moveRes = await fetch(m.move.url);
              const moveDetails = await moveRes.json();
              return {
                name: m.move.name,
                power: moveDetails.power || 40,
                type: moveDetails.type.name
              };
            } catch (e) {
              return { name: m.move.name, power: 40, type: details.types[0].type.name };
            }
          })
        );

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
    const details: Pokemon = await res.json();
    
    // Fetch 4 moves
    const moves = await Promise.all(
      details.moves.slice(0, 4).map(async (m: any) => {
        try {
          const moveRes = await fetch(m.move.url);
          const moveDetails = await moveRes.json();
          return {
            name: m.move.name,
            power: moveDetails.power || 40,
            type: moveDetails.type.name
          };
        } catch (e) {
          return { name: m.move.name, power: 40, type: details.types[0].type.name };
        }
      })
    );

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

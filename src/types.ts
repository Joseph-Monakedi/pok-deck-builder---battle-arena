export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprites: {
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
}

export interface Move {
  name: string;
  power: number;
  type: string;
}

export interface PokemonSummary {
  id: number;
  name: string;
  types: string[];
  image: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  moves: Move[];
}

export interface BattlePokemon extends PokemonSummary {
  currentHp: number;
  maxHp: number;
  isFainted: boolean;
}

export interface Player {
  id: string;
  deck: BattlePokemon[];
  activePokemonIndex: number;
  isReady: boolean;
  isAuto: boolean;
}

export interface BattleState {
  roomId: string;
  players: { [id: string]: Player };
  turn: string; // socket id
  log: string[];
  status: 'waiting' | 'active' | 'finished';
  winner?: string;
}

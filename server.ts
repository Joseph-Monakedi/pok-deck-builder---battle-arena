import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simplified Type Effectiveness Chart
const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, fire: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const PORT = 3000;

  // Battle Logic State
  const rooms = new Map();
  const queue: string[] = [];

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_queue', (deck) => {
      console.log('User joined queue:', socket.id);
      queue.push(socket.id);
      socket.data.deck = deck;

      if (queue.length >= 2) {
        const p1Id = queue.shift()!;
        const p2Id = queue.shift()!;
        const roomId = `room_${p1Id}_${p2Id}`;

        const p1Socket = io.sockets.sockets.get(p1Id);
        const p2Socket = io.sockets.sockets.get(p2Id);

        if (p1Socket && p2Socket) {
          p1Socket.join(roomId);
          p2Socket.join(roomId);

          const battleState = {
            roomId,
            players: {
              [p1Id]: {
                id: p1Id,
                deck: p1Socket.data.deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                isAuto: false,
              },
              [p2Id]: {
                id: p2Id,
                deck: p2Socket.data.deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                isAuto: false,
              },
            },
            turn: p1Id,
            log: ['Battle started!'],
            status: 'active',
          };

          rooms.set(roomId, battleState);
          io.to(roomId).emit('battle_start', battleState);
        }
      }
    });

    socket.on('join_cpu_battle', (deck) => {
      const roomId = `cpu_room_${socket.id}`;
      socket.join(roomId);

      const cpuDeck = deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false }));
      
      const battleState = {
        roomId,
        players: {
          [socket.id]: {
            id: socket.id,
            deck: deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
            activePokemonIndex: 0,
            isReady: true,
            isAuto: false,
          },
          'cpu': {
            id: 'cpu',
            deck: cpuDeck,
            activePokemonIndex: 0,
            isReady: true,
            isAuto: true,
          },
        },
        turn: socket.id,
        log: ['Battle against CPU started!'],
        status: 'active',
      };

      rooms.set(roomId, battleState);
      socket.emit('battle_start', battleState);
    });

    socket.on('toggle_auto', ({ roomId }) => {
      const state = rooms.get(roomId);
      if (!state || !state.players[socket.id]) return;
      
      state.players[socket.id].isAuto = !state.players[socket.id].isAuto;
      io.to(roomId).emit('battle_update', state);

      // If it's their turn and they just turned on auto, trigger attack
      if (state.players[socket.id].isAuto && state.turn === socket.id && state.status === 'active') {
        setTimeout(() => {
          const playerIds = Object.keys(state.players);
          const opponentId = playerIds.find(id => id !== socket.id)!;
          const attacker = state.players[socket.id];
          const move = attacker.deck[attacker.activePokemonIndex].moves[Math.floor(Math.random() * 4)];
          processAttack(state, socket.id, opponentId, move);
          io.to(roomId).emit('battle_update', state);
          
          // If next is CPU or Auto player, trigger them too
          checkAndTriggerNextTurn(state, roomId);
        }, 1000);
      }
    });

    socket.on('attack', ({ roomId, move }) => {
      const state = rooms.get(roomId);
      if (!state || state.turn !== socket.id || state.status !== 'active') return;

      const playerIds = Object.keys(state.players);
      const opponentId = playerIds.find(id => id !== socket.id)!;
      
      processAttack(state, socket.id, opponentId, move);
      io.to(roomId).emit('battle_update', state);

      checkAndTriggerNextTurn(state, roomId);
    });

    function checkAndTriggerNextTurn(state: any, roomId: string) {
      if (state.status !== 'active') return;
      
      const nextPlayerId = state.turn;
      const nextPlayer = state.players[nextPlayerId];
      
      if (nextPlayer.isAuto || nextPlayerId === 'cpu') {
        setTimeout(() => {
          const currentState = rooms.get(roomId);
          if (!currentState || currentState.turn !== nextPlayerId || currentState.status !== 'active') return;
          
          const opponentId = Object.keys(currentState.players).find(id => id !== nextPlayerId)!;
          const attacker = currentState.players[nextPlayerId];
          const randomMove = attacker.deck[attacker.activePokemonIndex].moves[Math.floor(Math.random() * 4)];
          
          processAttack(currentState, nextPlayerId, opponentId, randomMove);
          io.to(roomId).emit('battle_update', currentState);
          
          checkAndTriggerNextTurn(currentState, roomId);
        }, 1500);
      }
    }

    function processAttack(state: any, attackerId: string, opponentId: string, move: any) {
      const attacker = state.players[attackerId];
      const opponent = state.players[opponentId];
      
      const attackerPoke = attacker.deck[attacker.activePokemonIndex];
      const opponentPoke = opponent.deck[opponent.activePokemonIndex];

      // Damage calculation with type effectiveness and move power
      let multiplier = 1;
      const moveType = move.type;
      opponentPoke.types.forEach((defType: string) => {
        if (TYPE_EFFECTIVENESS[moveType] && TYPE_EFFECTIVENESS[moveType][defType] !== undefined) {
          multiplier *= TYPE_EFFECTIVENESS[moveType][defType];
        }
      });

      const movePower = move.power || 40;
      const baseDamage = (attackerPoke.stats.attack / opponentPoke.stats.defense) * (movePower / 5);
      const randomFactor = Math.random() * 5;
      const damage = Math.max(5, Math.floor((baseDamage + randomFactor) * multiplier));
      
      opponentPoke.currentHp = Math.max(0, opponentPoke.currentHp - damage);
      
      let logMsg = `${attackerPoke.name} used ${move.name.replace('-', ' ')} on ${opponentPoke.name} for ${damage} damage!`;
      if (multiplier > 1) logMsg += " It's super effective!";
      if (multiplier < 1 && multiplier > 0) logMsg += " It's not very effective...";
      if (multiplier === 0) logMsg += " It had no effect...";
      
      state.log.unshift(logMsg);

      if (opponentPoke.currentHp <= 0) {
        opponentPoke.isFainted = true;
        state.log.unshift(`${opponentPoke.name} fainted!`);
        
        const allFainted = opponent.deck.every((p: any) => p.isFainted);
        if (allFainted) {
          state.status = 'finished';
          state.winner = attackerId;
          state.log.unshift(`${attackerId === 'cpu' ? 'CPU' : 'Player'} wins the battle!`);
        } else {
          const nextIndex = opponent.deck.findIndex((p: any) => !p.isFainted);
          opponent.activePokemonIndex = nextIndex;
          state.log.unshift(`${opponent.deck[nextIndex].name} entered the battle!`);
        }
      }

      if (state.status !== 'finished') {
        state.turn = opponentId;
      }
    }

    socket.on('disconnect', () => {
      const qIndex = queue.indexOf(socket.id);
      if (qIndex > -1) queue.splice(qIndex, 1);
      
      // Handle room cleanup/forfeit
      rooms.forEach((state, roomId) => {
        if (state.players[socket.id]) {
          io.to(roomId).emit('player_disconnected');
          rooms.delete(roomId);
        }
      });
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

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
  const queue: { id: string; name: string; deck: any[] }[] = [];
  const onlinePlayers = new Map<string, { id: string; name: string; status: 'idle' | 'searching' | 'battling' }>();
  const pendingChallenges = new Map<string, { challengerId: string; challengerDeck: any[] }>();

  function broadcastLobbyState() {
    const lobbyState = {
      onlinePlayers: Array.from(onlinePlayers.values()),
      activeMatches: Array.from(rooms.values())
        .filter(r => r.status === 'active')
        .map(r => ({
          roomId: r.roomId,
          p1Name: r.players[Object.keys(r.players)[0]].name || 'Player 1',
          p2Name: r.players[Object.keys(r.players)[1]].name || 'Player 2',
        })),
    };
    io.emit('lobby_update', lobbyState);
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_lobby', (name) => {
      onlinePlayers.set(socket.id, { id: socket.id, name: name || `Trainer ${socket.id.slice(0, 4)}`, status: 'idle' });
      broadcastLobbyState();
    });

    socket.on('join_queue', ({ name, deck }) => {
      console.log('User joined queue:', socket.id);
      const player = onlinePlayers.get(socket.id);
      if (player) player.status = 'searching';
      
      queue.push({ id: socket.id, name: name || player?.name || 'Trainer', deck });
      broadcastLobbyState();

      if (queue.length >= 2) {
        const p1 = queue.shift()!;
        const p2 = queue.shift()!;
        const roomId = `room_${p1.id}_${p2.id}`;

        const p1Socket = io.sockets.sockets.get(p1.id);
        const p2Socket = io.sockets.sockets.get(p2.id);

        if (p1Socket && p2Socket) {
          p1Socket.join(roomId);
          p2Socket.join(roomId);

          const p1Data = onlinePlayers.get(p1.id);
          const p2Data = onlinePlayers.get(p2.id);
          if (p1Data) p1Data.status = 'battling';
          if (p2Data) p2Data.status = 'battling';

          const battleState = {
            roomId,
            players: {
              [p1.id]: {
                id: p1.id,
                name: p1.name,
                deck: p1.deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                seenPokemonIndices: [0],
              },
              [p2.id]: {
                id: p2.id,
                name: p2.name,
                deck: p2.deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                seenPokemonIndices: [0],
              },
            },
            turn: p1.id,
            log: ['Battle started!'],
            status: 'active',
            spectators: [],
          };

          rooms.set(roomId, battleState);
          io.to(roomId).emit('battle_start', battleState);
          broadcastLobbyState();
        }
      }
    });

    socket.on('challenge_player', ({ targetId, deck }) => {
      const challenger = onlinePlayers.get(socket.id);
      const target = onlinePlayers.get(targetId);
      
      if (challenger && target && target.status === 'idle') {
        pendingChallenges.set(targetId, { challengerId: socket.id, challengerDeck: deck });
        io.to(targetId).emit('challenge_received', { 
          fromId: socket.id, 
          fromName: challenger.name 
        });
      }
    });

    socket.on('accept_challenge', ({ fromId, deck }) => {
      const challenge = pendingChallenges.get(socket.id);
      if (!challenge || challenge.challengerId !== fromId) return;

      const challenger = onlinePlayers.get(fromId);
      const challenged = onlinePlayers.get(socket.id);

      if (challenger && challenged) {
        const roomId = `challenge_${fromId}_${socket.id}`;
        const challengerSocket = io.sockets.sockets.get(fromId);
        
        if (challengerSocket) {
          challengerSocket.join(roomId);
          socket.join(roomId);

          challenger.status = 'battling';
          challenged.status = 'battling';

          const battleState = {
            roomId,
            players: {
              [fromId]: {
                id: fromId,
                name: challenger.name,
                deck: challenge.challengerDeck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                seenPokemonIndices: [0],
              },
              [socket.id]: {
                id: socket.id,
                name: challenged.name,
                deck: deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
                activePokemonIndex: 0,
                isReady: true,
                seenPokemonIndices: [0],
              },
            },
            turn: fromId,
            log: ['Challenge Battle started!'],
            status: 'active',
            spectators: [],
          };

          rooms.set(roomId, battleState);
          io.to(roomId).emit('battle_start', battleState);
          pendingChallenges.delete(socket.id);
          broadcastLobbyState();
        }
      }
    });

    socket.on('decline_challenge', (fromId) => {
      pendingChallenges.delete(socket.id);
      io.to(fromId).emit('challenge_declined');
    });

    socket.on('join_cpu_battle', ({ name, deck }) => {
      const roomId = `cpu_room_${socket.id}`;
      socket.join(roomId);

      const player = onlinePlayers.get(socket.id);
      if (player) player.status = 'battling';

      const cpuDeck = deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false }));
      
      const battleState = {
        roomId,
        players: {
          [socket.id]: {
            id: socket.id,
            name: name || player?.name || 'Trainer',
            deck: deck.map((p: any) => ({ ...p, currentHp: p.stats.hp, maxHp: p.stats.hp, isFainted: false })),
            activePokemonIndex: 0,
            isReady: true,
            seenPokemonIndices: [0],
          },
          'cpu': {
            id: 'cpu',
            name: 'CPU Trainer',
            deck: cpuDeck,
            activePokemonIndex: 0,
            isReady: true,
            seenPokemonIndices: [0],
          },
        },
        turn: socket.id,
        log: ['Battle against CPU started!'],
        status: 'active',
        spectators: [],
      };

      rooms.set(roomId, battleState);
      socket.emit('battle_start', battleState);
      broadcastLobbyState();
    });

    socket.on('spectate_match', (roomId) => {
      const state = rooms.get(roomId);
      if (state && state.status === 'active') {
        socket.join(roomId);
        state.spectators.push(socket.id);
        socket.emit('battle_start', state);
        io.to(roomId).emit('battle_update', state);
      }
    });

    socket.on('attack', ({ roomId, move }) => {
      const state = rooms.get(roomId);
      if (!state || state.turn !== socket.id || state.status !== 'active') return;

      const playerIds = Object.keys(state.players);
      const opponentId = playerIds.find(id => id !== socket.id)!;
      
      processAttack(state, socket.id, opponentId, move);

      if (state.status === 'active' && opponentId === 'cpu') {
        // CPU Turn
        setTimeout(() => {
          const currentState = rooms.get(roomId);
          if (currentState && currentState.status === 'active' && currentState.turn === 'cpu') {
            const cpu = currentState.players['cpu'];
            const activePoke = cpu.deck[cpu.activePokemonIndex];
            const randomMove = activePoke.moves[Math.floor(Math.random() * activePoke.moves.length)];
            processAttack(currentState, 'cpu', socket.id, randomMove);
            io.to(roomId).emit('battle_update', currentState);
          }
        }, 1500);
      }

      io.to(roomId).emit('battle_update', state);
    });

    socket.on('switch_pokemon', ({ roomId, index }) => {
      const state = rooms.get(roomId);
      if (!state || state.turn !== socket.id || state.status !== 'active') return;

      const player = state.players[socket.id];
      if (index === player.activePokemonIndex || player.deck[index].isFainted) return;

      const oldPoke = player.deck[player.activePokemonIndex];
      const newPoke = player.deck[index];
      
      player.activePokemonIndex = index;
      if (!player.seenPokemonIndices.includes(index)) {
        player.seenPokemonIndices.push(index);
      }

      state.log.unshift(`${player.name || 'Player'} withdrew ${oldPoke.name} and sent out ${newPoke.name}!`);
      
      const opponentId = Object.keys(state.players).find(id => id !== socket.id)!;
      state.turn = opponentId;

      if (state.status === 'active' && opponentId === 'cpu') {
        setTimeout(() => {
          const currentState = rooms.get(roomId);
          if (currentState && currentState.status === 'active' && currentState.turn === 'cpu') {
            const cpu = currentState.players['cpu'];
            const activePoke = cpu.deck[cpu.activePokemonIndex];
            const randomMove = activePoke.moves[Math.floor(Math.random() * activePoke.moves.length)];
            processAttack(currentState, 'cpu', socket.id, randomMove);
            io.to(roomId).emit('battle_update', currentState);
          }
        }, 1500);
      }

      io.to(roomId).emit('battle_update', state);
    });

    function processAttack(state: any, attackerId: string, opponentId: string, move: any) {
      const attacker = state.players[attackerId];
      const opponent = state.players[opponentId];
      
      const attackerPoke = attacker.deck[attacker.activePokemonIndex];
      const opponentPoke = opponent.deck[opponent.activePokemonIndex];

      // Damage calculation with type effectiveness and move power
      let multiplier = 1;
      const moveType = move.type.toLowerCase();
      opponentPoke.types.forEach((defType: string) => {
        if (TYPE_EFFECTIVENESS[moveType] && TYPE_EFFECTIVENESS[moveType][defType.toLowerCase()] !== undefined) {
          multiplier *= TYPE_EFFECTIVENESS[moveType][defType.toLowerCase()];
        }
      });

      const baseDamage = (attackerPoke.stats.attack / opponentPoke.stats.defense) * (move.power / 5);
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
          state.log.unshift(`${attacker.name || 'Player'} wins the battle!`);
          
          // Update player statuses
          Object.keys(state.players).forEach(id => {
            const p = onlinePlayers.get(id);
            if (p) p.status = 'idle';
          });
          broadcastLobbyState();
        } else {
          const nextIndex = opponent.deck.findIndex((p: any) => !p.isFainted);
          opponent.activePokemonIndex = nextIndex;
          if (!opponent.seenPokemonIndices.includes(nextIndex)) {
            opponent.seenPokemonIndices.push(nextIndex);
          }
          state.log.unshift(`${opponent.deck[nextIndex].name} entered the battle!`);
        }
      }

      if (state.status !== 'finished') {
        state.turn = opponentId;
      }
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      const qIndex = queue.findIndex(q => q.id === socket.id);
      if (qIndex > -1) queue.splice(qIndex, 1);
      
      onlinePlayers.delete(socket.id);
      broadcastLobbyState();

      // Handle room cleanup/forfeit
      rooms.forEach((state, roomId) => {
        if (state.players[socket.id]) {
          io.to(roomId).emit('player_disconnected');
          rooms.delete(roomId);
          
          // Update other player status
          const otherId = Object.keys(state.players).find(id => id !== socket.id);
          if (otherId) {
            const p = onlinePlayers.get(otherId);
            if (p) p.status = 'idle';
          }
          broadcastLobbyState();
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
   app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  if (req.path.includes('.')) return next();

  res.sendFile(path.join(__dirname, 'index.html'));
});
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

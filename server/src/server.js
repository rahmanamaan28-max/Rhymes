import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Game state management
const rooms = new Map();
const players = new Map();

// Utility functions
const generateRoomCode = () => Math.random().toString(36).substring(2, 7).toUpperCase();

const calculateScores = (answers, chuckPlayerId) => {
  const wordCounts = {};
  const scores = {};
  const playersInMatch = {};
  
  // Count occurrences of each word
  Object.entries(answers).forEach(([playerId, word]) => {
    if (!wordCounts[word]) wordCounts[word] = [];
    wordCounts[word].push(playerId);
  });
  
  // Calculate base scores
  Object.entries(wordCounts).forEach(([word, playerIds]) => {
    if (playerIds.length === 1) {
      // No match - 0 points and lose life
      scores[playerIds[0]] = { points: 0, lifeLost: true };
      playersInMatch[playerIds[0]] = false;
    } else if (playerIds.length === 2) {
      // Match with 1 other - 3 points each
      playerIds.forEach(id => {
        scores[id] = { points: 3, lifeLost: false };
        playersInMatch[id] = true;
      });
    } else {
      // Match with 2+ others - 1 point each
      playerIds.forEach(id => {
        scores[id] = { points: 1, lifeLost: false };
        playersInMatch[id] = true;
      });
    }
  });
  
  // Apply Chuck bonuses
  if (chuckPlayerId && answers[chuckPlayerId]) {
    const chuckWord = answers[chuckPlayerId];
    const chuckMatches = wordCounts[chuckWord] ? wordCounts[chuckWord].length - 1 : 0;
    
    // Chuck gets 1 point per match
    if (scores[chuckPlayerId]) {
      scores[chuckPlayerId].points += chuckMatches;
    }
    
    // Other players get 2 bonus points for matching with Chuck
    if (wordCounts[chuckWord]) {
      wordCounts[chuckWord].forEach(playerId => {
        if (playerId !== chuckPlayerId && scores[playerId]) {
          scores[playerId].points += 2;
        }
      });
    }
  }
  
  return { scores, playersInMatch };
};

// Socket event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Create new room
  socket.on('createRoom', (username) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: new Map(),
      host: socket.id,
      gameState: 'lobby',
      mode: null,
      rounds: null,
      currentRound: 0,
      currentChuck: null,
      currentWord: null,
      answers: {},
      timer: null
    };
    
    room.players.set(socket.id, {
      id: socket.id,
      username,
      score: 0,
      lives: 5,
      status: 'alive'
    });
    
    rooms.set(roomCode, room);
    players.set(socket.id, roomCode);
    socket.join(roomCode);
    
    socket.emit('roomCreated', { roomCode, isHost: true });
    io.to(roomCode).emit('playersUpdated', Array.from(room.players.values()));
  });
  
  // Join existing room
  socket.on('joinRoom', ({ roomCode, username }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    room.players.set(socket.id, {
      id: socket.id,
      username,
      score: 0,
      lives: 5,
      status: 'alive'
    });
    
    players.set(socket.id, roomCode);
    socket.join(roomCode);
    
    socket.emit('joinedRoom', { roomCode, isHost: false });
    io.to(roomCode).emit('playersUpdated', Array.from(room.players.values()));
    io.to(roomCode).emit('gameStateUpdated', room.gameState);
  });
  
  // Start game with selected mode
  socket.on('startGame', ({ mode, rounds }) => {
    const roomCode = players.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (room && room.host === socket.id) {
      room.mode = mode;
      room.rounds = rounds;
      room.gameState = 'playing';
      startNewRound(room);
      
      io.to(roomCode).emit('gameStarted', { mode, rounds });
      io.to(roomCode).emit('gameStateUpdated', 'playing');
    }
  });
  
  // Chuck submits word
  socket.on('submitWord', (word) => {
    const roomCode = players.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (room && room.currentChuck === socket.id) {
      room.currentWord = word.toUpperCase();
      room.gameState = 'answering';
      
      io.to(roomCode).emit('wordRevealed', { word: room.currentWord, chuck: getPlayerUsername(room, socket.id) });
      io.to(roomCode).emit('gameStateUpdated', 'answering');
      
      // Start answer timer
      startAnswerTimer(room);
    }
  });
  
  // Player submits answer
  socket.on('submitAnswer', (answer) => {
    const roomCode = players.get(socket.id);
    const room = rooms.get(roomCode);
    
    if (room && room.gameState === 'answering') {
      room.answers[socket.id] = answer.toUpperCase();
      
      // Check if all players have answered
      const alivePlayers = Array.from(room.players.values()).filter(p => p.status === 'alive');
      if (Object.keys(room.answers).length === alivePlayers.length) {
        calculateRoundResults(room);
      }
    }
  });
  
  // Disconnection handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomCode = players.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.players.delete(socket.id);
        io.to(roomCode).emit('playersUpdated', Array.from(room.players.values()));
        
        // If host leaves, assign new host or end game
        if (room.host === socket.id && room.players.size > 0) {
          room.host = room.players.keys().next().value;
        }
      }
      players.delete(socket.id);
    }
  });
});

function startNewRound(room) {
  room.currentRound++;
  room.answers = {};
  
  // Select random Chuck from alive players
  const alivePlayers = Array.from(room.players.values()).filter(p => p.status === 'alive');
  const randomIndex = Math.floor(Math.random() * alivePlayers.length);
  room.currentChuck = alivePlayers[randomIndex].id;
  
  room.gameState = 'chuckTurn';
  
  io.to(room.code).emit('newRound', {
    round: room.currentRound,
    chuck: getPlayerUsername(room, room.currentChuck),
    chuckId: room.currentChuck
  });
  
  io.to(room.currentChuck).emit('yourTurnAsChuck');
}

function calculateRoundResults(room) {
  const { scores, playersInMatch } = calculateScores(room.answers, room.currentChuck);
  
  // Update player scores and lives
  Object.entries(scores).forEach(([playerId, result]) => {
    const player = room.players.get(playerId);
    if (player) {
      player.score += result.points;
      if (result.lifeLost) {
        player.lives--;
        if (player.lives <= 0) {
          player.status = 'eliminated';
        }
      }
    }
  });
  
  // Check game end conditions
  const alivePlayers = Array.from(room.players.values()).filter(p => p.status === 'alive');
  const winner = checkForWinner(room);
  
  io.to(room.code).emit('roundResults', {
    answers: room.answers,
    scores: Object.fromEntries(room.players),
    winner,
    gameOver: !!winner
  });
  
  if (winner) {
    room.gameState = 'finished';
    io.to(room.code).emit('gameFinished', { winner });
  } else {
    // Continue to next round after delay
    setTimeout(() => startNewRound(room), 5000);
  }
}

function checkForWinner(room) {
  const alivePlayers = Array.from(room.players.values()).filter(p => p.status === 'alive');
  
  if (alivePlayers.length === 1) {
    return alivePlayers[0];
  }
  
  const playerWith20Points = alivePlayers.find(p => p.score >= 20);
  if (playerWith20Points) {
    return playerWith20Points;
  }
  
  return null;
}

function getPlayerUsername(room, playerId) {
  const player = room.players.get(playerId);
  return player ? player.username : 'Unknown';
}

function startAnswerTimer(room) {
  // Timer implementation for 20-second limit
  room.timer = setTimeout(() => {
    calculateRoundResults(room);
  }, 20000);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

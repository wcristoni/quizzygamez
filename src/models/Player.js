const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  gameId:          { type: String, required: true },
  score:           { type: Number, default: 0 },
  correct:         { type: Number, default: 0 },
  wrong:           { type: Number, default: 0 },
  skipped:         { type: Number, default: 0 },
  totalQuestions:  { type: Number, default: 0 },
  maxStreak:       { type: Number, default: 0 },
  weightedCorrect: { type: Number, default: 0 },
  weightedTotal:   { type: Number, default: 0 },
  playedAt:        { type: Date, default: Date.now },
}, { _id: false });

// Score de um jogador em um jogo específico
const gameScoreSchema = new mongoose.Schema({
  bestScore:              { type: Number, default: 0 },
  totalGames:             { type: Number, default: 0 },
  totalCorrect:           { type: Number, default: 0 },
  totalQuestions:         { type: Number, default: 0 },
  totalWeightedCorrect:   { type: Number, default: 0 },
  totalWeightedQuestions: { type: Number, default: 0 },
  maxStreak:              { type: Number, default: 0 },
  rankScore:              { type: Number, default: 0 },
  lastSeen:               { type: Date, default: null },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 60 },
  email:    { type: String, trim: true, lowercase: true, default: '' },
  deviceId: { type: String, required: true, trim: true },

  // Scores independentes por jogo — { "holypleiiiz": {...}, "geoquiz": {...} }
  scores: { type: Map, of: gameScoreSchema, default: () => new Map() },

  // Últimas 30 sessões (todos os jogos)
  recentSessions: { type: [sessionSchema], default: [] },

  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

playerSchema.index({ deviceId: 1 }, { unique: true });
playerSchema.index({ email: 1 });
playerSchema.index({ 'scores.holypleiiiz.rankScore': -1 });

module.exports = mongoose.model('Player', playerSchema);

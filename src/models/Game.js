const mongoose = require('mongoose');

const gameConfigSchema = new mongoose.Schema({
  defaultCount:    { type: Number, default: 10 },
  defaultTime:     { type: Number, default: 30 },
  difficulties:    { type: [String], default: ['easy', 'medium', 'hard'] },
  modes:           { type: [String], default: ['mixed'] },
  hasRanking:      { type: Boolean, default: true },
  hasOffline:      { type: Boolean, default: true },
  hasRefs:         { type: Boolean, default: false },
  rankingWeights:  {
    accuracy:      { type: Number, default: 0.7 },
    volume:        { type: Number, default: 0.2 },
    frequency:     { type: Number, default: 0.1 },
  },
  difficultyWeights: {
    easy:   { type: Number, default: 1 },
    medium: { type: Number, default: 2 },
    hard:   { type: Number, default: 3 },
  },
}, { _id: false });

const gameSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  icon:        { type: String, default: '🎮' },
  color:       { type: String, default: '#7F77DD' },
  colorDark:   { type: String, default: '#1a1a2e' },
  status:      { type: String, enum: ['live', 'soon', 'planned', 'archived'], default: 'soon' },
  url:         { type: String, default: '' },
  adminUrl:    { type: String, default: '' },
  config:      { type: gameConfigSchema, default: () => ({}) },
  stats: {
    totalQuestions: { type: Number, default: 0 },
    totalPlayers:   { type: Number, default: 0 },
    totalGames:     { type: Number, default: 0 },
  },
  active:      { type: Boolean, default: true },
  order:       { type: Number, default: 99 },
}, { timestamps: true });

gameSchema.index({ status: 1, active: 1, order: 1 });

module.exports = mongoose.model('Game', gameSchema);

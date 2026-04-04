const mongoose = require('mongoose');

const refSchema = new mongoose.Schema({
  book:    { type: String, trim: true, default: '' },
  chapter: { type: Number, default: null },
  verse:   { type: String, trim: true, default: '' },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  gameId:     { type: String, required: true, trim: true, index: true },
  q:          { type: String, required: true, trim: true },
  o:          { type: [String], required: true, validate: v => v.length === 4 },
  c:          { type: Number, required: true, min: 0, max: 3 },
  cat:        { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  testament:  { type: String, enum: ['ot', 'nt', 'general', 'none'], default: 'none' },
  ref:        { type: refSchema, default: () => ({}) },
  active:     { type: Boolean, default: true },
  version:    { type: Number, default: 1 },
}, { timestamps: true });

questionSchema.index({ gameId: 1, cat: 1, active: 1 });
questionSchema.index({ gameId: 1, difficulty: 1, active: 1 });
questionSchema.index({ gameId: 1, updatedAt: 1 });
questionSchema.index({ gameId: 1, 'ref.book': 1 });

module.exports = mongoose.model('Question', questionSchema);

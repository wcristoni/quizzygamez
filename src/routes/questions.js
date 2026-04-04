const express  = require('express');
const router   = express.Router();
const Question = require('../models/Question');
const Game     = require('../models/Game');

// GET /api/games/:slug/questions
// GET /api/games/:slug/questions?since=ISO_DATE&difficulty=easy&cat=Gênesis
router.get('/:slug/questions', async (req, res) => {
  try {
    const { slug } = req.params;
    const { since, difficulty, cat, testament, limit } = req.query;

    // Verifica se o jogo existe
    const game = await Game.findOne({ slug, active: true }).lean();
    if (!game) return res.status(404).json({ success: false, error: 'Game not found' });

    const filter = { gameId: slug, active: true };

    // Sync incremental
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate)) filter.updatedAt = { $gt: sinceDate };
    }
    if (difficulty) filter.difficulty = difficulty;
    if (cat)        filter.cat        = cat;
    if (testament)  filter.testament  = testament;

    const maxLimit = parseInt(limit) || 2000;
    const questions = await Question.find(filter)
      .select('-__v')
      .sort({ updatedAt: 1 })
      .limit(Math.min(maxLimit, 5000))
      .lean();

    res.json({
      success: true,
      gameId:   slug,
      count:    questions.length,
      syncedAt: new Date().toISOString(),
      questions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/games/:slug/questions/random?count=10
router.get('/:slug/questions/random', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 10, 50);
    const filter = { gameId: req.params.slug, active: true };
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: count } },
      { $project: { __v: 0 } },
    ]);
    res.json({ success: true, count: questions.length, questions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/games/:slug/questions/categories
router.get('/:slug/questions/categories', async (req, res) => {
  try {
    const cats = await Question.distinct('cat', { gameId: req.params.slug, active: true });
    res.json({ success: true, count: cats.length, categories: cats.sort() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/games/:slug/questions
router.post('/:slug/questions', async (req, res) => {
  try {
    const { slug } = req.params;
    const q = await Question.create({ ...req.body, gameId: slug });
    res.status(201).json({ success: true, question: q });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/games/:slug/questions/:id
router.put('/:slug/questions/:id', async (req, res) => {
  try {
    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, gameId: req.params.slug },
      { ...req.body, version: { $inc: 1 } },
      { new: true }
    );
    if (!q) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, question: q });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/games/:slug/questions/:id (soft delete)
router.delete('/:slug/questions/:id', async (req, res) => {
  try {
    const q = await Question.findOneAndUpdate(
      { _id: req.params.id, gameId: req.params.slug },
      { active: false },
      { new: true }
    );
    if (!q) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, message: 'Question deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

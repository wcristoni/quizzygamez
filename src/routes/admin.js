const express  = require('express');
const router   = express.Router();
const Game     = require('../models/Game');
const Question = require('../models/Question');
const Player   = require('../models/Player');

// ── MIDDLEWARE: verifica se é admin ──────────────────────────────────────────
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ── GAMES CRUD ────────────────────────────────────────────────────────────────

// GET /admin/games
router.get('/games', requireAdmin, async (req, res) => {
  try {
    const games = await Game.find().sort({ order: 1 }).lean();
    res.json({ success: true, count: games.length, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/games — cadastra novo jogo
router.post('/games', requireAdmin, async (req, res) => {
  try {
    const game = await Game.create(req.body);
    res.status(201).json({ success: true, game });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /admin/games/:slug — atualiza jogo
router.put('/games/:slug', requireAdmin, async (req, res) => {
  try {
    const game = await Game.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    );
    if (!game) return res.status(404).json({ success: false, error: 'Game not found' });
    res.json({ success: true, game });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /admin/games/:slug — desativa jogo
router.delete('/games/:slug', requireAdmin, async (req, res) => {
  try {
    await Game.findOneAndUpdate({ slug: req.params.slug }, { active: false });
    res.json({ success: true, message: 'Game deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STATS GERAIS ──────────────────────────────────────────────────────────────

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [games, totalPlayers, totalQuestions] = await Promise.all([
      Game.find({ active: true }).lean(),
      Player.countDocuments(),
      Question.countDocuments({ active: true }),
    ]);

    // Stats por jogo
    const gameStats = await Promise.all(games.map(async g => ({
      slug:        g.slug,
      name:        g.name,
      icon:        g.icon,
      color:       g.color,
      colorDark:   g.colorDark,
      status:      g.status,
      description: g.description,
      url:         g.url,
      questions:   await Question.countDocuments({ gameId: g.slug, active: true }),
      players:     await Player.countDocuments({ [`scores.${g.slug}`]: { $exists: true } }),
    })));

    res.json({
      success: true,
      stats: {
        totalGames:     games.length,
        totalPlayers,
        totalQuestions,
        byGame:         gameStats,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── USERS ─────────────────────────────────────────────────────────────────────

// GET /admin/users?gameId=holypleiiiz&sort=rankScore&limit=100
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { gameId, limit = 100 } = req.query;
    const players = await Player.find()
      .select('-recentSessions -__v')
      .limit(Math.min(parseInt(limit), 500))
      .lean();

    res.json({ success: true, count: players.length, users: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /admin/users/:id
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── QUESTIONS BULK ────────────────────────────────────────────────────────────

// POST /admin/questions/bulk — insere perguntas em massa
router.post('/questions/bulk', requireAdmin, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ success: false, error: 'questions array required' });
    }
    const result = await Question.insertMany(questions, { ordered: false });
    res.status(201).json({ success: true, inserted: result.length });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /admin/export?gameId=holypleiiiz&format=full
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { gameId, format = 'full' } = req.query;
    const filter = { active: true };
    if (gameId) filter.gameId = gameId;

    const questions = await Question.find(filter)
      .select('-__v -active')
      .sort({ gameId: 1, cat: 1 })
      .lean();

    const data = format === 'compact'
      ? questions.map(q => ({ q: q.q, o: q.o, c: q.c, cat: q.cat }))
      : questions;

    res.setHeader('Content-Disposition', `attachment; filename="quizzygamez-questions-${Date.now()}.json"`);
    res.json({ success: true, count: data.length, exportedAt: new Date().toISOString(), questions: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

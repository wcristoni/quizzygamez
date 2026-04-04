const express = require('express');
const router  = express.Router();
const Game    = require('../models/Game');
const Question = require('../models/Question');
const Player   = require('../models/Player');

// GET /api/games — lista todos os jogos ativos
router.get('/', async (req, res) => {
  try {
    const games = await Game.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, count: games.length, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/games/:slug — config completa de um jogo
router.get('/:slug', async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug, active: true }).lean();
    if (!game) return res.status(404).json({ success: false, error: 'Game not found' });

    // Atualiza stats em tempo real
    const [totalQ, totalP] = await Promise.all([
      Question.countDocuments({ gameId: req.params.slug, active: true }),
      Player.countDocuments({ [`scores.${req.params.slug}`]: { $exists: true } }),
    ]);
    game.stats.totalQuestions = totalQ;
    game.stats.totalPlayers   = totalP;

    res.json({ success: true, game });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

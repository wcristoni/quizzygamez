const express = require('express');
const router  = express.Router();
const Player  = require('../models/Player');
const Game    = require('../models/Game');

// ── RANK SCORE PONDERADO ──────────────────────────────────────────────────────
// RankScore (0-1000) = (acc_pond × 0.7 + volume × 0.2 + frequência × 0.1) × 1000
// Pesos de dificuldade: fácil×1, médio×2, difícil×3 (configurável por jogo)

function calcRankScore(playerScore, maxGames, now, weights = {}) {
  const w = { accuracy: 0.7, volume: 0.2, frequency: 0.1, ...weights };

  const weightedAcc = playerScore.totalWeightedQuestions > 0
    ? playerScore.totalWeightedCorrect / playerScore.totalWeightedQuestions
    : playerScore.totalQuestions > 0
      ? playerScore.totalCorrect / playerScore.totalQuestions
      : 0;

  const volume    = maxGames > 0 ? Math.min((playerScore.totalGames || 0) / maxGames, 1) : 0;
  const cutoff    = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const frequency = 0; // calculado nas sessões — simplificado no score salvo

  const raw = weightedAcc * w.accuracy + volume * w.volume + frequency * w.frequency;
  return Math.round(raw * 1000);
}

// GET /api/games/:slug/ranking?limit=50
router.get('/:slug/ranking', async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const game = await Game.findOne({ slug, active: true }).lean();
    if (!game) return res.status(404).json({ success: false, error: 'Game not found' });

    // Busca jogadores que têm score neste jogo
    const players = await Player.find(
      { [`scores.${slug}`]: { $exists: true } },
      { name: 1, email: 1, [`scores.${slug}`]: 1, recentSessions: 1 }
    ).lean();

    if (!players.length) {
      return res.json({ success: true, updatedAt: new Date().toISOString(), count: 0, ranking: [] });
    }

    const now      = Date.now();
    const maxGames = Math.max(...players.map(p => p.scores?.[slug]?.totalGames || 0), 1);

    const ranked = players
      .map(p => {
        const s        = p.scores?.[slug] || {};
        const accuracy = s.totalQuestions > 0
          ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0;
        const weightedAcc = s.totalWeightedQuestions > 0
          ? Math.round((s.totalWeightedCorrect / s.totalWeightedQuestions) * 100) : accuracy;

        // Frequência calculada nas sessões recentes deste jogo
        const cutoff      = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const recentGames = (p.recentSessions || [])
          .filter(sess => sess.gameId === slug && new Date(sess.playedAt) >= cutoff).length;
        const frequency   = Math.min(recentGames / 30, 1);

        const weightedAccFrac = s.totalWeightedQuestions > 0
          ? s.totalWeightedCorrect / s.totalWeightedQuestions
          : s.totalQuestions > 0 ? s.totalCorrect / s.totalQuestions : 0;
        const volume = maxGames > 0 ? Math.min((s.totalGames || 0) / maxGames, 1) : 0;
        const rankScore = Math.round((weightedAccFrac * 0.7 + volume * 0.2 + frequency * 0.1) * 1000);

        return {
          name:         p.name,
          email:        p.email,
          rankScore,
          bestScore:    s.bestScore    || 0,
          totalGames:   s.totalGames   || 0,
          correct:      s.totalCorrect || 0,
          totalQuestions: s.totalQuestions || 0,
          accuracy,
          weightedAcc,
          recentGames,
          maxStreak:    s.maxStreak    || 0,
          lastSeen:     s.lastSeen,
        };
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit)
      .map((p, i) => ({ ...p, position: i + 1 }));

    res.json({
      success: true,
      gameId:  slug,
      updatedAt: new Date().toISOString(),
      count:   ranked.length,
      scoringModel: { weightedAccuracy: '70%', volume: '20%', frequency: '10%' },
      ranking: ranked,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/games/:slug/ranking/sync
router.post('/:slug/ranking/sync', async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      name, email, deviceId, score, correct, wrong, skipped,
      totalQuestions, maxStreak, weightedCorrect, weightedTotal
    } = req.body;

    if (!name || !deviceId) {
      return res.status(400).json({ success: false, error: 'name and deviceId are required' });
    }

    const cleanName = Buffer.from(name, 'utf8').toString('utf8').trim();

    const session = {
      gameId: slug,
      score: score || 0, correct: correct || 0, wrong: wrong || 0,
      skipped: skipped || 0, totalQuestions: totalQuestions || 0,
      maxStreak: maxStreak || 0,
      weightedCorrect: weightedCorrect || correct || 0,
      weightedTotal:   weightedTotal   || totalQuestions || 0,
      playedAt: new Date()
    };

    // Upsert por email (preferencial) ou deviceId
    const query = email
      ? { $or: [{ email: email.toLowerCase().trim() }, { deviceId }] }
      : { deviceId };

    const updateOp = {
      $set: {
        name: cleanName, deviceId, lastSeen: new Date(),
        ...(email ? { email: email.toLowerCase().trim() } : {}),
        [`scores.${slug}.lastSeen`]: new Date(),
      },
      $inc: {
        [`scores.${slug}.totalGames`]:             1,
        [`scores.${slug}.totalCorrect`]:            correct          || 0,
        [`scores.${slug}.totalQuestions`]:          totalQuestions   || 0,
        [`scores.${slug}.totalWeightedCorrect`]:    weightedCorrect  || correct || 0,
        [`scores.${slug}.totalWeightedQuestions`]:  weightedTotal    || totalQuestions || 0,
      },
      $max: {
        [`scores.${slug}.bestScore`]:  score     || 0,
        [`scores.${slug}.maxStreak`]:  maxStreak || 0,
      },
      $push: {
        recentSessions: { $each: [session], $slice: -30 }
      },
    };

    const player = await Player.findOneAndUpdate(query, updateOp,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recalcula rankScore e salva
    const allPlayers = await Player.find(
      { [`scores.${slug}`]: { $exists: true } },
      { [`scores.${slug}.totalGames`]: 1 }
    ).lean();
    const maxGames  = Math.max(...allPlayers.map(p => p.scores?.[slug]?.totalGames || 0), 1);
    const myScore   = player.scores?.get ? player.scores.get(slug) : player.scores?.[slug];
    const cutoff    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCnt = (player.recentSessions || []).filter(s => s.gameId === slug && new Date(s.playedAt) >= cutoff).length;

    let rankScore = 0;
    if (myScore) {
      const wAcc    = myScore.totalWeightedQuestions > 0
        ? myScore.totalWeightedCorrect / myScore.totalWeightedQuestions
        : myScore.totalQuestions > 0 ? myScore.totalCorrect / myScore.totalQuestions : 0;
      const vol     = Math.min((myScore.totalGames || 0) / maxGames, 1);
      const freq    = Math.min(recentCnt / 30, 1);
      rankScore     = Math.round((wAcc * 0.7 + vol * 0.2 + freq * 0.1) * 1000);
      await Player.updateOne({ _id: player._id }, { $set: { [`scores.${slug}.rankScore`]: rankScore } });
    }

    // Posição global
    const position = (await Player.countDocuments({
      [`scores.${slug}.rankScore`]: { $gt: rankScore }
    })) + 1;

    const accuracy = myScore?.totalQuestions
      ? Math.round((myScore.totalCorrect / myScore.totalQuestions) * 100) : 0;

    res.json({
      success: true,
      player: {
        name: player.name, email: player.email,
        rankScore, bestScore: myScore?.bestScore || 0,
        totalGames: myScore?.totalGames || 0,
        accuracy, globalPosition: position,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/games/:slug/ranking/player/:deviceId
router.get('/:slug/ranking/player/:deviceId', async (req, res) => {
  try {
    const { slug, deviceId } = req.params;
    const player = await Player.findOne({ deviceId }).lean();
    if (!player) return res.status(404).json({ success: false, error: 'Player not found' });

    const s = player.scores?.[slug];
    if (!s) return res.status(404).json({ success: false, error: 'Player has no score for this game' });

    const position = (await Player.countDocuments({
      [`scores.${slug}.rankScore`]: { $gt: s.rankScore || 0 }
    })) + 1;

    res.json({ success: true, player: { ...player, gameScore: s, globalPosition: position } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

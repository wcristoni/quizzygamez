require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Força UTF-8 em todas as respostas JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/games',     require('./routes/games'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/ranking',   require('./routes/ranking'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/admin',         require('./routes/admin'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'QuizzyGamez API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    app: '🎮 QuizzyGamez API',
    version: '1.0.0',
    endpoints: {
      health:          'GET  /health',
      games:           'GET  /api/games',
      gameBySlug:      'GET  /api/games/:slug',
      questions:       'GET  /api/games/:slug/questions',
      questionsSync:   'GET  /api/games/:slug/questions?since=ISO_DATE',
      ranking:         'GET  /api/games/:slug/ranking',
      rankingSync:     'POST /api/games/:slug/ranking/sync',
      authGoogle:      'POST /api/auth/google',
      authMe:          'GET  /api/auth/me',
      adminGames:      'GET  /admin/games',
      adminStats:      'GET  /admin/stats',
      adminUsers:      'GET  /admin/users',
    }
  });
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🎮 QuizzyGamez API running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}\n`);
  });
})();

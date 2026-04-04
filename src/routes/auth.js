const express = require('express');
const router  = express.Router();
const https   = require('https');

// ── HELPER: verifica token Google via endpoint userinfo ───────────────────────
function verifyGoogleToken(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      { timeout: 8000 },
      res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error('Invalid response from Google')); }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Google timeout')); });
  });
}

// Decodifica JWT do Google Identity Services (sem verificar assinatura — para uso futuro)
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

// POST /api/auth/google
// Body: { credential: "JWT do Google" } ou { accessToken: "access token" }
// Retorna perfil do usuário para o hub usar como SSO
router.post('/google', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    let profile = null;

    if (credential) {
      // JWT do Google Identity Services — decodifica (sem validar assinatura no momento)
      // Em produção: use google-auth-library para validar a assinatura
      const payload = decodeJWT(credential);
      if (!payload || !payload.email) {
        return res.status(401).json({ success: false, error: 'Invalid Google credential' });
      }
      profile = {
        sub:        payload.sub,
        email:      payload.email,
        name:       Buffer.from(payload.name || '', 'utf8').toString('utf8'),
        firstName:  Buffer.from(payload.given_name || '', 'utf8').toString('utf8'),
        picture:    payload.picture || '',
      };
    } else if (accessToken) {
      const data = await verifyGoogleToken(accessToken);
      if (!data.email) return res.status(401).json({ success: false, error: 'Invalid Google token' });
      profile = {
        sub:       data.sub,
        email:     data.email,
        name:      Buffer.from(data.name || '', 'utf8').toString('utf8'),
        firstName: Buffer.from(data.given_name || '', 'utf8').toString('utf8'),
        picture:   data.picture || '',
      };
    } else {
      return res.status(400).json({ success: false, error: 'credential or accessToken required' });
    }

    // Retorna o perfil — o hub salva no localStorage e passa para os jogos
    res.json({
      success: true,
      user: profile,
      // Em Fase 3: aqui retornaria um JWT assinado pelo QuizzyGamez
      // token: jwt.sign(profile, process.env.JWT_SECRET, { expiresIn: '7d' })
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me?email=... — perfil + scores em todos os jogos
router.get('/me', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: 'email required' });

    const Player = require('../models/Player');
    const player = await Player.findOne({ email: email.toLowerCase().trim() })
      .select('-recentSessions -__v')
      .lean();

    if (!player) {
      return res.json({ success: true, player: null, message: 'New player' });
    }

    res.json({ success: true, player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

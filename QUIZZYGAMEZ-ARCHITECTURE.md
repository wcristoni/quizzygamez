# 🎮 QuizzyGamez — Plataforma de Quizzes

> Hub central com múltiplos jogos de quiz, login único (SSO), rankings independentes e arquitetura modular para escalar com mínimo esforço.

---

## Visão Geral

O QuizzyGamez é uma **plataforma** (não um jogo). Cada jogo é um módulo autônomo que roda sobre o mesmo Game Core reutilizável. O HolyPleiiiz é o primeiro jogo da plataforma.

```
QuizzyGamez (hub)
├── HolyPleiiiz     ← já existe, primeiro jogo
├── GeoQuiz         ← em planejamento
├── ScienceZ        ← em planejamento
└── HistoriaZ       ← em planejamento
```

---

## Arquitetura

### Princípio fundamental

> **Cada jogo é um JSON de configuração + banco de perguntas com `gameId`.**
> O Game Core roda qualquer jogo sem alterar código.

### Camadas

```
┌─────────────────────────────────────────────┐
│           QuizzyGamez Hub                    │
│   SSO · catálogo de jogos · perfil global    │
└───────────────────┬─────────────────────────┘
                    │ gameId + JWT
        ┌───────────┴───────────┐
        ▼                       ▼
  ┌──────────┐           ┌──────────┐
  │HolyPleiiiz│          │ Jogo N   │
  │ gameId:   │          │ gameId:  │
  │ "holy"    │          │ "geo"    │
  └─────┬─────┘          └──────────┘
        │
        ▼
┌───────────────────────────────────────────┐
│            Game Core (shared)              │
│  timer · ajudas · ranking · offline       │
│  anti-repetição · animações · sons        │
└───────────────────┬───────────────────────┘
                    │
        ┌───────────┴───────────────────┐
        ▼                               ▼
┌──────────────┐                ┌──────────────┐
│ Questions API│                │  Ranking API │
│ /gameId/...  │                │  /gameId/... │
└──────────────┘                └──────────────┘
        │                               │
        └───────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  MongoDB Atlas   │
              │                  │
              │ games            │
              │ questions+gameId │
              │ players          │
              │ scores+gameId    │
              └──────────────────┘
```

---

## Modelo de Dados

### Collection: `games`
```json
{
  "_id": "objectId",
  "slug": "holypleiiiz",
  "name": "HolyPleiiiz",
  "description": "Quiz Bíblico com 34 categorias",
  "icon": "✝️",
  "color": "#6b5ef8",
  "colorDark": "#13103a",
  "status": "live",
  "url": "https://holypleiiiz.netlify.app",
  "adminUrl": "https://holypleliiiz-admin.netlify.app",
  "config": {
    "defaultCount": 10,
    "defaultTime": 30,
    "difficulties": ["easy", "medium", "hard"],
    "modes": ["mixed", "ot", "nt"],
    "hasRanking": true,
    "hasOffline": true,
    "hasRefs": true
  },
  "stats": {
    "totalQuestions": 1100,
    "totalPlayers": 29,
    "totalGames": 450
  },
  "active": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Collection: `questions` (já existe — adicionar `gameId`)
```json
{
  "_id": "objectId",
  "gameId": "holypleiiiz",
  "q": "Quem construiu a Arca?",
  "o": ["Noé", "Abraão", "Moisés", "Davi"],
  "c": 0,
  "cat": "Gênesis",
  "testament": "ot",
  "difficulty": "easy",
  "ref": { "book": "Gênesis", "chapter": 6, "verse": "14" },
  "active": true
}
```

### Collection: `players` (já existe — score por jogo)
```json
{
  "_id": "objectId",
  "email": "usuario@gmail.com",
  "name": "Wilson Cristoni",
  "deviceId": "hp_abc123",
  "scores": {
    "holypleiiiz": {
      "bestScore": 6110,
      "totalGames": 16,
      "totalCorrect": 180,
      "totalQuestions": 240,
      "totalWeightedCorrect": 420,
      "totalWeightedQuestions": 540,
      "maxStreak": 9,
      "rankScore": 953,
      "lastSeen": "2024-01-01T00:00:00Z"
    },
    "geoquiz": {
      "bestScore": 0,
      "totalGames": 0
    }
  },
  "recentSessions": [],
  "lastSeen": "2024-01-01T00:00:00Z"
}
```

---

## API — Novos Endpoints

### Games (novo)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/games` | Lista todos os jogos ativos |
| `GET` | `/api/games/:slug` | Config completa de um jogo |
| `POST` | `/admin/games` | Cadastra novo jogo |
| `PUT` | `/admin/games/:slug` | Atualiza config do jogo |

### Questions (ajuste)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/games/:slug/questions` | Perguntas de um jogo |
| `GET` | `/api/games/:slug/questions?since=DATE` | Sync incremental |

### Ranking (ajuste)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/games/:slug/ranking` | Ranking de um jogo |
| `POST` | `/api/games/:slug/ranking/sync` | Sync resultado |

### SSO (novo)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/google` | Valida token Google, retorna JWT |
| `GET` | `/api/auth/me` | Perfil do usuário logado |
| `GET` | `/api/auth/me/scores` | Scores em todos os jogos |

---

## Repositórios

### Estrutura proposta

```
quizzygamez/                    ← novo repositório (hub + backend)
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── models/
│   │   │   ├── Game.js          ← novo
│   │   │   ├── Question.js      ← adiciona gameId
│   │   │   └── Player.js        ← scores por jogo
│   │   ├── routes/
│   │   │   ├── games.js         ← novo
│   │   │   ├── questions.js     ← ajuste
│   │   │   ├── ranking.js       ← ajuste
│   │   │   ├── auth.js          ← novo (SSO)
│   │   │   └── admin.js         ← ajuste
│   │   └── services/
│   │       ├── database.js
│   │       └── auth.js          ← novo
│   └── scripts/
│       ├── seed-games.js        ← novo
│       ├── migrate-holypleiiiz.js  ← migração
│       └── generate-questions.js
├── hub/
│   └── index.html               ← QuizzyGamez-Hub.html
└── README.md

holypleliiiz-backend/           ← repositório existente (mantido)
├── ...                          ← sem mudanças por enquanto
```

---

## SSO — Estratégia

### Fase 1 (atual) — Sem SSO real
Cada jogo tem seu próprio login Google. O hub abre o jogo em nova aba. **Sem mudanças no HolyPleiiiz.**

```
Hub → clica em HolyPleiiiz → abre holypleiiiz.netlify.app (login próprio)
```

### Fase 2 — SSO via JWT compartilhado
O hub faz o login Google, gera um JWT, e passa para o jogo via URL param ou `postMessage`.

```
Hub → login Google → JWT → redireciona para holypleiiiz.netlify.app?token=JWT
                            ↓
                     jogo valida JWT na API do QuizzyGamez
                     ↓
                     entra direto (sem pedir login novamente)
```

### Fase 3 — SSO completo com subdomain cookies
`.quizzygamez.com` cookie compartilhado entre `hub.quizzygamez.com` e `holypleiiiz.quizzygamez.com`.

---

## Game Core — O que é reutilizável

Tudo isso já existe no HolyPleiiiz e pode ser extraído como módulo:

| Módulo | Arquivo atual | Reutilizável? |
|--------|--------------|---------------|
| Timer com círculo SVG | `HolyPleiiiz-Game-Google.html` | ✅ Sim |
| Sistema de ajudas (50/50, Anjo, Mau, Pular) | idem | ✅ Sim |
| Anti-repetição com fingerprint | idem | ✅ Sim |
| Sync incremental de perguntas | idem | ✅ Sim |
| Fila offline (pending queue) | idem | ✅ Sim |
| Ranking ponderado 70/20/10 | idem | ✅ Sim |
| Animações (confetti, shake) | idem | ✅ Sim |
| Sons Web Audio API | idem | ✅ Sim |
| Popup de confirmação de resposta | idem | ✅ Sim |
| Referência bíblica no feedback | idem | ⚠️ Específico |
| Categorias bíblicas | idem | ❌ Específico |
| Scripts de geração por IA | `generate-questions.js` | ✅ Sim |
| Enriquecimento de referências | `enrich-references.js` | ✅ Sim |
| Busca semântica | `search-questions.js` | ✅ Sim |

---

## Roadmap

### ✅ Fase 0 — Concluída (HolyPleiiiz)
- App de jogo completo com offline, ranking, admin
- 1100+ perguntas com referências bíblicas
- Ranking ponderado por dificuldade
- Admin responsivo com CRUD e exportação

### 🔨 Fase 1 — Hub (agora)
- [x] Hub visual (`QuizzyGamez-Hub.html`)
- [ ] Publicar hub no Netlify (`quizzygamez.netlify.app`)
- [ ] Novo repositório `quizzygamez` no GitHub
- [ ] Schema `Game` no backend
- [ ] Endpoint `GET /api/games`
- [ ] Hub carrega jogos dinamicamente da API

### 🔜 Fase 2 — Multi-game backend
- [ ] Migrar perguntas do HolyPleiiiz para ter `gameId`
- [ ] Endpoints `/api/games/:slug/questions`
- [ ] Endpoints `/api/games/:slug/ranking`
- [ ] Player com scores por jogo
- [ ] Admin do hub para cadastrar jogos

### 🔜 Fase 3 — SSO
- [ ] Endpoint `POST /api/auth/google`
- [ ] JWT compartilhado entre hub e jogos
- [ ] Hub passa token para jogo via URL param
- [ ] Perfil unificado com scores de todos os jogos

### 🔜 Fase 4 — Segundo jogo (GeoQuiz)
- [ ] Banco de perguntas de geografia
- [ ] Adaptar Game Core para gameId "geo"
- [ ] Admin de perguntas para o GeoQuiz
- [ ] Publicar `geoquiz.quizzygamez.com`

---

## Deploy

### Estrutura de URLs proposta

| App | URL |
|-----|-----|
| Hub | `quizzygamez.netlify.app` |
| HolyPleiiiz | `holypleiiiz.netlify.app` (atual) |
| GeoQuiz | `geoquiz.quizzygamez.netlify.app` |
| Backend | `quizzygamez-backend.railway.app` |
| Admin | `admin.quizzygamez.netlify.app` |

### Como publicar o hub agora

```bash
# O arquivo QuizzyGamez-Hub.html já está pronto
# 1. Acesse app.netlify.com
# 2. Add new site → Deploy manually
# 3. Drag & drop do QuizzyGamez-Hub.html
# 4. Renomeie o projeto para "quizzygamez"
```

---

## Como adicionar um novo jogo

Com a Fase 2 completa, adicionar um jogo novo será:

1. **Cadastrar no admin** — nome, slug, ícone, cor, URL
2. **Popular perguntas** — via `generate-questions.js` com prompts adaptados
3. **Deploy do frontend** — copiar `HolyPleiiiz-Game-Google.html`, trocar `gameId` e tema
4. **Pronto** — o jogo aparece automaticamente no hub

Estimativa: **2-4 horas por novo jogo** após a Fase 2.

---

*QuizzyGamez Platform — arquitetura pensada para crescer*

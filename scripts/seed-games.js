require('dotenv').config();
const mongoose = require('mongoose');
const Game     = require('../src/models/Game');

const games = [
  {
    slug:        'holypleiiiz',
    name:        'HolyPleiiiz',
    description: 'Quiz Bíblico com mais de 1.100 perguntas em 34 categorias. Velho Testamento, Novo Testamento, parábolas e muito mais.',
    icon:        '✝️',
    color:       '#6b5ef8',
    colorDark:   '#13103a',
    status:      'live',
    url:         'https://holypleiiiz.netlify.app',
    adminUrl:    'https://holypleliiiz-admin.netlify.app',
    order:       1,
    config: {
      defaultCount:  10,
      defaultTime:   30,
      difficulties:  ['easy', 'medium', 'hard'],
      modes:         ['mixed', 'ot', 'nt'],
      hasRanking:    true,
      hasOffline:    true,
      hasRefs:       true,
      rankingWeights: { accuracy: 0.7, volume: 0.2, frequency: 0.1 },
      difficultyWeights: { easy: 1, medium: 2, hard: 3 },
    },
  },
  {
    slug:        'geoquiz',
    name:        'GeoQuiz',
    description: 'Capitais, países, bandeiras e curiosidades geográficas do mundo inteiro.',
    icon:        '🌍',
    color:       '#e85d3c',
    colorDark:   '#2d1510',
    status:      'soon',
    url:         '',
    adminUrl:    '',
    order:       2,
    config: {
      defaultCount: 10,
      defaultTime:  30,
      difficulties: ['easy', 'medium', 'hard'],
      modes:        ['mixed'],
      hasRanking:   true,
      hasOffline:   true,
      hasRefs:      false,
    },
  },
  {
    slug:        'sciencez',
    name:        'ScienceZ',
    description: 'Física, química, biologia e matemática. Ciência no modo quiz.',
    icon:        '🔬',
    color:       '#1ab88c',
    colorDark:   '#071f19',
    status:      'soon',
    url:         '',
    adminUrl:    '',
    order:       3,
    config: {
      defaultCount: 10,
      defaultTime:  30,
      difficulties: ['easy', 'medium', 'hard'],
      modes:        ['mixed'],
      hasRanking:   true,
      hasOffline:   true,
      hasRefs:      false,
    },
  },
  {
    slug:        'historiaz',
    name:        'HistoriaZ',
    description: 'Da Antiguidade até os dias atuais. Grandes eventos e personagens históricos.',
    icon:        '🏛️',
    color:       '#d4a017',
    colorDark:   '#221a04',
    status:      'planned',
    url:         '',
    adminUrl:    '',
    order:       4,
    config: {
      defaultCount: 10,
      defaultTime:  30,
      difficulties: ['easy', 'medium', 'hard'],
      modes:        ['mixed'],
      hasRanking:   true,
      hasOffline:   true,
      hasRefs:      false,
    },
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB Atlas');

    for (const gameData of games) {
      const existing = await Game.findOne({ slug: gameData.slug });
      if (existing) {
        await Game.updateOne({ slug: gameData.slug }, gameData);
        console.log(`🔄 Atualizado: ${gameData.name}`);
      } else {
        await Game.create(gameData);
        console.log(`✅ Criado: ${gameData.name}`);
      }
    }

    const total = await Game.countDocuments();
    console.log(`\n🎮 ${total} jogos no banco.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

seed();

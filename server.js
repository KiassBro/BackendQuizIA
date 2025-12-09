// server.js — TECHQUIZ AI MADAGASCAR 2025 — VERSION QUI MARCHE À 100%

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const quizIARoutes = require('./routes/quizIA');
const tentativeRoutes = require('./routes/tentative');
const adminRoutes = require('./routes/admin');
const etudiantRoutes = require('./routes/etudiant');
const quizManuelRoutes = require('./routes/quizManuel');
const quiViewRoutes = require('./routes/quizView');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://techquiz-madagascar.vercel.app'],
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Trop de requêtes, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Routes');

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/quiz-ia', quizIARoutes);
app.use('/api/tentative', tentativeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/quiz-manuel', quizManuelRoutes);
app.use('/api/quiz', quiViewRoutes);

// Accueil
app.get('/', (req, res) => {
  res.json({
    message: 'TechQuiz AI Madagascar 2025 - Backend opérationnel',
    version: '2.0.0',
    status: 'ONLINE',
    date: new Date().toISOString(),
    endpoints: ['/api/auth', '/api/quiz', '/api/quiz-ia', '/api/tentative', '/api/admin']
  });
});

// 404 – À METTRE EN TOUT DERNIER !
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Route non trouvée',
    method: req.method,
    url: req.originalUrl
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nTechQuiz AI Madagascar 2025`);
  console.log(`Serveur démarré → http://localhost:${PORT}`);
  console.log(`API → /api/*\n`);
});

module.exports = app;
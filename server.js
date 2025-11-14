const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const tentativeRoutes = require('./routes/tentative');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes. Réessayez dans 15 minutes.'
});
app.use('/api/', limiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/tentative', tentativeRoutes);
app.use('/api/admin', adminRoutes);

// Page d'accueil
app.get('/', (req, res) => {
  res.send('Quiz IA Madagascar - Backend 100% Actif');
});

// GESTION 404 (CORRIGÉE !)
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route non trouvée',
    chemin: req.originalUrl,
    methode: req.method
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    erreur: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
  console.log(`API : /api/auth | /api/quiz | /api/tentative | /api/admin`);
});
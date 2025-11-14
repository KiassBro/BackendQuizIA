const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import des routes
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/tentative', tentativeRoutes);   // COHÉRENT AVEC LE FICHIER
app.use('/api/admin', adminRoutes);

// Page d'accueil
app.get('/', (req, res) => {
  res.send('Quiz IA Madagascar - Backend 100% Fonctionnel');
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route non trouvée. Utilise /api/auth, /api/quiz, /api/tentative, /api/admin' 
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
  console.log(`API disponible :`);
  console.log(`   → /api/auth`);
  console.log(`   → /api/quiz`);
  console.log(`   → /api/tentative`);
  console.log(`   → /api/admin`);
});
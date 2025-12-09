// routes/quizIA.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { genererQuizIA } = require('../controllers/quizIAController');
const { toggleFavori, getMesFavoris } = require('../controllers/favorisController');
const { getDashboardStats } = require('../controllers/statsController');

const router = express.Router();

// GÉNÉRATION IA (admin & enseignant)
router.post('/generer', protect, genererQuizIA);

// FAVORIS
router.post('/favori/:quizId', protect, toggleFavori);
router.get('/mes-favoris', protect, getMesFavoris);

// DASHBOARD STATS (admin & enseignant)
router.get('/dashboard-stats', protect, getDashboardStats);

module.exports = router;
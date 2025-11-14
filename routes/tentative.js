// routes/attempt.js
const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { 
  startAttempt, 
  submitAnswers, 
  getMyResults, 
  getStudentResults, 
  getAllResults 
} = require('../controllers/tentativeController');
const router = express.Router();

// Démarrer un quiz
router.post('/start/:quizId', protect, startAttempt);

// Soumettre les réponses + évaluation IA
router.post('/submit', protect, submitAnswers);

// 1. Mes résultats (étudiant connecté)
router.get('/mes-resultats', protect, getMyResults);

// 2. Résultats d'un étudiant (enseignant ou admin)
router.get('/resultats/:etudiantId', protect, getStudentResults);

// 3. Tous les résultats (admin uniquement)
router.get('/tous-resultats', protect, admin, getAllResults);

module.exports = router;
// routes/tentative.js → SYSTÈME ÉDUCATIF MALGACHE PARFAIT 2025
const express = require('express');
const { protect, enseignant } = require('../middleware/auth');  // enseignant À LA PLACE DE admin
const { 
  startAttempt, 
  submitAnswers, 
  getMyResults, 
  getStudentResults, 
  getAllResults 
} = require('../controllers/tentativeController');

const router = express.Router();

// 1. DÉMARRER UN QUIZ (ÉTUDIANT APPROUVÉ)
router.post('/start/:quizId', protect, startAttempt);

// 2. SOUMETTRE LES RÉPONSES
router.post('/submit', protect, submitAnswers);

// 3. MES RÉSULTATS (ÉTUDIANT)
router.get('/mes-resultats', protect, getMyResults);

// 4. RÉSULTATS D'UN ÉTUDIANT (ENSEIGNANT)
router.get('/resultats/:etudiantId', protect, enseignant, getStudentResults);

// 5. TOUS LES RÉSULTATS (ENSEIGNANT)
router.get('/tous-resultats', protect, enseignant, getAllResults);  // enseignant À LA PLACE DE admin

module.exports = router;
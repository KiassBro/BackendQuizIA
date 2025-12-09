// routes/quizView.js
const express = require('express');
const { protect, enseignant } = require('../middleware/auth');
const {
  getTousQuiz,
  getMesQuiz,
  getQuizParCategorie,
  getQuizById,
  rechercherQuiz
} = require('../controllers/quizViewController');

const router = express.Router();

// Publics
router.get('/tous', getTousQuiz);
router.get('/categorie/:slug', getQuizParCategorie);
router.get('/recherche', rechercherQuiz);
router.get('/:id', getQuizById);

// Protégés
router.get('/mes-quiz', protect, enseignant, getMesQuiz);

module.exports = router;
const express = require('express');
const { protect } = require('../middleware/auth');
const { 
  genererQuizIA, 
  listerQuizPublics, 
  listerMesQuiz 
} = require('../controllers/quizController');

const router = express.Router();

// 1. GÉNÉRER UN QUIZ (ENSEIGNANT UNIQUEMENT)
router.post('/generate', protect, genererQuizIA);

// 2. LISTER LES QUIZ PUBLICS (ÉTUDIANTS APPROUVÉS UNIQUEMENT)
router.get('/publics', protect, listerQuizPublics);

// 3. LISTER MES QUIZ (ENSEIGNANT UNIQUEMENT)
router.get('/mes-quiz', protect, listerMesQuiz);

module.exports = router;
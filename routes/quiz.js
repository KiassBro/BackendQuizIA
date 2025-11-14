const express = require('express');
const { protect } = require('../middleware/auth');
const { genererQuizIA, listerQuizPublics, listerMesQuiz } = require('../controllers/quizController');
const router = express.Router();

// Générer un quiz avec IA
router.post('/generate', protect, genererQuizIA);

// Lister TOUS les quiz publics (pour les étudiants)
router.get('/publics', listerQuizPublics);

// Lister MES quiz (seulement ceux que j'ai créés)
router.get('/mes-quiz', protect, listerMesQuiz);

module.exports = router;
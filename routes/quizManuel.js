// routes/quizManuel.js
const express = require('express');
const { protect, enseignant } = require('../middleware/auth');
const { creerQuizManuel, ajouterQuestion } = require('../controllers/quizManuelController');

const router = express.Router();

router.use(protect);
router.use(enseignant);

router.post('/', creerQuizManuel);
router.post('/:quizId/question', ajouterQuestion);

module.exports = router;
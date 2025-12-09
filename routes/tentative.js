// routes/tentative.js (remplace l'ancien)
const express = require('express');
const { protect } = require('../middleware/auth');
const {
  startAttempt,
  submitTentative,        // nouvelle fonction
  getMyResults,
  getStudentResults,
  getAllResults
} = require('../controllers/tentativeController');

const router = express.Router();

router.post('/start/:quizId', protect, startAttempt);
router.post('/submit', protect, submitTentative);           // NOUVELLE ROUTE
router.get('/mes-resultats', protect, getMyResults);
router.get('/resultats/:etudiantId', protect, protect, getStudentResults);
router.get('/tous-resultats', protect, getAllResults);

module.exports = router;
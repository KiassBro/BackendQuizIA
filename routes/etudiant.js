// routes/etudiant.js
const express = require('express');
const { protect, enseignant } = require('../middleware/auth');
const {
  getEtudiantsEnAttente,
  validerEtudiant,
  refuserEtudiant,
  getTousEtudiants
} = require('../controllers/etudiantController');

const router = express.Router();

// Toutes ces routes nécessitent d'être connecté + prof/admin
router.use(protect);
router.use(enseignant);

router.get('/en-attente', getEtudiantsEnAttente);
router.post('/valider/:etudiantId', validerEtudiant);
router.post('/refuser/:etudiantId', refuserEtudiant);
router.get('/', getTousEtudiants);

module.exports = router;
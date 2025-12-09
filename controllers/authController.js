// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const register = async (req, res) => {
  const { nom, prenom, email, motDePasse, role = 'ETUDIANT' } = req.body;

  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
  }

  try {
    const existe = await prisma.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existe) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashed = await bcrypt.hash(motDePasse, 12);

    const nouvelUtilisateur = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        prenom: prenom?.trim() || null,
        email: email.toLowerCase().trim(),
        motDePasse: hashed,
        role: role.toUpperCase(), // ETUDIANT, ENSEIGNANT ou ADMIN
        statut: role === 'ETUDIANT' ? 'EN_ATTENTE' : 'ACTIF' // ← les étudiants attendent validation
      }
    });

    res.status(201).json({
      message: role === 'ETUDIANT'
        ? 'Inscription réussie ! En attente de validation par un enseignant.'
        : 'Compte créé avec succès !',
      utilisateur: {
        id: nouvelUtilisateur.id,
        nom: nouvelUtilisateur.nom,
        prenom: nouvelUtilisateur.prenom,
        email: nouvelUtilisateur.email,
        role: nouvelUtilisateur.role,
        statut: nouvelUtilisateur.statut
      }
    });

  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasse))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Bloque les étudiants en attente
    if (utilisateur.role === 'ETUDIANT' && utilisateur.statut === 'EN_ATTENTE') {
      return res.status(403).json({
        message: 'Votre compte est en attente de validation par un enseignant'
      });
    }

    // Met à jour dernière connexion
    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { derniereConnexion: new Date() }
    });

    const token = jwt.sign(
      { id: utilisateur.id, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie !',
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
        statut: utilisateur.statut
      }
    });

  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { register, login };
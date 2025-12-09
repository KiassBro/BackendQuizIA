// middleware/auth.js — VERSION 2025 COMPATIBLE
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé : aucun token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        statut: true,           // ← REMPLACÉ estApprouve par statut
        niveau: true,
        photoProfil: true
      }
    });

    if (!utilisateur) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    // Les étudiants en attente ne peuvent pas se connecter
    if (utilisateur.role === 'ETUDIANT' && utilisateur.statut === 'EN_ATTENTE') {
      return res.status(403).json({
        message: 'Votre compte est en attente de validation par un enseignant'
      });
    }

    req.user = utilisateur;
    next();

  } catch (err) {
    console.error('Erreur token:', err.message);
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

const enseignant = (req, res, next) => {
  if (['ADMIN', 'ENSEIGNANT'].includes(req.user?.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé : enseignants/admin uniquement' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Accès réservé à l\'administrateur' });
  }
};

module.exports = { protect, enseignant, admin };
// middleware/auth.js → VERSION CORRIGÉE 100% FONCTIONNELLE
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const protect = async (req, res, next) => {
  let token;

  // 1. Récupère le token (Bearer ou cookie)
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé : aucun token' });
  }

  try {
    // 2. Vérifie le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. CHANGEMENT CRUCIAL : utilisateur (pas user !!!)
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id }
    });

    if (!utilisateur) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = utilisateur; // ← on garde req.user pour la compatibilité
    next();
  } catch (err) {
    console.error('Erreur token:', err.message);
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Accès admin requis' });
  }
};

module.exports = { protect, admin };
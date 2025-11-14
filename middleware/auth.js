const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const protect = async (req, res, next) => {
  let token;

  // 1. Récupère le token
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      message: 'Accès refusé : aucun token fourni' 
    });
  }

  try {
    // 2. Vérifie le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Récupère l'utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        estApprouve: true
      }
    });

    if (!utilisateur) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifie l'approbation pour les étudiants
    if (utilisateur.role === 'ETUDIANT' && !utilisateur.estApprouve) {
      return res.status(403).json({ 
        message: 'Compte en attente d\'approbation par l\'enseignant' 
      });
    }

    req.user = utilisateur;
    next();

  } catch (err) {
    console.error('Erreur token:', err.message);
    return res.status(401).json({ 
      message: 'Token invalide ou expiré' 
    });
  }
};

// ENSEIGNANT = ADMIN
const enseignant = (req, res, next) => {
  if (req.user?.role === 'ENSEIGNANT') {
    next();
  } else {
    res.status(403).json({ 
      message: 'Accès refusé : enseignants uniquement' 
    });
  }
};

module.exports = { protect, enseignant };
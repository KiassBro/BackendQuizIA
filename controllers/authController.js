const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const register = async (req, res) => {
  const { nom, email, motDePasse } = req.body;

  // Validation
  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ 
      message: 'Nom, email et mot de passe sont requis' 
    });
  }

  const emailTrimmed = email.toLowerCase().trim();

  try {
    // Vérifie si l'email existe déjà
    const existe = await prisma.utilisateur.findUnique({
      where: { email: emailTrimmed }
    });

    if (existe) {
      return res.status(400).json({ 
        message: 'Cet email est déjà utilisé' 
      });
    }

    const hashed = await bcrypt.hash(motDePasse, 12);

    // Création de l'étudiant en attente
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom: nom.trim(),
        email: emailTrimmed,
        motDePasse: hashed,
        role: 'ETUDIANT',           // ← Toujours étudiant
        estApprouve: false          // ← En attente d'approbation
      }
    });

    res.status(201).json({
      message: 'Inscription réussie ! En attente d\'approbation par l\'enseignant.',
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        statut: 'en_attente'
      }
    });

  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'inscription',
      erreur: err.message 
    });
  }
};

const login = async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ 
      message: 'Email et mot de passe requis' 
    });
  }

  const emailTrimmed = email.toLowerCase().trim();

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email: emailTrimmed }
    });

    // Vérifie identifiants
    if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasse))) {
      return res.status(401).json({ 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Vérifie approbation (étudiants seulement)
    if (utilisateur.role === 'ETUDIANT' && !utilisateur.estApprouve) {
      return res.status(403).json({ 
        message: 'Votre compte est en attente d\'approbation par l\'enseignant.' 
      });
    }

    // Génère le token
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
        email: utilisateur.email,
        role: utilisateur.role,
        estApprouve: utilisateur.estApprouve
      }
    });

  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la connexion',
      erreur: err.message 
    });
  }
};

module.exports = { register, login };
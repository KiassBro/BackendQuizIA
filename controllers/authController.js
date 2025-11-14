const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const register = async (req, res) => {
  const { nom, email, motDePasse, role } = req.body;

  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  const hashed = await bcrypt.hash(motDePasse, 12);

  try {
    // ✅ CHANGÉ : utilisateur au lieu de user
    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom,
        email: email.toLowerCase().trim(),
        motDePasse: hashed,
        role: role?.toUpperCase() || 'ETUDIANT'
      }
    });

    const token = jwt.sign({ id: utilisateur.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, role: utilisateur.role }
    });
  } catch (err) {
    console.error('Erreur register:', err);

    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    res.status(500).json({ message: 'Erreur serveur', details: err.message });
  }
};

const login = async (req, res) => {
  const { email, motDePasse } = req.body;

  try {
    // ✅ CHANGÉ : utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasse))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: utilisateur.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, role: utilisateur.role }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { register, login };
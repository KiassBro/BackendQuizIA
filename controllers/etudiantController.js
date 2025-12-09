// controllers/etudiantController.js — VERSION 100% CORRIGÉE & FONCTIONNELLE

const prisma = require('../prisma/client');

// 1. Liste des étudiants en attente
const getEtudiantsEnAttente = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const etudiants = await prisma.utilisateur.findMany({
      where: {
        role: 'ETUDIANT',
        statut: 'EN_ATTENTE'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        dateInscription: true
      },
      orderBy: { dateInscription: 'asc' }
    });

    res.json({
      total: etudiants.length,
      message: etudiants.length ? "Étudiants en attente" : "Aucun étudiant en attente",
      etudiants
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 2. Valider un étudiant
const validerEtudiant = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const { etudiantId } = req.params;

  try {
    const etudiant = await prisma.utilisateur.update({
      where: { id: Number(etudiantId) },
      data: { statut: 'ACTIF' },
      select: { id: true, nom: true, prenom: true, email: true, statut: true }
    });

    res.json({
      message: `Étudiant ${etudiant.prenom || ''} ${etudiant.nom} validé avec succès !`, // CORRIGÉ ICI
      etudiant
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }
    res.status(500).json({ message: "Erreur lors de la validation" });
  }
};

// 3. Refuser un étudiant (suppression)
const refuserEtudiant = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const { etudiantId } = req.params;

  try {
    await prisma.utilisateur.delete({
      where: { id: Number(etudiantId) }
    });

    res.json({ message: "Inscription refusée et compte supprimé" });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }
    res.status(500).json({ message: "Erreur lors du refus" });
  }
};

// 4. Tous les étudiants
const getTousEtudiants = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const etudiants = await prisma.utilisateur.findMany({
      where: { role: 'ETUDIANT' },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        statut: true,
        dateInscription: true
      },
      orderBy: { nom: 'asc' }
    });

    res.json({ total: etudiants.length, etudiants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  getEtudiantsEnAttente,
  validerEtudiant,
  refuserEtudiant,
  getTousEtudiants
};
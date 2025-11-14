const prisma = require('../prisma/client');

// === 1. LISTE DES INSCRIPTIONS EN ATTENTE (ENSEIGNANT UNIQUEMENT) ===
const getPendingUsers = async (req, res) => {
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({ 
      message: "Accès refusé : enseignants uniquement" 
    });
  }

  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      where: { 
        role: 'ETUDIANT', 
        estApprouve: false 
      },
      select: { 
        id: true, 
        nom: true, 
        email: true, 
        dateInscription: true 
      },
      orderBy: { dateInscription: 'asc' }
    });

    res.json({
      message: utilisateurs.length > 0 
        ? `${utilisateurs.length} étudiant(s) en attente d'approbation` 
        : "Aucun étudiant en attente",
      total: utilisateurs.length,
      enAttente: utilisateurs
    });

  } catch (err) {
    console.error('Erreur liste attente:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// === 2. APPROUVER UN ÉTUDIANT ===
const approveUser = async (req, res) => {
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({ 
      message: "Accès refusé : enseignants uniquement" 
    });
  }

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "ID utilisateur manquant" });
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true, role: true, estApprouve: true }
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    if (utilisateur.role !== 'ETUDIANT') {
      return res.status(400).json({ message: "Cet utilisateur n'est pas un étudiant" });
    }

    if (utilisateur.estApprouve) {
      return res.status(400).json({ message: "Cet étudiant est déjà approuvé" });
    }

    await prisma.utilisateur.update({
      where: { id: userId },
      data: { estApprouve: true }
    });

    res.json({ 
      message: "Étudiant approuvé avec succès",
      etudiantId: userId
    });

  } catch (err) {
    console.error('Erreur approbation:', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'approbation' });
  }
};

// === 3. REFUSER UN ÉTUDIANT ===
const rejectUser = async (req, res) => {
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({ 
      message: "Accès refusé : enseignants uniquement" 
    });
  }

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "ID utilisateur manquant" });
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true, role: true, estApprouve: true }
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    if (utilisateur.role !== 'ETUDIANT') {
      return res.status(400).json({ message: "Cet utilisateur n'est pas un étudiant" });
    }

    if (utilisateur.estApprouve) {
      return res.status(400).json({ message: "Impossible de refuser un étudiant déjà approuvé" });
    }

    await prisma.utilisateur.delete({
      where: { id: userId }
    });

    res.json({ 
      message: "Inscription refusée et supprimée",
      etudiantId: userId
    });

  } catch (err) {
    console.error('Erreur refus:', err);
    res.status(500).json({ message: 'Erreur serveur lors du refus' });
  }
};

module.exports = { getPendingUsers, approveUser, rejectUser };
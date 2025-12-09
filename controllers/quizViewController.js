// controllers/quizViewController.js — VERSION 100% FONCTIONNELLE (AUCUNE ERREUR)

const prisma = require('../prisma/client');

// 1. Tous les quiz publics (IA + manuels)
const getTousQuiz = async (req, res) => {
  try {
    const quiz = await prisma.quiz.findMany({
      where: { estPublic: true, estActif: true },
      include: {
        createur: { select: { nom: true, prenom: true } },
        categorie: { select: { nomCategorie: true, slug: true, icone: true } },
        _count: { select: { tentatives: true } },
        statistiques: true
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({
      total: quiz.length,
      quiz
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur chargement quiz" });
  }
};

// 2. Mes quiz créés
const getMesQuiz = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  try {
    const quiz = await prisma.quiz.findMany({
      where: { createurId: req.user.id },
      include: {
        categorie: { select: { nomCategorie: true } },
        _count: { select: { tentatives: true } }
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({ total: quiz.length, mesQuiz: quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur" });
  }
};

// 3. Quiz par catégorie — CORRIGÉ ICI !
const getQuizParCategorie = async (req, res) => {
  const { slug } = req.params;

  try {
    const categorie = await prisma.categorie.findUnique({
      where: { slug },
      include: {
        quizzes: {
          where: { estPublic: true, estActif: true },
          include: {
            createur: { select: { nom: true } },
            _count: { select: { tentatives: true } }
          },
          orderBy: { dateCreation: 'desc' }  // ← ACCOLADE FERMÉE ICI !
        }
      }
    });

    if (!categorie) return res.status(404).json({ message: "Catégorie non trouvée" });

    res.json({
      categorie: categorie.nomCategorie,
      total: categorie.quizzes.length,
      quiz: categorie.quizzes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur" });
  }
};

// 4. Détail d’un quiz
const getQuizById = async (req, res) => {
  const { id } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: Number(id) },
      include: {
        createur: { select: { nom: true, prenom: true } },
        categorie: { select: { nomCategorie: true, icone: true } },
        questions: {
          orderBy: { ordre: 'asc' },
          include: { choix: { orderBy: { ordre: 'asc' } } }
        }
      }
    });

    if (!quiz || !quiz.estPublic) {
      return res.status(404).json({ message: "Quiz non trouvé ou non disponible" });
    }

    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur" });
  }
};

// 5. Recherche
const rechercherQuiz = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ message: "Paramètre q requis" });
  }

  try {
    const quiz = await prisma.quiz.findMany({
      where: {
        estPublic: true,
        OR: [
          { titre: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        categorie: { select: { nomCategorie: true } },
        createur: { select: { nom: true } }
      },
      orderBy: { dateCreation: 'desc' },
      take: 20
    });

    res.json({ recherche: q, total: quiz.length, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur recherche" });
  }
};

module.exports = {
  getTousQuiz,
  getMesQuiz,
  getQuizParCategorie,
  getQuizById,
  rechercherQuiz
};
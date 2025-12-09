// controllers/quizManuelController.js
const prisma = require('../prisma/client');

// Créer un quiz manuellement
const creerQuizManuel = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const {
    titre,
    description,
    categorieSlug,
    niveau = "INTERMEDIAIRE",
    dureeMinutes = 30,
    estPublic = true,
    questions = [] // optionnel : créer avec questions direct
  } = req.body;

  if (!titre || !categorieSlug) {
    return res.status(400).json({ message: "Titre et catégorie requis" });
  }

  try {
    const categorie = await prisma.categorie.findUnique({
      where: { slug: categorieSlug }
    });

    if (!categorie) return res.status(404).json({ message: "Catégorie introuvable" });

    const slug = titre
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const quiz = await prisma.quiz.create({
      data: {
        titre,
        slug,
        description,
        niveau,
        dureeMinutes,
        estPublic,
        modeCreation: 'manuel',
        estGenereParIA: false,
        nombreQuestions: questions.length,
        pointsTotaux: questions.length * 10,
        categorieId: categorie.id,
        createurId: req.user.id,
        questions: questions.length > 0 ? {
          create: questions.map((q, i) => ({
            texteQuestion: q.texteQuestion,
            type: q.type || 'QCM',
            ordre: i,
            points: q.points || 10,
            explication: q.explication || null,
            choix: q.choix ? {
              create: q.choix.map((c, idx) => ({
                texte: c.texte,
                estCorrect: c.estCorrect || false,
                ordre: idx
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        questions: { include: { choix: true } },
        categorie: true,
        createur: { select: { nom: true, prenom: true } }
      }
    });

    res.status(201).json({
      message: "Quiz créé manuellement avec succès !",
      quiz
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur création quiz manuel" });
  }
};

// Ajouter une question à un quiz existant
const ajouterQuestion = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const { quizId } = req.params;
  const { texteQuestion, type = 'QCM', points = 10, explication, choix } = req.body;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: Number(quizId), createurId: req.user.id }
    });

    if (!quiz) return res.status(404).json({ message: "Quiz non trouvé ou accès refusé" });

    const question = await prisma.question.create({
      data: {
        quizId: Number(quizId),
        texteQuestion,
        type,
        points,
        explication,
        ordre: 999, // sera recalculé plus tard ou par front
        choix: type === 'QCM' && choix ? {
          create: choix.map((c, i) => ({
            texte: c.texte,
            estCorrect: c.estCorrect || false,
            ordre: i
          }))
        } : undefined
      },
      include: { choix: true }
    });

    // Mise à jour du nombre de questions
    await prisma.quiz.update({
      where: { id: Number(quizId) },
      data: {
        nombreQuestions: { increment: 1 },
        pointsTotaux: { increment: points }
      }
    });

    res.json({ message: "Question ajoutée !", question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur ajout question" });
  }
};

module.exports = { creerQuizManuel, ajouterQuestion };
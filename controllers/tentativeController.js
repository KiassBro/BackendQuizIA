// controllers/tentativeController.js — VERSION 100% CORRIGÉE ET FONCTIONNELLE (2025)

const prisma = require('../prisma/client');
const { callOpenAI } = require('../utils/openai');

// Démarrer une tentative — CORRIGÉ
const startAttempt = async (req, res) => {
  const { quizId: quizIdParam } = req.params;
  const utilisateurId = req.user.id;

  if (req.user.role === 'ETUDIANT' && req.user.statut !== 'ACTIF') {
    return res.status(403).json({ message: "Votre compte n'est pas encore validé" });
  }

  try {
    const quizId = Number(quizIdParam);
    if (isNaN(quizId)) {
      return res.status(400).json({ message: "ID du quiz invalide" });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, estPublic: true, estActif: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz non trouvé ou non disponible" });
    }

    const tentative = await prisma.tentativeQuiz.create({
      data: {
        quizId,
        utilisateurId,
        dateDebut: new Date(),
        nombreQuestions: quiz.nombreQuestions
      }
    });

    res.json({
      message: "Tentative démarrée avec succès !",
      tentativeId: tentative.id
    });

  } catch (err) {
    console.error("Erreur startAttempt:", err);
    res.status(500).json({ message: "Erreur lors du démarrage" });
  }
};

// Soumettre les réponses + IA
const submitTentative = async (req, res) => {
  const { tentativeId, reponses } = req.body;

  if (!tentativeId || !Array.isArray(reponses) || reponses.length === 0) {
    return res.status(400).json({ message: "Données invalides" });
  }

  try {
    const tentative = await prisma.tentativeQuiz.findUnique({
      where: { id: tentativeId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { choix: true },
              orderBy: { ordre: 'asc' }
            }
          }
        }
      }
    });

    if (!tentative) return res.status(404).json({ message: "Tentative non trouvée" });
    if (tentative.utilisateurId !== req.user.id) return res.status(403).json({ message: "Accès refusé" });
    if (tentative.estTermine) return res.status(400).json({ message: "Tentative déjà soumise" });

    let scoreTotal = 0;
    const resultats = [];

    for (const rep of reponses) {
      const question = tentative.quiz.questions.find(q => q.id === rep.questionId);
      if (!question) continue;

      let estCorrect = false;
      let pointsGagnes = 0;
      let feedbackIA = "";

      if (question.type === 'QCM') {
        const choix = question.choix.find(c => c.id === rep.choixId);
        estCorrect = choix?.estCorrect || false;
        pointsGagnes = estCorrect ? question.points : 0;
      } else if (['REPONSE_COURTE', 'REPONSE_LONGUE'].includes(question.type)) {
        const prompt = `Évalue la réponse de l'étudiant de façon juste et bienveillante.

Question : ${question.texteQuestion}
Réponse de l'étudiant : """${rep.reponseDonnee || ''}"""

Réponds UNIQUEMENT avec ce JSON :
{
  "correct": true,
  "score": 8,
  "feedback": "Bonne réponse !"
}`;

        try {
          const { content } = await callOpenAI(prompt, req.user.id, 'evaluer_reponse');
          const cleaned = content.replace(/^```json\n?|```$/g, '').trim();
          const eval = JSON.parse(cleaned);
          estCorrect = !!eval.correct;
          pointsGagnes = Math.round((eval.score / 10) * question.points);
          feedbackIA = eval.feedback || "Bon effort !";
        } catch (e) {
          pointsGagnes = 0;
          feedbackIA = "Évaluation IA temporairement indisponible";
        }
      }

      await prisma.reponseUtilisateur.create({
        data: {
          tentativeId,
          questionId: question.id,
          choixId: rep.choixId || null,
          texteReponse: rep.reponseDonnee || null,
          utilisateurId: req.user.id,
          estCorrect,
          pointsObtenus: pointsGagnes,
          feedbackIA
        }
      });

      scoreTotal += pointsGagnes;
      resultats.push({ questionId: question.id, estCorrect, pointsGagnes, feedbackIA });
    }

    const pourcentage = Number(((scoreTotal / tentative.quiz.pointsTotaux) * 100).toFixed(2));

    await prisma.tentativeQuiz.update({
      where: { id: tentativeId },
      data: {
        estTermine: true,
        dateFin: new Date(),
        scoreObtenu: scoreTotal,
        pourcentage,
        nombreBonnesReponses: resultats.filter(r => r.estCorrect).length
      }
    });

    // Mise à jour des statistiques — CORRIGÉ ICI !
    await prisma.statistiquesQuiz.upsert({
      where: { quizId: tentative.quizId },
      update: {
        nombreTentatives: { increment: 1 },
        nombreTermines: { increment: 1 },
        noteMoyenne: { set: await calculerMoyenneQuiz(tentative.quizId) }
      },
      create: {
        quizId: tentative.quizId,
        nombreTentatives: 1,
        nombreTermines: 1,
        noteMoyenne: pourcentage
      }
    });

    res.json({
      message: "Quiz terminé avec succès !",
      score: scoreTotal,
      pourcentage: pourcentage + "%",
      totalPoints: tentative.quiz.pointsTotaux,
      resultats
    });

  } catch (err) {
    console.error('Erreur soumission:', err);
    res.status(500).json({ message: "Erreur serveur lors de la soumission" });
  }
};

// Mes résultats
const getMyResults = async (req, res) => {
  try {
    const resultats = await prisma.tentativeQuiz.findMany({
      where: { utilisateurId: req.user.id, estTermine: true },
      include: {
        quiz: {
          select: { titre: true, imageCouverture: true, niveau: true }
        }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({ total: resultats.length, resultats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur chargement résultats" });
  }
};

// Résultats d’un étudiant (prof/admin)
const getStudentResults = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const { etudiantId } = req.params;

  try {
    const resultats = await prisma.tentativeQuiz.findMany({
      where: { utilisateurId: Number(etudiantId), estTermine: true },
      include: {
        quiz: { select: { titre: true, categorie: { select: { nomCategorie: true } } } },
        reponses: {
          include: { question: { select: { texteQuestion: true } } }
        }
      },
      orderBy: { dateFin: 'desc' }
    });

    const etudiant = await prisma.utilisateur.findUnique({
      where: { id: Number(etudiantId) },
      select: { nom: true, prenom: true, email: true }
    });

    res.json({ etudiant, total: resultats.length, resultats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur" });
  }
};

// Tous les résultats (admin)
const getAllResults = async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: "Accès réservé à l'admin" });
  }

  try {
    const resultats = await prisma.tentativeQuiz.findMany({
      where: { estTermine: true },
      include: {
        utilisateur: { select: { nom: true, prenom: true, email: true } },
        quiz: { select: { titre: true, categorie: { select: { nomCategorie: true } } } }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({ total: resultats.length, resultats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur admin" });
  }
};

// Moyenne
const calculerMoyenneQuiz = async (quizId) => {
  const stats = await prisma.tentativeQuiz.aggregate({
    where: { quizId, estTermine: true },
    _avg: { pourcentage: true }
  });
  return Number(stats._avg.pourcentage || 0).toFixed(2);
};

module.exports = {
  startAttempt,
  submitTentative,
  getMyResults,
  getStudentResults,
  getAllResults
};
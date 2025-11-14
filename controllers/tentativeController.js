// controllers/attemptController.js
const prisma = require('../prisma/client');
const { callOpenAI } = require('../utils/openai');

const startAttempt = async (req, res) => {
  const { quizId } = req.params;
  try {
    const tentative = await prisma.tentative.create({
      data: {
        utilisateurId: req.user.id,
        quizId,
      }
    });
    res.json({ tentativeId: tentative.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur démarrage' });
  }
};

const submitAnswers = async (req, res) => {
  const { tentativeId, answers } = req.body;

  if (!tentativeId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ message: "Données manquantes" });
  }

  let scoreTotal = 0;
  const resultats = [];

  try {
    for (const rep of answers) {
      const question = await prisma.question.findUnique({
        where: { id: rep.questionId }
      });

      // PROTECTION ULTRA-ROBUSTE (ne plante JAMAIS)
      if (!question) {
        resultats.push({
          questionId: rep.questionId,
          reponseDonnee: rep.reponseDonnee,
          correct: false,
          scoreObtenu: 0,
          feedbackIA: "Question non trouvée (ID invalide)"
        });
        continue; // passe à la suivante
      }

      let correct = false;
      let score = 0;
      let feedback = '';

      // QCM ou VRAI_FAUX
      if (question.type === 'QCM' || question.type === 'VRAI_FAUX') {
        correct = JSON.stringify(question.reponseCorrecte) === JSON.stringify(rep.reponseDonnee);
        score = correct ? question.points : 0;
      } 
      // TEXTE_COURT ou TEXTE_LONG → ÉVALUATION IA
      else {
        const prompt = `Évalue cette réponse à la question : "${question.texte}"
Réponse attendue : ${JSON.stringify(question.reponseCorrecte)}
Réponse étudiant : "${rep.reponseDonnee}"

Retourne UNIQUEMENT ce JSON :
{"correct":true/false,"score":0-10,"feedback":"explication courte"}

JSON PUR :`;

        try {
          const { content } = await callOpenAI(prompt, req.user.id);
          const cleaned = content.trim().replace(/^```json|```$/g, '').trim();
          const evalIA = JSON.parse(cleaned);
          correct = evalIA.correct;
          score = (evalIA.score / 10) * question.points;
          feedback = evalIA.feedback || '';
        } catch (err) {
          correct = false;
          score = 3;
          feedback = "Évaluation IA échouée";
        }
      }

      scoreTotal += score;

      // Sauvegarde en base
      await prisma.reponseUtilisateur.create({
        data: {
          tentativeId,
          questionId: rep.questionId,
          reponseDonnee: rep.reponseDonnee,
          estCorrecte: correct,
          scoreObtenu: score,
          feedbackIA: feedback
        }
      });

      resultats.push({
        questionId: rep.questionId,
        reponseDonnee: rep.reponseDonnee,
        correct,
        scoreObtenu: score,
        feedbackIA: feedback
      });
    }

    // Fin de tentative
    await prisma.tentative.update({
      where: { id: tentativeId },
      data: {
        estTermine: true,
        dateFin: new Date(),
        scoreTotal,
        feedbackGlobal: `Score final : ${scoreTotal.toFixed(1)} points`
      }
    });

    res.json({
      message: "Quiz terminé avec succès !",
      scoreTotal: parseFloat(scoreTotal.toFixed(1)),
      resultats
    });

  } catch (err) {
    console.error("Erreur soumission :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

// --- MES RÉSULTATS (étudiant connecté) ---
const getMyResults = async (req, res) => {
  try {
    const resultats = await prisma.tentative.findMany({
      where: {
        utilisateurId: req.user.id,
        estTermine: true
      },
      include: {
        quiz: {
          select: { titre: true, theme: true }
        },
        reponseUtilisateurs: {
          select: {
            question: { select: { texte: true } },
            reponseDonnee: true,
            estCorrecte: true,
            scoreObtenu: true,
            feedbackIA: true
          }
        }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({
      total: resultats.length,
      mesResultats: resultats
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur chargement résultats" });
  }
};

// --- RÉSULTATS D'UN ÉTUDIANT (enseignant/admin) ---
const getStudentResults = async (req, res) => {
  const { etudiantId } = req.params;

  // Vérifie que l'utilisateur est enseignant ou admin
  if (req.user.role !== 'ENSEIGNANT' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: "Accès refusé : enseignant ou admin requis" });
  }

  try {
    const etudiant = await prisma.utilisateur.findUnique({
      where: { id: etudiantId },
      select: { id: true, nom: true, email: true }
    });

    if (!etudiant) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    const resultats = await prisma.tentative.findMany({
      where: {
        utilisateurId: etudiantId,
        estTermine: true
      },
      include: {
        quiz: { select: { titre: true } },
        reponseUtilisateurs: {
          select: {
            question: { select: { texte: true } },
            reponseDonnee: true,
            estCorrecte: true,
            scoreObtenu: true
          }
        }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({
      etudiant: { nom: etudiant.nom, email: etudiant.email },
      totalQuiz: resultats.length,
      resultats
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- TOUS LES RÉSULTATS (admin uniquement) ---
const getAllResults = async (req, res) => {
  try {
    const resultats = await prisma.tentative.findMany({
      where: { estTermine: true },
      include: {
        utilisateur: { select: { nom: true, email: true } },
        quiz: { select: { titre: true } }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({
      total: resultats.length,
      tousResultats: resultats
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur admin" });
  }
};

module.exports = { 
  startAttempt, 
  submitAnswers, 
  getMyResults, 
  getStudentResults, 
  getAllResults 
};

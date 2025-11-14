const prisma = require('../prisma/client');
const { callOpenAI } = require('../utils/openai');

// === 1. DÉMARRER UNE TENTATIVE (ÉTUDIANT APPROUVÉ UNIQUEMENT) ===
const startAttempt = async (req, res) => {
  const { quizId } = req.params;

  // Vérifie que l'étudiant est approuvé
  if (req.user.role === 'ETUDIANT' && !req.user.estApprouve) {
    return res.status(403).json({
      message: "Votre compte est en attente d'approbation par l'enseignant"
    });
  }

  try {
    // Vérifie que le quiz existe et est public
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, estPublic: true }
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz non trouvé ou non public" });
    }

    const tentative = await prisma.tentative.create({
      data: {
        utilisateurId: req.user.id,
        quizId,
        dateDebut: new Date()
      }
    });

    res.json({
      message: "Tentative démarrée !",
      tentativeId: tentative.id
    });
  } catch (err) {
    console.error('Erreur démarrage:', err);
    res.status(500).json({ message: 'Erreur lors du démarrage de la tentative' });
  }
};

// === 2. SOUMETTRE LES RÉPONSES (AVEC ÉVALUATION IA) ===
const submitAnswers = async (req, res) => {
  const { tentativeId, answers } = req.body;

  if (!tentativeId || !answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "Tentative ID et réponses requises" });
  }

  // Vérifie que la tentative appartient à l'utilisateur
  const tentative = await prisma.tentative.findUnique({
    where: { id: tentativeId },
    include: { utilisateur: true }
  });

  if (!tentative || tentative.utilisateurId !== req.user.id) {
    return res.status(403).json({ message: "Accès refusé à cette tentative" });
  }

  if (tentative.estTermine) {
    return res.status(400).json({ message: "Cette tentative est déjà terminée" });
  }

  let scoreTotal = 0;
  const resultats = [];

  try {
    for (const rep of answers) {
      const question = await prisma.question.findUnique({
        where: { id: rep.questionId }
      });

      if (!question) {
        resultats.push({
          questionId: rep.questionId,
          reponseDonnee: rep.reponseDonnee,
          correct: false,
          scoreObtenu: 0,
          feedbackIA: "Question non trouvée"
        });
        continue;
      }

      let correct = false;
      let score = 0;
      let feedback = '';

      // QCM / VRAI_FAUX
      if (question.type === 'QCM' || question.type === 'VRAI_FAUX') {
        correct = JSON.stringify(question.reponseCorrecte) === JSON.stringify(rep.reponseDonnee);
        score = correct ? question.points : 0;
      } 
      // TEXTE → IA
      else {
        const prompt = `Évalue cette réponse :
Question : "${question.texte}"
Réponse attendue : ${JSON.stringify(question.reponseCorrecte)}
Réponse étudiant : "${rep.reponseDonnee}"

Retourne UNIQUEMENT :
{"correct":true/false,"score":0-10,"feedback":"explication courte"}

JSON PUR :`;

        try {
          const { content } = await callOpenAI(prompt, req.user.id);
          const cleaned = content.trim().replace(/^```json|```$/g, '').trim();
          const evalIA = JSON.parse(cleaned);
          correct = evalIA.correct;
          score = (evalIA.score / 10) * question.points;
          feedback = evalIA.feedback || "Pas de feedback";
        } catch {
          correct = false;
          score = 0;
          feedback = "Évaluation IA indisponible";
        }
      }

      scoreTotal += score;

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

    // Termine la tentative
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
    console.error("Erreur soumission:", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

// === 3. MES RÉSULTATS (ÉTUDIANT) ===
const getMyResults = async (req, res) => {
  try {
    const resultats = await prisma.tentative.findMany({
      where: {
        utilisateurId: req.user.id,
        estTermine: true
      },
      include: {
        quiz: { select: { titre: true, theme: true, dateCreation: true } },
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
      message: "Vos résultats",
      total: resultats.length,
      resultats
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur chargement" });
  }
};

// === 4. RÉSULTATS D'UN ÉTUDIANT (ENSEIGNANT UNIQUEMENT) ===
const getStudentResults = async (req, res) => {
  const { etudiantId } = req.params;

  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({ message: "Accès refusé : enseignants uniquement" });
  }

  try {
    const etudiant = await prisma.utilisateur.findUnique({
      where: { id: etudiantId, role: 'ETUDIANT' },
      select: { id: true, nom: true, email: true }
    });

    if (!etudiant) return res.status(404).json({ message: "Étudiant non trouvé" });

    const resultats = await prisma.tentative.findMany({
      where: { utilisateurId: etudiantId, estTermine: true },
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
    res.status(500).json({ message: "Erreur" });
  }
};

// === 5. TOUS LES RÉSULTATS (ENSEIGNANT UNIQUEMENT) ===
const getAllResults = async (req, res) => {
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({ message: "Accès refusé : enseignants uniquement" });
  }

  try {
    const resultats = await prisma.tentative.findMany({
      where: { estTermine: true },
      include: {
        utilisateur: { select: { nom: true, email: true } },
        quiz: { select: { titre: true, dateCreation: true } }
      },
      orderBy: { dateFin: 'desc' }
    });

    res.json({
      message: "Tous les résultats",
      total: resultats.length,
      resultats
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
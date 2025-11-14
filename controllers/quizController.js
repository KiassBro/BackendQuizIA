// controllers/quizController.js → SYSTÈME ÉDUCATIF MALGACHE PARFAIT 2025
const prisma = require('../prisma/client');
const { callOpenAI } = require('../utils/openai');

// === 1. GÉNÉRER UN QUIZ AVEC IA (ENSEIGNANT UNIQUEMENT) ===
const genererQuizIA = async (req, res) => {
  // Vérifie que c'est un enseignant
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({
      message: "Accès refusé : seuls les enseignants peuvent générer des quiz"
    });
  }

  const { theme, niveau = 'INTERMEDIAIRE', nbQuestions = 5 } = req.body;

  if (!theme || nbQuestions < 1 || nbQuestions > 20) {
    return res.status(400).json({
      message: "Thème requis, nombre de questions entre 1 et 20"
    });
  }

  const prompt = `Génère UNIQUEMENT du JSON valide (RIEN D'AUTRE) pour un quiz QCM.

Thème : "${theme}"
Niveau : ${niveau}
Questions : exactement ${nbQuestions}

Format strict :
{
  "titre": "string",
  "description": "string courte",
  "questions": [
    {
      "texte": "Question ?",
      "options": ["A", "B", "C", "D"],
      "reponseCorrecte": "B",
      "explication": "Explication courte"
    }
  ]
}

JSON PUR UNIQUEMENT :`;

  try {
    const { content } = await callOpenAI(prompt, req.user.id);

    // Nettoyage ultra-robuste
    let jsonString = content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Aucun JSON détecté");

    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new Error("JSON invalide généré par l'IA");
    }

    // Création du quiz
    const quiz = await prisma.quiz.create({
      data: {
        titre: data.titre || `Quiz : ${theme}`,
        description: data.description || `Quiz généré par IA sur ${theme}`,
        theme,
        niveau,
        estGenereParIA: true,
        estPublic: true,
        createurId: req.user.id,  // Enseignant = créateur
        questions: {
          create: data.questions.map(q => ({
            texte: q.texte,
            type: 'QCM',
            options: q.options,
            reponseCorrecte: q.reponseCorrecte,
            explication: q.explication || '',
            estGenereeParIA: true
          }))
        }
      },
      include: { questions: true }
    });

    res.json({
      message: "Quiz généré avec succès !",
      quiz
    });

  } catch (err) {
    console.error('Erreur génération quiz:', err.message);
    res.status(500).json({
      message: "Erreur lors de la génération du quiz",
      erreur: err.message,
      conseil: "Vérifie ta clé OpenAI ou réessaie"
    });
  }
};

// === 2. LISTER LES QUIZ PUBLICS (ÉTUDIANTS APPROUVÉS UNIQUEMENT) ===
const listerQuizPublics = async (req, res) => {
  // Vérifie connexion + approbation
  if (!req.user) {
    return res.status(401).json({ message: "Connexion requise" });
  }

  if (req.user.role === 'ETUDIANT' && !req.user.estApprouve) {
    return res.status(403).json({
      message: "Votre compte est en attente d'approbation"
    });
  }

  try {
    const quiz = await prisma.quiz.findMany({
      where: { estPublic: true },
      include: {
        questions: {
          select: { id: true, texte: true, type: true, options: true }
        },
        createur: {
          select: { nom: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({
      message: "Quiz publics chargés",
      total: quiz.length,
      quiz
    });
  } catch (err) {
    console.error('Erreur liste quiz:', err);
    res.status(500).json({ message: 'Erreur chargement des quiz' });
  }
};

// === 3. LISTER MES QUIZ (ENSEIGNANT UNIQUEMENT) ===
const listerMesQuiz = async (req, res) => {
  if (req.user.role !== 'ENSEIGNANT') {
    return res.status(403).json({
      message: "Accès refusé : enseignants uniquement"
    });
  }

  try {
    const quiz = await prisma.quiz.findMany({
      where: { createurId: req.user.id },
      include: {
        questions: { select: { id: true, texte: true, type: true } }
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({
      message: "Vos quiz chargés",
      total: quiz.length,
      mesQuiz: quiz
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur chargement de vos quiz' });
  }
};

module.exports = { genererQuizIA, listerQuizPublics, listerMesQuiz };
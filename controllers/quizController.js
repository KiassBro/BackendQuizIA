// controllers/quizController.js → VERSION INFAILLIBLE 2025
const prisma = require('../prisma/client');
const { callOpenAI } = require('../utils/openai');

const genererQuizIA = async (req, res) => {
  const { theme, niveau = 'INTERMEDIAIRE', nbQuestions = 5 } = req.body;

  // PROMPT ULTRA-STRICT POUR FORCER UN JSON PUR
  const prompt = `Tu es un assistant qui génère UNIQUEMENT du JSON valide, RIEN D'AUTRE.
Génère un quiz sur "${theme}" avec exactement ${nbQuestions} questions QCM.
Niveau : ${niveau}.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec du JSON valide
- Pas de texte avant ou après
- Pas de \`\`\`json ou \`\`\`
- Pas d'explications

Format exact à respecter :

{
  "titre": "string",
  "description": "string courte",
  "questions": [
    {
      "texte": "La question ?",
      "options": ["A", "B", "C", "D"],
      "reponseCorrecte": "B",
      "explication": "Explication courte"
    }
  ]
}

Thème : ${theme}
Niveau : ${niveau}
Nombre de questions : ${nbQuestions}
JSON PUR UNIQUEMENT :`;

  try {
    const { content } = await callOpenAI(prompt, req.user.id);

    // NETTOYAGE ULTRA-ROBUSTE (au cas où GPT fait encore n'importe quoi)
    let jsonString = content.trim();

    // Supprime les blocs ```json ... ```
    jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    jsonString = jsonString.trim();

    // Si ça commence par du texte, on extrait le JSON avec regex (ultime sécurité)
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Aucun JSON trouvé dans la réponse IA');
    }
    jsonString = jsonMatch[0];

    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('JSON invalide reçu:', jsonString);
      throw new Error('Format JSON invalide généré par l\'IA');
    }

    // Création du quiz en base
    const quiz = await prisma.quiz.create({
      data: {
        titre: data.titre || `Quiz sur ${theme}`,
        description: data.description || `Quiz généré par IA sur ${theme}`,
        theme,
        niveau,
        estGenereParIA: true,
        estPublic: true,
        createurId: req.user.id,
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

    res.json(quiz);

  } catch (err) {
    console.error('Erreur génération quiz:', err.message);
    res.status(500).json({
      message: "Erreur lors de la génération du quiz",
      error: err.message,
      conseil: "Vérifie ta clé OpenAI ou réessaie"
    });
  }
};

// Lister tous les quiz publics (accessible sans login)
const listerQuizPublics = async (req, res) => {
  try {
    const quiz = await prisma.quiz.findMany({
      where: { estPublic: true },
      include: {
        questions: {
          select: { id: true, texte: true, type: true }
        },
        createur: {
          select: { nom: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({
      total: quiz.length,
      quiz
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors du chargement des quiz' });
  }
};

// Lister uniquement mes quiz (connecté)
const listerMesQuiz = async (req, res) => {
  try {
    const quiz = await prisma.quiz.findMany({
      where: { createurId: req.user.id },
      include: {
        questions: {
          select: { id: true, texte: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });

    res.json({
      total: quiz.length,
      mesQuiz: quiz
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur' });
  }
};

module.exports = { genererQuizIA, listerQuizPublics, listerMesQuiz };

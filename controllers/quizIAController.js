// controllers/quizIAController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { callOpenAI } = require('../utils/openai');

const genererQuizIA = async (req, res) => {
  if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) {
    return res.status(403).json({ message: "Accès refusé" });
  }

  const { theme, categorieSlug, niveau = 'INTERMEDIAIRE', nbQuestions = 8 } = req.body;

  if (!theme || !categorieSlug || nbQuestions < 3 || nbQuestions > 20) {
    return res.status(400).json({ message: "Données invalides" });
  }

  try {
    const categorie = await prisma.categorie.findUnique({
      where: { slug: categorieSlug }
    });

    if (!categorie) return res.status(404).json({ message: "Catégorie non trouvée" });

    const prompt = `
Tu es un expert pédagogique malgache. Crée un quiz QCM de qualité sur le thème suivant.

Thème : ${theme}
Niveau : ${niveau}
Nombre de questions : ${nbQuestions}
Catégorie : ${categorie.nomCategorie}

Réponds UNIQUEMENT avec du JSON valide au format suivant :

{
  "titre": "Titre accrocheur du quiz",
  "description": "Description courte et motivante",
  "questions": [
    {
      "texteQuestion": "La question claire ?",
      "type": "QCM",
      "choix": [
        { "texte": "Option A", "estCorrect": false },
        { "texte": "Option B", "estCorrect": true },
        { "texte": "Option C", "estCorrect": false },
        { "texte": "Option D", "estCorrect": false }
      ],
      "explication": "Explication détaillée après réponse"
    }
  ]
}
`;

    const { content } = await callOpenAI(prompt, req.user.id, 'generer_quiz');

    let data;
    try {
      const cleaned = content.replace(/^```json\n?|```$/g, '').trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ message: "IA n'a pas renvoyé du JSON valide" });
    }

    const slug = data.titre
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const quiz = await prisma.quiz.create({
      data: {
        titre: data.titre,
        slug: slug + '-' + Date.now(),
        description: data.description,
        niveau,
        nombreQuestions: data.questions.length,
        pointsTotaux: data.questions.length * 10,
        estPublic: true,
        estGenereParIA: true,
        modeCreation: 'ia',
        categorieId: categorie.id,
        createurId: req.user.id,
        questions: {
          create: data.questions.map((q, i) => ({
            texteQuestion: q.texteQuestion,
            type: q.type || 'QCM',
            ordre: i,
            points: 10,
            explication: q.explication,
            estGenereeParIA: true,
            choix: {
              create: q.choix.map((c, idx) => ({
                texte: c.texte,
                estCorrect: c.estCorrect,
                ordre: idx
              }))
            }
          }))
        }
      },
      include: {
        questions: { include: { choix: true } },
        categorie: true,
        createur: { select: { nom: true, prenom: true } }
      }
    });

    res.json({ message: "Quiz généré par IA avec succès !", quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur génération IA", erreur: err.message });
  }
};

module.exports = { genererQuizIA };
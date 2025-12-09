// utils/openai.js
const OpenAI = require('openai');
const prisma = require('../prisma/client');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const callOpenAI = async (prompt, utilisateurId = null, typeAction = 'autre') => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant pédagogique expert. Réponds toujours en français et uniquement avec du JSON valide quand demandé."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "";
    const tokens = completion.usage?.total_tokens || 0;

    // Enregistrement dans l'historique
    await prisma.promptIA.create({
      data: {
        utilisateurId,
        typeAction,
        prompt,
        reponse: content,
        model: "gpt-4o-mini",
        tokens,
        coutEstimate: Number((tokens * 0.0000006).toFixed(8)) // ≈ prix réel
      }
    });

    return { content, tokens };

  } catch (error) {
    console.error('Erreur OpenAI:', error.message);

    // Gestion des erreurs fréquentes
    if (error.status === 401) {
      throw new Error('Clé OpenAI invalide');
    }
    if (error.status === 429) {
      throw new Error('Limite quota OpenAI dépassée');
    }
    if (error.status === 400) {
      throw new Error('Requête trop longue ou mal formée');
    }

    throw new Error('OpenAI indisponible : ' + error.message);
  }
};

module.exports = { callOpenAI };
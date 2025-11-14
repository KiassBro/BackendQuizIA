// utils/openai.js → VERSION 100% CORRIGÉE POUR TON SCHEMA FRANÇAIS
const { OpenAI } = require('openai');
const prisma = require('../prisma/client');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const callOpenAI = async (prompt, utilisateurId = null, typeAction = 'generer_quiz') => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content.trim();
    const tokens = response.usage?.total_tokens || 0;

    // ENREGISTRE LE PROMPT DANS LA TABLE prompt_ais (en français !)
    await prisma.promptIA.create({
      data: {
        typeAction,
        promptEnvoye: prompt,
        reponseIA: content,
        coutTokens: tokens,
        utilisateurId: utilisateurId || null
      }
    });

    return { content, tokens };
  } catch (err) {
    console.error('Erreur OpenAI:', err.message);
    throw new Error('OpenAI API indisponible ou clé invalide');
  }
};

module.exports = { callOpenAI };
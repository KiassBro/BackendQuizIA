const toggleFavori = async (req, res) => {
    const { quizId } = req.params;
    const utilisateurId = req.user.id;
  
    try {
      const exist = await prisma.quizEpingles.findUnique({
        where: { quizId_utilisateurId: { quizId: Number(quizId), utilisateurId } }
      });
  
      if (exist) {
        await prisma.quizEpingles.delete({
          where: { id: exist.id }
        });
        return res.json({ message: "Quiz retiré des favoris" });
      } else {
        await prisma.quizEpingles.create({
          data: { quizId: Number(quizId), utilisateurId } });
        return res.json({ message: "Quiz ajouté aux favoris" });
      }
    } catch (err) {
      res.status(500).json({ message: "Erreur favori" });
    }
  };
  
  const getMesFavoris = async (req, res) => {
    const favoris = await prisma.quizEpingles.findMany({
      where: { utilisateurId: req.user.id },
      include: { quiz: { include: { categorie: true, createur: { select: { nom: true } } } } },
      orderBy: { dateEpingle: 'desc' }
    });
    res.json({ favoris });
  };
  
  module.exports = { toggleFavori, getMesFavoris };
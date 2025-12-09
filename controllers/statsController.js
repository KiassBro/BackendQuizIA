const getDashboardStats = async (req, res) => {
    if (!['ADMIN', 'ENSEIGNANT'].includes(req.user.role)) return res.status(403).json({ message: "Accès refusé" });
  
    const stats = await prisma.$transaction([
      prisma.utilisateur.count({ where: { role: 'ETUDIANT' } }),
      prisma.utilisateur.count({ where: { role: 'ENSEIGNANT' } }),
      prisma.quiz.count(),
      prisma.tentativeQuiz.count({ where: { estTermine: true } }),
      prisma.quiz.findMany({
        include: {
          _count: { select: { tentatives: true } },
          statistiques: true,
          categorie: true
        },
        orderBy: { tentatives: { _count: 'desc' } },
        take: 10
      })
    ]);
  
    res.json({
      totalEtudiants: stats[0],
      totalEnseignants: stats[1],
      totalQuiz: stats[2],
      totalTentatives: stats[3],
      topQuiz: stats[4]
    });
  };
  
  module.exports = { getDashboardStats };
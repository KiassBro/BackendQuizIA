// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 1. Admin + Enseignant
  const admin = await prisma.utilisateur.upsert({
    where: { email: 'admin@techquiz.mg' },
    update: {},
    create: {
      nom: 'Admin',
      prenom: 'Principal',
      email: 'admin@techquiz.mg',
      motDePasse: await bcrypt.hash('admin2025', 12),
      role: 'ADMIN',
      statut: 'ACTIF'
    }
  });

  const prof = await prisma.utilisateur.upsert({
    where: { email: 'prof@techquiz.mg' },
    update: {},
    create: {
      nom: 'Rakoto',
      prenom: 'Jean',
      email: 'prof@techquiz.mg',
      motDePasse: await bcrypt.hash('prof123', 12),
      role: 'ENSEIGNANT',
      statut: 'ACTIF'
    }
  });

  // 2. Catégories
  const categories = await Promise.all([
    prisma.categorie.create({ data: { nomCategorie: 'Mathématiques', slug: 'mathematiques', icone: 'π', couleur: '#10B981' } }),
    prisma.categorie.create({ data: { nomCategorie: 'Informatique', slug: 'informatique', icone: '</>', couleur: '#3B82F6' } }),
    prisma.categorie.create({ data: { nomCategorie: 'Histoire de Madagascar', slug: 'histoire-madagascar', icone: 'Madagascar Flag', couleur: '#EF4444' } }),
    prisma.categorie.create({ data: { nomCategorie: 'Anglais', slug: 'anglais', icone: 'UK Flag', couleur: '#8B5CF6' } }),
    prisma.categorie.create({ data: { nomCategorie: 'Physique', slug: 'physique', icone: 'Atom', couleur: '#F59E0B' } }),
  ]);

  console.log('Admin, prof et catégories créés !');
  console.log(`Connexion admin → email: admin@techquiz.mg / mdp: admin2025`);
  console.log(`Connexion prof  → email: prof@techquiz.mg / mdp: prof123`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
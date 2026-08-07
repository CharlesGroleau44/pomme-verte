// prisma/seed.ts
// node prisma/seed.ts (ou: npm run db:seed)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ECOLES = [
  'Boisé-Fabi',
  'Brassard - Saint-Patrice',
  'Jardin-des-Lacs',
  'Notre-Dame-de-Liesse',
  'Sacré-Cœur',
  'Plein Soleil',
  'Dominique-Savio',
  'St-Pie X',
];

const REPAS = [
  { nom: 'Hamburger sur la route', description: 'Accompagné de crudités et trempette' },
  { nom: 'Macaroni feu de camps', description: 'Au fromage fumé' },
  { nom: 'Boulettes beach party', description: 'Boulettes sucrées salées, riz et poivrons' },
  { nom: 'Sandwich', description: 'Choix du chef' },
  { nom: 'Pâtes choix du chef', description: 'Sauce au choix' },
];

async function main() {
  for (const nom of ECOLES) {
    const existing = await prisma.ecole.findFirst({ where: { nom } });
    if (!existing) await prisma.ecole.create({ data: { nom } });
  }

  for (const r of REPAS) {
    const existing = await prisma.repas.findFirst({ where: { nom: r.nom } });
    if (!existing) {
      await prisma.repas.create({
        data: {
          nom: r.nom,
          description: r.description,
          prixPetit: 6.5,
          prixRegulier: 7.0,
          prixDeuxiemeService: 10.0,
        },
      });
    }
  }

  console.log('Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

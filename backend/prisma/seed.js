import { prisma } from "../lib/prisma.js";
import { seedTeams } from "../data/seedTeams.js";

await prisma.team.deleteMany();
for (const team of seedTeams) {
  await prisma.team.create({ data: team });
}
console.log(`Seeded ${seedTeams.length} teams.`);
await prisma.$disconnect();
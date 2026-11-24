import { prisma } from "../lib/prisma.js";
import { seedTeams } from "../data/seedTeams.js";

export async function resetDatabase() {
  await prisma.team.deleteMany(); // images cascade
  for (const team of seedTeams) {
    await prisma.team.create({ data: team });
  }
}
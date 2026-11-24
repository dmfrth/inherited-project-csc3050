// Sample records used to seed the database (dev) and reset it (tests).
export const seedTeams = [
  { id: 1, name: "Sample Robotics Team One",   number: 1, rookieYear: 1992 },
  { id: 2, name: "Sample Robotics Team Two",   number: 2, rookieYear: 1993 },
  { id: 3, name: "Sample Robotics Team Three", number: 3, rookieYear: 1994 }
].map((team) => ({
  ...team,
  description: "Sample team record. Replace this with verified FIRST Robotics Competition information.",
  history: "Historical information has not yet been researched and verified."
}));
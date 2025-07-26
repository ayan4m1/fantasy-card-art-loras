import papaparse from 'papaparse';
import { readFile, writeFile } from 'fs/promises';

const { parse } = papaparse;
const types = [
  'Beast',
  'Elf',
  'Cleric',
  'Zombie',
  'Elemental',
  'Spirit',
  'Soldier',
  'Warrior',
  'Wizard',
  'Human',
  'Goblin',
  'Orc'
];
const results = parse(await readFile('./data/cards.csv', 'utf-8'), {
  delimiter: '"',
  header: true
});

for (const type of types) {
  let output = '';

  for (const card of results.data) {
    if (
      card.isFunny ||
      card.isFullArt ||
      card.isOnlineOnly ||
      card.isOversized ||
      !card.setCode ||
      card.number.includes('★') ||
      output.includes(card.name) ||
      !card.subtypes.split(', ').some((cardType) => cardType === type)
    ) {
      continue;
    }

    output += `${card.name} (${card.setCode.toLowerCase()}) ${card.number}\n`;
  }

  await writeFile(`./lists/cards-${type.toLowerCase()}.txt`, output, 'utf-8');
}

import { join } from 'path';
import papaparse from 'papaparse';
import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { stringify as stringifyIni, parse as parseIni } from 'ini';

const downloadImages = async (type) => {
  const config = parseIni(await readFile('./downloader/config.ini', 'utf-8'));

  return new Promise((resolve, reject) => {
    config.SETTINGS['Only.Download.Scryfall'] = true;
    config.FILES['Card.List'] = `cards-${type}.txt`;
    config.FILES['Download.Folder'] = `downloaded/${type}`;

    writeFileSync('./downloader/config.ini', stringifyIni(config), 'utf-8');

    const cmd = spawn('poetry', ['run', 'python', 'main.py'], {
      cwd: join(import.meta.dirname, 'downloader')
    });

    cmd.stderr.on('data', (chunk) => console.error(chunk.toString()));
    cmd.stdout.on('data', (chunk) => {
      const data = chunk.toString();

      console.log(data);

      if (data.includes('Press enter') || data.includes('Full Github')) {
        cmd.stdin.write('\n');
      }
    });

    cmd.on('error', reject);
    cmd.on('exit', resolve);
  });
};

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

  await writeFile(
    `./downloader/cards-${type.toLowerCase()}.txt`,
    output,
    'utf-8'
  );
  await downloadImages(type.toLowerCase());
}

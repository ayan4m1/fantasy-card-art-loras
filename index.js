import papaparse from 'papaparse';
import { writeFileSync } from 'fs';
import { basename, join } from 'path';
import { spawn } from 'child_process';
import tf from '@tensorflow/tfjs-node';
import { globby, globbyStream } from 'globby';
import { default as Upscaler } from 'upscaler/node';
import { unlink, readFile, rename, writeFile } from 'fs/promises';
import { stringify as stringifyIni, parse as parseIni } from 'ini';
import imageSize from 'image-size';
import sharp from 'sharp';

sharp.cache(false);

const downloadImages = async (type) => {
  const config = parseIni(await readFile('./downloader/config.ini', 'utf-8'));

  return new Promise((resolve, reject) => {
    config.SETTINGS['Only.Download.Scryfall'] = false;
    config.SEARCH['Exclude.Fullart'] = true;
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
    cmd.on('close', resolve);
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
      card.isPromo ||
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

  const baseDir = `downloader/downloaded/${type.toLowerCase()}`;

  await Promise.all(
    [
      ...(await globby(`${baseDir}/mtgpics/**/*.jpg`)),
      ...(await globby(`${baseDir}/scryfall/**/*.jpg`))
    ].map((file) =>
      rename(
        file,
        `./downloader/downloaded/${type.toLowerCase()}/${basename(file)}`
      )
    )
  );

  const upscaler = new Upscaler.default();

  for await (const file of globbyStream(
    `downloader/downloaded/${type.toLowerCase()}/**/*.jpg`
  )) {
    console.log(`Analyzing ${basename(file, '.jpg')}`);

    const sourceBytes = await readFile(file);
    const { height, width } = imageSize(sourceBytes);

    if (height > width) {
      console.log('Skipping because aspect ratio is not landscape');
      await unlink(file);
      continue;
    }

    let destBuffer = new Uint8Array();

    try {
      let newHeight = height,
        newWidth = width;

      if (height < 600 || width < 600) {
        newHeight *= 2;
        newWidth *= 2;

        console.log(`Upscaling by 2x to ${newWidth}x${newHeight}`);

        const sourceImage = tf.node.decodeImage(sourceBytes, 3);
        const tensor = await upscaler.upscale(sourceImage);
        destBuffer = await tf.node.encodePng(tensor);
      }

      const maxWidth = 1200;

      if (newHeight > maxWidth || newWidth > maxWidth) {
        newHeight = Math.floor(maxWidth / (newWidth / newHeight));

        console.log(`Downscaling to 1200x${newHeight}`);

        if (!destBuffer.length) {
          destBuffer = sourceBytes;
        }

        destBuffer = await sharp(destBuffer)
          .resize(maxWidth, newHeight)
          .toBuffer();
      }

      if (destBuffer.length) {
        await writeFile(file, destBuffer);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

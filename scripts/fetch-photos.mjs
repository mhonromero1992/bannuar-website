/**
 * Downloads a licensed photograph of San Juan, La Union (Wikimedia Commons, CC BY-SA 4.0) into the
 * "hometown" photo slot and records its credit for the footer line. Run on a normal connection:
 *   npm run fetch:photos && npm run build
 * Wikimedia refused downloads from the machine this site was built on, so it has not been run yet.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const UA = 'BannuarWebsite/1.0 (https://github.com/mhonromero1992/bannuar-website)';
const PHOTO = {
  slot: 'hometown',
  file: 'Surfing_Capital_of_the_Northern_Philippines.jpg',
  title: 'Surfing Capital of the Northern Philippines',
  artist: 'Emman Asuncion Foronda',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  page: 'https://commons.wikimedia.org/wiki/File:Surfing_Capital_of_the_Northern_Philippines.jpg',
  url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Surfing_Capital_of_the_Northern_Philippines.jpg',
};

const res = await fetch(PHOTO.url, { headers: { 'User-Agent': UA } });
if (!res.ok) {
  console.error(`Download refused (${res.status}). Try again later or from another connection.`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
const dest = fileURLToPath(new URL(`../src/assets/photos/${PHOTO.slot}.jpg`, import.meta.url));
await sharp(buf).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);

const { slot, url, file, ...credit } = PHOTO;
await writeFile(fileURLToPath(new URL('../src/data/place-credits.json', import.meta.url)), JSON.stringify([credit], null, 2) + '\n');
console.log(`Saved ${PHOTO.title} to src/assets/photos/${slot}.jpg and its credit to src/data/place-credits.json`);

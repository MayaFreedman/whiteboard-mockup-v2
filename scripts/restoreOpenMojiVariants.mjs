/*
  restoreOpenMojiVariants.mjs
  ---------------------------------
  Targeted restore for skin tone and variant emoji PNGs using OpenMoji.

  What it does:
  - Scans src/utils/iconRegistry.ts for "skinToneVariants" arrays
  - Extracts all referenced /png-emojis/*.png filenames
  - Downloads each PNG from OpenMoji into public/png-emojis/

  Usage:
    node scripts/restoreOpenMojiVariants.mjs

  Notes:
  - Uses OpenMoji "color/618x" PNGs
  - Safe to re-run; existing files will be skipped by default
*/

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '..', 'src', 'utils', 'iconRegistry.ts');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'png-emojis');
const OPENMOJI_BASES = [
  'https://hfg-gmuend.github.io/openmoji/color/618x',
  'https://hfg-gmuend.github.io/openmoji/color/72x72',
  'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x'
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readRegistry(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractVariantFilenames(registryContent) {
  const results = new Set();
  const arrayRegex = /skinToneVariants\s*:\s*\[([\s\S]*?)\]/g; // non-greedy match across lines
  let match;
  while ((match = arrayRegex.exec(registryContent)) !== null) {
    const arrayBody = match[1];
    const fileRegex = /"\/png-emojis\/([A-Za-z0-9\-]+\.png)"/g;
    let f;
    while ((f = fileRegex.exec(arrayBody)) !== null) {
      results.add(f[1]);
    }
  }
  return Array.from(results).sort();
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close(() => fs.unlink(dest, () => {}));
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close(() => fs.unlink(dest, () => {}));
        reject(err);
      });
  });
}

async function run() {
  console.log('🔎 Reading icon registry:', REGISTRY_PATH);
  const content = readRegistry(REGISTRY_PATH);
  const filenames = extractVariantFilenames(content);

  if (filenames.length === 0) {
    console.log('ℹ️ No skinToneVariants found in registry. Nothing to download.');
    return;
  }

  console.log(`📋 Found ${filenames.length} skin tone/variant PNG references.`);
  ensureDir(TARGET_DIR);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  // Simple concurrency limiter
  const concurrency = 8;
  const queue = filenames.slice();

  async function worker() {
    while (queue.length) {
      const name = queue.shift();
      const targetPath = path.join(TARGET_DIR, name);

      if (fs.existsSync(targetPath)) {
        skipped++;
        continue;
      }

      let downloaded = false;
      for (const base of OPENMOJI_BASES) {
        const url = `${base}/${name}`;
        try {
          await download(url, targetPath);
          ok++;
          downloaded = true;
          console.log(`✅ Downloaded ${name} from ${base}`);
          break;
        } catch (e) {
          // try next base
        }
      }

      if (!downloaded) {
        failed++;
        console.warn(`⚠️ Failed ${name} from all sources`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log('——— Summary ———');
  console.log('✅ Downloaded:', ok);
  console.log('⏭️  Skipped (already present):', skipped);
  console.log('❌ Failed:', failed);
  console.log('📁 Output dir:', TARGET_DIR);
}

run().catch((e) => {
  console.error('❌ Restore failed:', e);
  process.exit(1);
});

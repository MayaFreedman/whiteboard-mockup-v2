/*
 Purge unused emoji assets
 - Removes unreferenced PNGs in public/png-emojis based on src/utils/iconRegistry.ts
 - Removes the unused OpenMoji SVG set under public/emojis/openmoji-svg-color (1)/ if present

 Usage:
   node scripts/purgeUnusedEmojis.js

 Notes:
 - This script is idempotent and safe to re-run.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.cwd();
const PNG_DIR = path.join(ROOT, 'public', 'png-emojis');
const SVG_DIR = path.join(ROOT, 'public', 'emojis', 'openmoji-svg-color (1)');
const REGISTRY = path.join(ROOT, 'src', 'utils', 'iconRegistry.ts');

function loadRegistryPngs() {
  const content = fs.readFileSync(REGISTRY, 'utf8');
  const regex = /path:\s*["']\/png-emojis\/([^"']+)["']/g;
  const used = new Set();
  let m;
  while ((m = regex.exec(content)) !== null) {
    used.add(m[1]);
  }
  return used;
}

function purgePngs() {
  if (!fs.existsSync(PNG_DIR)) return { removed: 0, kept: 0 };
  const used = loadRegistryPngs();
  const files = fs.readdirSync(PNG_DIR);
  let removed = 0;
  let kept = 0;

  for (const file of files) {
    const full = path.join(PNG_DIR, file);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    if (used.has(file)) {
      kept++;
      continue;
    }
    fs.unlinkSync(full);
    removed++;
  }
  return { removed, kept };
}

function removeOpenMojiSvgDir() {
  if (fs.existsSync(SVG_DIR)) {
    // Node 14+ supports recursive rm
    fs.rmSync(SVG_DIR, { recursive: true, force: true });
    return true;
  }
  return false;
}

function main() {
  console.log('🔎 Purging unused emoji assets...');
  const pngResult = purgePngs();
  const svgRemoved = removeOpenMojiSvgDir();

  console.log(`✅ PNGs kept: ${pngResult.kept}`);
  console.log(`🗑️ PNGs removed: ${pngResult.removed}`);
  if (svgRemoved) {
    console.log('🗑️ Removed unused OpenMoji SVG directory.');
  } else {
    console.log('ℹ️ OpenMoji SVG directory not present or already removed.');
  }
  console.log('Done.');
}

const invokedAsScript = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedAsScript) {
  main();
}

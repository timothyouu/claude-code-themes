import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildScene } from '../themes/clawd-scenarios/hooks/scene.mjs';

const sharpPath = process.argv.find(argument => argument.startsWith('--sharp='))?.slice(8);
if (!sharpPath) throw new Error('Supply --sharp=/absolute/path/to/an/existing/sharp/module. No packages are installed.');
const sharp = createRequire(import.meta.url)(sharpPath);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'assets/clawd-scenarios');
await fs.mkdir(destination, { recursive: true });
for (const [scene, appearance] of [['coffee', 'light'], ['skateboard', 'dark']]) {
  const source = buildScene(scene, appearance, false).replace('width="100%" height="100%"', 'width="1920" height="1080"');
  await sharp(Buffer.from(source)).png().toFile(path.join(destination, `${scene}-${appearance}.png`));
}
console.log('Exported two static scene previews from the shipped renderer.');

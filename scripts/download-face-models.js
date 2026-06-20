/**
 * Copies face-api model files from the @vladmandic/face-api npm package
 * (which ships with models) into the face-models/ directory.
 *
 * Run once:  node scripts/download-face-models.js
 */

const fs   = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'node_modules', '@vladmandic', 'face-api', 'model');
const dstDir = path.join(__dirname, '..', 'face-models');

if (!fs.existsSync(srcDir)) {
  console.error('❌  @vladmandic/face-api not installed. Run: npm install @vladmandic/face-api');
  process.exit(1);
}

if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

console.log(`\nCopying face-api models → ${dstDir}\n`);
for (const f of FILES) {
  const src = path.join(srcDir, f);
  const dst = path.join(dstDir, f);
  if (!fs.existsSync(src)) { console.error(`  ❌  Not found in package: ${f}`); continue; }
  fs.copyFileSync(src, dst);
  console.log(`  ✓  ${f}`);
}
console.log('\n✅  Done. Restart the NestJS server.\n');

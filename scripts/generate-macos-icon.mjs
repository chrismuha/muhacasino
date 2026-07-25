#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePng = path.join(root, 'build', 'icon.png');
const iconsetDir = path.join(root, 'build', 'icon.iconset');
const targetIcns = path.join(root, 'build', 'icon.icns');
const targetIco = path.join(root, 'build', 'icon.ico');
const tempIcns = getTempPathFor(targetIcns);
const tempIco = getTempPathFor(targetIco);
const icnsSourceStampPath = getSourceStampPath(targetIcns);
const icoSourceStampPath = getSourceStampPath(targetIco);

function getTempPathFor(targetPath) {
  const parsed = path.parse(targetPath);
  return path.join(parsed.dir, `${parsed.name}.tmp${parsed.ext}`);
}

function getSourceStampPath(targetPath) {
  return `${targetPath}.source.sha256`;
}

function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function replaceFileIfChanged(tempPath, targetPath) {
  const targetExists = fs.existsSync(targetPath);
  const fileChanged = !targetExists || !fs.readFileSync(targetPath).equals(fs.readFileSync(tempPath));

  if (fileChanged) {
    fs.renameSync(tempPath, targetPath);
    console.log(`Updated ${targetPath}`);
    return;
  }

  fs.rmSync(tempPath, { force: true });
  console.log(`No icon content change detected; kept existing ${targetPath}`);
}

function shouldSkipGeneration(targetPath, sourceStampPath, sourceHash) {
  if (!fs.existsSync(targetPath) || !fs.existsSync(sourceStampPath)) {
    return false;
  }

  const previousSourceHash = fs.readFileSync(sourceStampPath, 'utf8').trim();
  if (previousSourceHash !== sourceHash) {
    return false;
  }

  console.log(`No source icon change detected; kept existing ${targetPath}`);
  return true;
}

function generateIco(sourceHash) {
  if (shouldSkipGeneration(targetIco, icoSourceStampPath, sourceHash)) {
    return;
  }

  try {
    execFileSync(
      'python3',
      [
        '-c',
        [
          'from PIL import Image',
          'from pathlib import Path',
          `src = Path(${JSON.stringify(sourcePng)})`,
          `tmp = Path(${JSON.stringify(tempIco)})`,
          'img = Image.open(src).convert("RGBA")',
          'img.save(tmp, format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])',
        ].join('\n'),
      ],
      { stdio: 'ignore' },
    );

    replaceFileIfChanged(tempIco, targetIco);
    fs.writeFileSync(icoSourceStampPath, `${sourceHash}\n`, 'utf8');
  } catch (error) {
    fs.rmSync(tempIco, { force: true });
    if (!fs.existsSync(targetIco)) {
      throw error;
    }
    console.warn(`Could not regenerate ${targetIco}; kept existing icon.ico`);
  }
}

function generateIcns(sourceHash) {
  if (process.platform !== 'darwin') {
    console.log('Skipping macOS .icns generation (non-darwin host).');
    return;
  }

  if (shouldSkipGeneration(targetIcns, icnsSourceStampPath, sourceHash)) {
    return;
  }

  const sizes = [16, 32, 128, 256, 512];

  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  try {
    for (const size of sizes) {
      const oneX = path.join(iconsetDir, `icon_${size}x${size}.png`);
      const twoX = path.join(iconsetDir, `icon_${size}x${size}@2x.png`);

      execFileSync('sips', ['-z', String(size), String(size), sourcePng, '--out', oneX], { stdio: 'ignore' });
      execFileSync('sips', ['-z', String(size * 2), String(size * 2), sourcePng, '--out', twoX], { stdio: 'ignore' });
    }

    execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', tempIcns], { stdio: 'ignore' });
    replaceFileIfChanged(tempIcns, targetIcns);
    fs.writeFileSync(icnsSourceStampPath, `${sourceHash}\n`, 'utf8');
  } finally {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  }
}

if (!fs.existsSync(sourcePng)) {
  console.error(`Missing source icon: ${sourcePng}`);
  process.exit(1);
}

const sourceHash = hashFile(sourcePng);
generateIco(sourceHash);
generateIcns(sourceHash);

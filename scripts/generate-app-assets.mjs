import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'assets/logo.png');
const background = '#06080E';
const capacitorAssets = path.join(root, 'node_modules/@capacitor/assets/bin/capacitor-assets');

execFileSync(process.execPath, [
  capacitorAssets,
  'generate',
  '--android',
  '--ios',
  '--assetPath', 'assets',
  '--iconBackgroundColor', background,
  '--iconBackgroundColorDark', background,
  '--splashBackgroundColor', background,
  '--splashBackgroundColorDark', background,
  '--logoSplashScale', '0.3',
], { cwd: root, stdio: 'inherit' });

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/app_icon_foreground" />
</adaptive-icon>
`;

await Promise.all(['ic_launcher.xml', 'ic_launcher_round.xml'].map(function writeAdaptiveIcon(file) {
  return writeFile(path.join(root, 'android/app/src/main/res/mipmap-anydpi-v26', file), adaptiveIcon);
}));

await mkdir(path.join(root, 'public/icons'), { recursive: true });
await mkdir(path.join(root, 'public/brand'), { recursive: true });

const symbol = await sharp(source).resize(512, 512).png().toBuffer();
await writeFile(path.join(root, 'public/brand/vitalstep-symbol.png'), symbol);

const socialCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${background}" />
  <image href="data:image/png;base64,${symbol.toString('base64')}" x="72" y="95" width="440" height="440" />
  <text x="540" y="300" fill="#F2F6F7" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="700" letter-spacing="-3">VitalStep</text>
  <text x="544" y="360" fill="#A0ADBF" font-family="Arial, Helvetica, sans-serif" font-size="25">Plataforma biométrica para tênis inteligente</text>
</svg>`;

await sharp(Buffer.from(socialCard)).png().toFile(path.join(root, 'public/brand/vitalstep-social.png'));

async function writeIcon({ file, size, padding = 0, round = false }) {
  let image = sharp(source).resize(size - padding * 2, size - padding * 2);

  if (padding > 0) {
    image = image.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    });
  }

  image = image.flatten({ background });

  if (round) {
    const circle = `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white" /></svg>`;
    image = image.ensureAlpha().composite([{ input: Buffer.from(circle), blend: 'dest-in' }]);
  }

  await image.png().toFile(path.join(root, file));
}

const roundIcons = [
  ['ldpi', 36],
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
].map(function roundIcon([density, size]) {
  return {
    file: `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`,
    size,
    padding: Math.ceil(size * 0.06),
    round: true,
  };
});

await Promise.all([
  { file: 'public/favicon-32x32.png', size: 32 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/icons/icon-maskable-512.png', size: 512, padding: 68 },
  ...roundIcons,
].map(writeIcon));

console.log('Ícones web gerados em public/.');

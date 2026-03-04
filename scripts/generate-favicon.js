const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'MonoxideLogo.png');
const publicDir = path.join(__dirname, '..', 'public');

async function generate() {
  // favicon.ico (32x32)
  await sharp(inputPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // apple-touch-icon (180x180)
  await sharp(inputPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon-16x16
  await sharp(inputPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  // favicon-32x32
  await sharp(inputPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  console.log('Favicons generated successfully!');
}

generate().catch(console.error);

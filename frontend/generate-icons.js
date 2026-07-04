// generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Simple SVG icon — blue pill/medicine symbol
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <text x="256" y="340" font-size="300" text-anchor="middle"
        font-family="Arial" fill="#0ea5e9">💊</text>
  <text x="256" y="460" font-size="72" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="800" fill="white">Medi</text>
</svg>`;

const svgBuffer = Buffer.from(svg);

Promise.all(
  sizes.map(size =>
    sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`))
      .then(() => console.log(`✅ icon-${size}.png`))
  )
).then(() => console.log('All icons generated!'));
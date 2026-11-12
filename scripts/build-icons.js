import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const LOGO_FILE = "src/assets/logo.svg";
const logo = readFileSync(LOGO_FILE, "utf8");

const nestedLogo = (x, y, size) =>
  logo.replace(
    "<svg ",
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" `,
  );

const sunStripes = [0, 1, 2, 3, 4]
  .map(
    (i) =>
      `<rect x="0" y="${505 + i * 34}" width="1320" height="${6 + i * 3}" fill="#2a0f3d"/>`,
  )
  .join("");

const banner = `
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="840" viewBox="0 0 1320 840">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#120822"/>
      <stop offset="0.6" stop-color="#2a0f3d"/>
      <stop offset="1" stop-color="#5a1a4f"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffa63d"/>
      <stop offset="0.6" stop-color="#ff5f6d"/>
      <stop offset="1" stop-color="#ff2d95"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff2d95"/>
      <stop offset="1" stop-color="#ffa63d"/>
    </linearGradient>
    <clipPath id="sunClip"><rect x="0" y="0" width="1320" height="660"/></clipPath>
    <clipPath id="stripeClip"><circle cx="1040" cy="600" r="230"/></clipPath>
  </defs>
  <rect width="1320" height="840" fill="url(#sky)"/>
  <g clip-path="url(#sunClip)">
    <circle cx="1040" cy="600" r="230" fill="url(#sun)" opacity="0.9"/>
    <g clip-path="url(#stripeClip)">${sunStripes}</g>
  </g>
  <rect x="0" y="660" width="1320" height="180" fill="#1a0b2e"/>
  <line x1="0" y1="660" x2="1320" y2="660" stroke="#2de2e6" stroke-width="4"/>
  ${nestedLogo(90, 110, 260)}
  <text x="90" y="520" font-family="Segoe UI, Arial, sans-serif" font-weight="900" font-size="132" fill="url(#title)">GTA 6</text>
  <text x="90" y="620" font-family="Segoe UI, Arial, sans-serif" font-weight="900" font-size="92" fill="#ffffff">SPOILER BLOCKER</text>
  <text x="94" y="760" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="44" letter-spacing="8" fill="#2de2e6">GO IN BLIND</text>
</svg>`;

mkdirSync("public/icons", { recursive: true });
mkdirSync("static/images", { recursive: true });
mkdirSync("static/store", { recursive: true });

for (const size of [16, 32, 48, 128]) {
  await sharp(LOGO_FILE, { density: 600 })
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon${size}.png`);
}

await sharp(Buffer.from(banner)).png().toFile("static/images/banner.png");
await sharp(Buffer.from(banner))
  .resize(440, 280)
  .png()
  .toFile("static/store/promo-tile-440x280.png");
await sharp(Buffer.from(banner))
  .resize(1400, 560, { fit: "cover" })
  .png()
  .toFile("static/store/marquee-1400x560.png");

console.log("Icons, banner and store images generated.");

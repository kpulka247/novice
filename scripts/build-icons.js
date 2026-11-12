import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const LOGO_FILE = "src/assets/logo.svg";
const logo = readFileSync(LOGO_FILE, "utf8");
const FONT = "Segoe UI, Inter, Arial, sans-serif";

const nestedLogo = (x, y, size) =>
  logo.replace(
    "<svg ",
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" `,
  );

const sunGaps = [0, 1, 2, 3]
  .map(
    (i) =>
      `<rect x="840" y="${500 + i * 36}" width="420" height="${4 + i * 3}" fill="#0d0b14"/>`,
  )
  .join("");

const banner = `
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="840" viewBox="0 0 1320 840">
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffa24c"/>
      <stop offset="1" stop-color="#ff3d9a"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff3d9a"/>
      <stop offset="1" stop-color="#ffa24c"/>
    </linearGradient>
    <clipPath id="horizon"><rect width="1320" height="640"/></clipPath>
  </defs>
  <rect width="1320" height="840" fill="#0d0b14"/>
  <g clip-path="url(#horizon)">
    <circle cx="1050" cy="640" r="190" fill="url(#sun)"/>
    ${sunGaps}
  </g>
  <rect x="0" y="639" width="1320" height="2" fill="url(#line)"/>
  ${nestedLogo(110, 150, 140)}
  <text x="106" y="420" font-family="${FONT}" font-weight="800" font-size="92" letter-spacing="-2" fill="#f5f3f8">GTA 6</text>
  <text x="106" y="520" font-family="${FONT}" font-weight="800" font-size="92" letter-spacing="-2" fill="#f5f3f8">Spoiler Blocker</text>
  <text x="110" y="745" font-family="${FONT}" font-weight="600" font-size="40" fill="#a39cb3">Go in blind.</text>
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

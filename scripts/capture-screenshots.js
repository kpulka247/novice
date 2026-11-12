import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const EXTENSION = path.resolve("dist/gta6spoilerblocker-chrome");
const README_DIR = "static/images";
const STORE_DIR = "static/store";
const SEARCH =
  "https://www.youtube.com/results?search_query=rockstar+games+trailer";
const MIXED =
  "https://www.youtube.com/results?search_query=new+game+trailers+2026";
const GTA6_PAGE = "https://www.youtube.com/results?search_query=gta+6+trailer";
const WIDTH = 1280;
const HEIGHT = 800;
const FONT = "Segoe UI, Inter, Arial, sans-serif";

mkdirSync(README_DIR, { recursive: true });
mkdirSync(STORE_DIR, { recursive: true });

async function launch(lang) {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    viewport: { width: WIDTH, height: HEIGHT },
    locale: lang,
    args: [
      `--lang=${lang}`,
      `--disable-extensions-except=${EXTENSION}`,
      `--load-extension=${EXTENSION}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  return { context, worker, id: new URL(worker.url()).host };
}

async function openYouTube(context, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  for (let attempt = 0; attempt < 12; attempt++) {
    const reject = page.locator("button", { hasText: "Reject all" }).first();
    if (await reject.isVisible().catch(() => false)) {
      await reject.click({ force: true }).catch(() => {});
      await page.waitForLoadState("domcontentloaded");
      break;
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(6000);
  return page;
}

async function popupShot({ context, id }, tabId) {
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 300 });
  if (tabId !== undefined) {
    await popup.addInitScript((target) => {
      const query = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = (q) =>
        q.active
          ? query({}).then((tabs) => tabs.filter((tab) => tab.id === target))
          : query(q);
    }, tabId);
  }
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(800);
  return popup.screenshot({ fullPage: true });
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function rounded(image, width, height, radius) {
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
  return sharp(image)
    .resize(width, height)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function frame(file, title, shots) {
  const header = Buffer.from(
    `<svg width="${WIDTH}" height="120" xmlns="http://www.w3.org/2000/svg">
      <text x="${WIDTH / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="800" fill="#f5f3f8">${escape(title)}</text>
    </svg>`,
  );
  const gap = 40;
  const boxHeight = HEIGHT - 120 - 48;
  const metas = await Promise.all(shots.map((shot) => sharp(shot).metadata()));
  const scale = Math.min(
    boxHeight / Math.max(...metas.map((m) => m.height)),
    (WIDTH - 96 - gap * (shots.length - 1)) /
      metas.reduce((sum, m) => sum + m.width, 0),
  );
  const sizes = metas.map((m) => ({
    width: Math.round(m.width * scale),
    height: Math.round(m.height * scale),
  }));
  const totalWidth =
    sizes.reduce((sum, s) => sum + s.width, 0) + gap * (shots.length - 1);
  let left = Math.round((WIDTH - totalWidth) / 2);
  const layers = [{ input: header, top: 0, left: 0 }];
  for (const [index, shot] of shots.entries()) {
    const { width, height } = sizes[index];
    layers.push({
      input: await rounded(shot, width, height, 14),
      top:
        120 +
        Math.round((boxHeight - Math.max(...sizes.map((s) => s.height))) / 2),
      left,
    });
    left += width + gap;
  }
  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#0d0b14",
    },
  })
    .composite(layers)
    .png()
    .toFile(`${STORE_DIR}/${file}`);
}

const english = await launch("en-US");
const setSettings = (patch) =>
  english.worker.evaluate((p) => chrome.storage.local.set(p), patch);

await setSettings({ enabled: false });
const off = await openYouTube(english.context, SEARCH);
const youtubeOff = await off.screenshot();
await off.close();

await setSettings({ enabled: true, style: "blur" });
const blurPage = await openYouTube(english.context, SEARCH);
const youtubeBlur = await blurPage.screenshot();

await setSettings({ style: "hide" });
const hidePage = await openYouTube(english.context, MIXED);
const youtubeHide = await hidePage.screenshot();
await hidePage.close();
await setSettings({ style: "blur" });

const [youtubeTab] = await english.worker.evaluate(() =>
  chrome.tabs.query({ url: "https://www.youtube.com/*" }),
);
const popupEnglish = await popupShot(english, youtubeTab.id);

const shieldPage = await openYouTube(english.context, GTA6_PAGE);
const shield = await shieldPage.screenshot();
await english.context.close();

const popups = [popupEnglish];
for (const lang of ["ja", "ar"]) {
  const browser = await launch(lang);
  popups.push(await popupShot(browser));
  await browser.context.close();
}

await sharp(youtubeOff).toFile(`${README_DIR}/screenshot-youtube-off.png`);
await sharp(youtubeBlur).toFile(`${README_DIR}/screenshot-youtube-on.png`);
await sharp(youtubeHide).toFile(`${README_DIR}/screenshot-youtube-hide.png`);
await sharp(shield).toFile(`${README_DIR}/screenshot-shield.png`);
await sharp(popupEnglish).toFile(`${README_DIR}/screenshot-popup.png`);

await frame("screenshot-1-blur.png", "Spoilers blur in place. Click to show.", [
  youtubeBlur,
]);
await frame("screenshot-2-cover.png", "Pages about GTA VI get covered.", [
  shield,
]);
await frame("screenshot-3-remove.png", "Or remove them from the page.", [
  youtubeHide,
]);
await frame("screenshot-4-before.png", "Without it, GTA VI is everywhere.", [
  youtubeOff,
]);
await frame(
  "screenshot-5-languages.png",
  "Simple controls in 20 languages.",
  popups,
);

console.log("Screenshots written to static/images and static/store.");

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
const WEB = [
  {
    name: "YouTube",
    url: SEARCH,
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Grand_Theft_Auto",
  },
  {
    name: "Steam",
    url: "https://store.steampowered.com/search/?term=grand+theft+auto",
  },
  {
    name: "Twitch",
    url: "https://www.twitch.tv/directory/category/grand-theft-auto-v",
    crop: { left: 250, top: 50, width: 680, height: 425 },
  },
];
const CONSENT_BUTTONS = [
  "Reject all",
  "Reject All",
  "Reject",
  "Odrzuć wszystko",
];
const TILE = { width: 640, height: 400, gap: 20 };
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
    const reject = page
      .locator("button", { hasText: /^(Reject all|Alle ablehnen|Rechazar todo)$/ })
      .first();
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

async function openSite(context, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  for (let second = 0; second < 10; second++) {
    await page.waitForTimeout(1000);
    for (const text of CONSENT_BUTTONS) {
      const button = page.getByText(text, { exact: true }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true }).catch(() => {});
      }
    }
  }
  await page.waitForTimeout(3000);
  return page;
}

async function webGrid(captures) {
  const columns = 2;
  const rows = Math.ceil(captures.length / columns);
  const width = columns * TILE.width + (columns + 1) * TILE.gap;
  const height = rows * TILE.height + (rows + 1) * TILE.gap;
  const layers = [];
  for (const [index, { name, image, crop }] of captures.entries()) {
    const source = crop ? sharp(image).extract(crop) : sharp(image);
    const tile = await rounded(
      await source.png().toBuffer(),
      TILE.width,
      TILE.height,
      12,
    );
    const left = TILE.gap + (index % columns) * (TILE.width + TILE.gap);
    const top =
      TILE.gap + Math.floor(index / columns) * (TILE.height + TILE.gap);
    const labelWidth = 24 + name.length * 11;
    const label = Buffer.from(
      `<svg width="${labelWidth}" height="34" xmlns="http://www.w3.org/2000/svg">
        <rect width="${labelWidth}" height="34" rx="17" fill="#0d0b14" fill-opacity="0.85"/>
        <text x="${labelWidth / 2}" y="23" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="#f5f3f8">${escape(name)}</text>
      </svg>`,
    );
    layers.push({ input: tile, left, top });
    layers.push({
      input: label,
      left: left + 14,
      top: top + TILE.height - 48,
    });
  }
  return sharp({
    create: { width, height, channels: 4, background: "#0d0b14" },
  })
    .composite(layers)
    .png()
    .toBuffer();
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

await setSettings({ enabled: true, style: "blur" });
const blurPage = await openYouTube(english.context, SEARCH);
const youtubeBlur = await blurPage.screenshot();

const web = [{ ...WEB[0], image: youtubeBlur }];
for (const site of WEB.slice(1)) {
  const page = await openSite(english.context, site.url);
  web.push({ ...site, image: await page.screenshot() });
  await page.close();
}
const acrossTheWeb = await webGrid(web);

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
for (const lang of ["de", "es"]) {
  const browser = await launch(lang);
  await openYouTube(browser.context, SEARCH);
  const [tab] = await browser.worker.evaluate(() =>
    chrome.tabs.query({ url: "https://www.youtube.com/*" }),
  );
  popups.push(await popupShot(browser, tab.id));
  await browser.context.close();
}

await sharp(acrossTheWeb).toFile(`${README_DIR}/across-the-web.png`);
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
await frame("screenshot-4-everywhere.png", "Works on every site you visit.", [
  acrossTheWeb,
]);
await frame(
  "screenshot-5-languages.png",
  "Simple controls in 20 languages.",
  popups,
);

console.log("Screenshots written to static/images and static/store.");

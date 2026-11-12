import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(here, "../../dist/gta6spoilerblocker-chrome");

let server;
let base;
let context;
let extensionId;

before(async () => {
  server = http.createServer(async (req, res) => {
    const name = req.url.startsWith("/feed") ? "feed.html" : "article.html";
    res.setHeader("content-type", "text/html");
    res.end(await readFile(path.join(here, "fixtures", name)));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });
  const [worker] = context.serviceWorkers().length
    ? context.serviceWorkers()
    : [await context.waitForEvent("serviceworker")];
  extensionId = new URL(worker.url()).host;
});

after(async () => {
  await context?.close();
  server?.close();
});

const isHidden = (page, id) =>
  page.$eval(
    `#${id}`,
    (el) => getComputedStyle(el).display === "none" || !el.offsetParent,
  );

async function openFeed() {
  const page = await context.newPage();
  await page.goto(`${base}/feed`);
  await page.waitForSelector("#late", { state: "attached" });
  return page;
}

test("hides GTA VI units and leaves everything else", async () => {
  const page = await openFeed();
  for (const id of [
    "trailer",
    "split",
    "image",
    "link",
    "late",
    "mention",
    "card",
  ]) {
    assert.equal(await isHidden(page, id), true, `${id} should be hidden`);
  }
  for (const id of ["pasta", "zelda", "gta5", "other", "article", "editor"]) {
    assert.equal(await isHidden(page, id), false, `${id} should stay visible`);
  }
  await page.close();
});

test("covers a page whose title is about GTA VI and hides the page body", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/1`);
  await page.waitForSelector("gta6sb-shield", { state: "attached" });
  assert.equal(await page.title(), "Spoiler blocked");
  assert.equal(
    await page.$eval("body", (b) => getComputedStyle(b).opacity),
    "0",
  );
  await page.close();
});

test("covers a page whose URL is about GTA VI before it renders", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/gta-6-leaks`, { waitUntil: "commit" });
  await page.waitForSelector("gta6sb-shield", { state: "attached" });
  await page.close();
});

test("show anyway reveals the covered page", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/2`);
  await page.locator("gta6sb-shield").waitFor({ state: "attached" });
  const box = await page.locator("gta6sb-shield").boundingBox();
  await page.mouse.click(box.width / 2, box.height / 2 + 105);
  await page.waitForSelector("gta6sb-shield", { state: "detached" });
  assert.equal(await page.title(), "GTA 6 ending explained");
  await page.close();
});

test("popup switches turn blocking off globally and per site", async () => {
  const feed = await openFeed();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await popup.click("label.row:has(#enabled)");
  await feed.waitForFunction(
    () => !document.querySelector("[data-gta6sb-hidden]"),
  );
  assert.equal(await isHidden(feed, "trailer"), false);

  await popup.click("label.row:has(#enabled)");
  await feed.waitForSelector("#trailer[data-gta6sb-hidden]", {
    state: "attached",
  });

  await popup.evaluate(
    (host) => chrome.storage.local.set({ allowedSites: [host] }),
    "127.0.0.1",
  );
  await feed.waitForFunction(
    () => !document.querySelector("[data-gta6sb-hidden]"),
  );
  await popup.evaluate(() => chrome.storage.local.set({ allowedSites: [] }));
  await feed.waitForSelector("#trailer[data-gta6sb-hidden]", {
    state: "attached",
  });

  await popup.close();
  await feed.close();
});

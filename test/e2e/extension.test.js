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
let worker;
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
    locale: "en-US",
    args: [
      "--lang=en-US",
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
    ],
  });
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  extensionId = new URL(worker.url()).host;
  await context.route("https://www.facebook.com/**", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile(path.join(here, "fixtures", "facebook.html")),
    }),
  );
});

after(async () => {
  await context?.close();
  server?.close();
});

const setSettings = (patch) =>
  worker.evaluate((p) => chrome.storage.local.set(p), patch);

const levelOf = (page, id) =>
  page.$eval(`#${id}`, (el) =>
    el.closest("[data-gta6sb]")?.getAttribute("data-gta6sb-level"),
  );

const stateOf = (page, id) =>
  page.$eval(`#${id}`, (el) => {
    const unit = el.closest("[data-gta6sb]");
    return unit?.getAttribute("data-gta6sb") ?? "visible";
  });

async function openFeed() {
  const page = await context.newPage();
  await page.goto(`${base}/feed`);
  await page.waitForSelector("#late[data-gta6sb]", { state: "attached" });
  return page;
}

test("blurs GTA VI units and leaves everything else", async () => {
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
    assert.equal(await stateOf(page, id), "blur", `${id} should be blurred`);
  }
  for (const id of [
    "pasta",
    "zelda",
    "other",
    "article",
    "editor",
    "fb-cats",
  ]) {
    assert.equal(await stateOf(page, id), "visible", `${id} should stay clear`);
  }
  assert.equal(
    await page.$eval("#trailer", (el) => el.getAttribute("data-gta6sb-hint")),
    "GTA VI · Show",
  );
  await page.close();
});

test("tags say what was found and slide open on hover", async () => {
  const page = await openFeed();
  assert.equal(await levelOf(page, "trailer"), "gta6");
  assert.equal(await levelOf(page, "fb-helicopters"), "franchise");

  const chip = (id) =>
    page.$eval(`#${id}`, (el) => {
      const after = getComputedStyle(el, "::after");
      return {
        size: el.getAttribute("data-gta6sb-size"),
        content: after.content,
        width: parseFloat(after.width),
      };
    });
  const vars = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      tag: parseFloat(root.getPropertyValue("--gta6sb-chip-gta6")),
      hint: parseFloat(root.getPropertyValue("--gta6sb-chip-gta6-hint")),
    };
  });

  const small = await chip("trailer");
  assert.equal(small.size, "s", "one line of text gets a dot");
  assert.equal(small.content, '""');

  const card = await chip("card");
  assert.equal(card.size, "m");
  assert.equal(card.content, '"GTA VI · Show"');
  assert.ok(vars.tag > 0 && vars.hint > vars.tag);
  assert.equal(card.width, vars.tag, "only GTA VI is visible at rest");

  await page.hover("#card");
  await page.waitForTimeout(80);
  const midway = (await chip("card")).width;
  assert.ok(midway > vars.tag && midway < vars.hint, `slides: ${midway}`);
  await page.waitForTimeout(500);
  assert.equal((await chip("card")).width, vars.hint, "Show is fully visible");
  await page.close();
});

test("remove mode takes spoilers out of the page", async () => {
  const page = await openFeed();
  await setSettings({ style: "hide" });
  await page.waitForSelector("#trailer[data-gta6sb='hide']", {
    state: "attached",
  });
  assert.equal(await page.isVisible("#trailer"), false);
  assert.equal(await page.isVisible("#pasta"), true);
  await setSettings({ style: "blur" });
  await page.waitForSelector("#trailer[data-gta6sb='blur']", {
    state: "attached",
  });
  await page.close();
});

test("facebook posts are expanded so text behind See more is checked", async () => {
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/");
  await page.waitForSelector("#logitech[data-gta6sb-level='gta6']", {
    state: "attached",
  });
  assert.equal(await stateOf(page, "logitech"), "blur");
  assert.equal(await stateOf(page, "cats"), "visible");
  await page.waitForTimeout(1500);
  assert.equal(
    await page.evaluate(() => window.toggles),
    2,
    "each post is expanded once and never collapsed again",
  );
  assert.match(await page.textContent("#cats"), /opens every door/);
  await page.close();
});

test("strict mode catches posts that only name the franchise", async () => {
  const page = await openFeed();
  for (const id of ["fb-teaser", "fb-helicopters", "fb-weapons", "gta5"]) {
    assert.equal(await stateOf(page, id), "blur", `${id} should be blurred`);
  }

  await setSettings({ strict: false });
  await page.waitForFunction(
    () => !document.querySelector("#fb-helicopters[data-gta6sb]"),
  );
  assert.equal(await stateOf(page, "gta5"), "visible");
  assert.equal(await stateOf(page, "trailer"), "blur");
  await setSettings({ strict: true });
  await page.close();
});

test("clicking a blurred unit reveals it without following its link", async () => {
  const page = await openFeed();
  await page.click("#link");
  assert.equal(await stateOf(page, "link"), "revealed");
  assert.equal(new URL(page.url()).pathname, "/feed");

  await page.click("#fb-teaser");
  await page.$eval("#see-more", (el) => {
    el.textContent = "Lucia Caminos returns in GTA 6";
  });
  await page.waitForTimeout(100);
  assert.equal(await stateOf(page, "fb-teaser"), "revealed");
  await page.close();
});

test("covers a page whose title is about GTA VI with a see-through blur", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/1`);
  await page.waitForSelector("gta6sb-shield", { state: "attached" });
  assert.equal(await page.title(), "Spoiler ahead");
  assert.equal(
    await page.$eval("body", (b) => getComputedStyle(b).opacity),
    "1",
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
  await page.waitForSelector("gta6sb-shield", { state: "attached" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForSelector("gta6sb-shield", { state: "detached" });
  assert.equal(await page.title(), "GTA 6 ending explained");
  await page.close();
});

test("popup switches turn blurring off globally and per site", async () => {
  const feed = await openFeed();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  assert.equal(await popup.textContent("h1"), "GTA 6 Spoiler Blocker");

  await popup.click("label.row:has(#enabled)");
  await feed.waitForFunction(
    () => !document.querySelector("[data-gta6sb='blur']"),
  );
  await popup.click("label.row:has(#enabled)");
  await feed.waitForSelector("#trailer[data-gta6sb='blur']", {
    state: "attached",
  });

  await setSettings({ allowedSites: ["127.0.0.1"] });
  await feed.waitForFunction(
    () => !document.querySelector("[data-gta6sb='blur']"),
  );
  await setSettings({ allowedSites: [] });
  await feed.waitForSelector("#trailer[data-gta6sb='blur']", {
    state: "attached",
  });

  await popup.close();
  await feed.close();
});

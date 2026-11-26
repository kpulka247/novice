import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(here, "../../dist/novice-chrome");

let server;
let base;
let context;
let worker;
let extensionId;

const FIXTURES = {
  "/feed": "feed.html",
  "/forum": "forum.html",
  "/spa": "spa.html",
  "/table": "table.html",
  "/embed": "embed.html",
  "/player": "player.html",
};

before(async () => {
  server = http.createServer(async (req, res) => {
    const route = Object.keys(FIXTURES).find((prefix) =>
      req.url.startsWith(prefix),
    );
    const name = FIXTURES[route] ?? "article.html";
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
  await context.route("https://www.youtube.com/embed/**", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile(path.join(here, "fixtures", "youtube-embed.html")),
    }),
  );
  await context.route("https://www.youtube.com/shorts/**", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile(path.join(here, "fixtures", "shorts.html")),
    }),
  );
  await context.route("https://kick.com/**", async (route) =>
    route.fulfill({
      contentType: "text/html",
      body: await readFile(path.join(here, "fixtures", "kick.html")),
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
    el.closest("[data-novice]")?.getAttribute("data-novice-level"),
  );

const stateOf = (page, id) =>
  page.$eval(`#${id}`, (el) => {
    const unit = el.closest("[data-novice]");
    return unit?.getAttribute("data-novice") ?? "visible";
  });

async function openFeed() {
  const page = await context.newPage();
  await page.goto(`${base}/feed`);
  await page.waitForSelector("#late[data-novice]", { state: "attached" });
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
    await page.$eval("#trailer", (el) => el.getAttribute("data-novice-tag")),
    "GTA VI",
  );
  await page.close();
});

test("a blurred table row keeps the table's columns and shows its tag", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/table`);
  await page.waitForSelector("#spoiler[data-novice='blur']", {
    state: "attached",
  });
  const widths = (id) =>
    page.$eval(`#${id}`, (row) =>
      [...row.cells].map((cell) => cell.getBoundingClientRect().width),
    );
  assert.deepEqual(await widths("plain"), [0, 200, 300, 100]);
  assert.deepEqual(await widths("spoiler"), [0, 200, 300, 100]);
  const chip = await page.$eval("#spoiler-name", (cell) => ({
    host: cell.hasAttribute("data-novice-chip"),
    tag: getComputedStyle(cell, "::before").content,
    blur: getComputedStyle(cell).filter,
  }));
  assert.deepEqual(chip, { host: true, tag: '"GTA VI"', blur: "none" });
  assert.equal(
    await page.$eval(
      "#spoiler",
      (row) => getComputedStyle(row, "::before").content,
    ),
    "none",
  );
  await page.click("#spoiler");
  await page.waitForSelector("#spoiler[data-novice='revealed']", {
    state: "attached",
  });
  const leftovers = await page.$eval("#spoiler-name", (cell) =>
    cell
      .getAttributeNames()
      .filter((a) => a.startsWith("data-novice") || a === "style"),
  );
  assert.deepEqual(leftovers, []);
  await page.close();
});

test("tags say what was found and slide Show open on hover", async () => {
  const page = await openFeed();
  assert.equal(await levelOf(page, "trailer"), "gta6");
  assert.equal(await levelOf(page, "fb-helicopters"), "franchise");

  const chip = (id) =>
    page.$eval(`#${id}`, (el) => {
      const tag = getComputedStyle(el, "::before");
      const show = getComputedStyle(el, "::after");
      return {
        size: el.getAttribute("data-novice-size"),
        tag: tag.content,
        tagWidth: parseFloat(tag.width),
        icon: tag.backgroundImage.includes("M3 3l18 18") ? "eye-off" : "eye",
        show: show.content,
        showWidth: parseFloat(show.width),
      };
    });
  const vars = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      tag: parseFloat(root.getPropertyValue("--novice-chip-gta6")),
      show: parseFloat(root.getPropertyValue("--novice-chip-show")),
    };
  });

  const small = await chip("trailer");
  assert.equal(small.size, "s", "one line of text gets an icon only");
  assert.equal(small.tag, '""');
  assert.equal(small.icon, "eye-off");

  const card = await chip("card");
  assert.equal(card.size, "m");
  assert.equal(card.tag, '"GTA VI"');
  assert.equal(card.show, '"Show"');
  assert.equal(card.icon, "eye-off");
  assert.equal(card.tagWidth, vars.tag);
  assert.equal(card.showWidth, 0, "Show is hidden at rest");

  await page.hover("#card");
  await page.waitForTimeout(80);
  const midway = (await chip("card")).showWidth;
  assert.ok(midway > 0 && midway < vars.show, `slides: ${midway}`);
  await page.waitForTimeout(500);
  const open = await chip("card");
  assert.equal(open.showWidth, vars.show, "Show is fully visible");
  assert.equal(open.icon, "eye", "the icon opens on hover");
  assert.equal(open.tag, '"“Grand Theft Auto VI”"', "hover names the match");
  assert.ok(open.tagWidth > card.tagWidth, "the tag grows to fit the match");
  await page.close();
});

test("a custom keyword blurs like GTA VI and shows itself on hover", async () => {
  const page = await openFeed();
  assert.equal(await stateOf(page, "pasta"), "visible");
  await setSettings({ keywords: ["carbonara"] });
  await page.waitForSelector("#pasta[data-novice='blur']", {
    state: "attached",
  });
  assert.equal(await levelOf(page, "pasta"), "gta6");
  assert.equal(
    await page.$eval("#pasta", (el) => el.getAttribute("data-novice-term")),
    "“carbonara”",
  );
  await setSettings({ keywords: [] });
  await page.waitForFunction(
    () => !document.querySelector("#pasta[data-novice]"),
  );
  await page.close();
});

test("a card is blurred whole, with its image, and its neighbours stay clear", async () => {
  const page = await openFeed();
  assert.equal(await stateOf(page, "gcard"), "blur");
  assert.equal(
    await page.$eval("#gcard", (el) => el.getAttribute("data-novice")),
    "blur",
    "the card itself is the blurred unit, so its thumbnail is covered",
  );
  for (const id of ["gcard-safe-1", "gcard-safe-2", "gcard-safe-3"]) {
    assert.equal(await stateOf(page, id), "visible", id);
  }
  await page.close();
});

test("tags and dots sit in the top-left corner, centered only on thin rows", async () => {
  const page = await openFeed();
  const place = (id) =>
    page.$eval(`#${id}`, (el) => {
      const unit = el.closest("[data-novice]");
      const after = getComputedStyle(unit, "::before");
      return {
        size: unit.getAttribute("data-novice-size"),
        top: parseFloat(after.top),
        left: parseFloat(after.left),
        height: parseFloat(after.height) + parseFloat(after.paddingTop) * 2,
        unitHeight: unit.getBoundingClientRect().height,
      };
    });

  const narrow = await place("narrow");
  assert.equal(narrow.size, "m", "84px wide fits a tag");
  assert.equal(narrow.top, 8, "a tall box keeps its tag in the corner");

  const thin = await place("thin");
  assert.equal(thin.size, "m", "a 32px row fits a tag");
  assert.equal(thin.top, (thin.unitHeight - thin.height) / 2, "centered");

  const wide = await place("wide");
  assert.equal(
    wide.left,
    260,
    "the tag follows the text, not the wrapper edge",
  );
  assert.ok(Math.abs(wide.top - 12) <= 1, `level with the text: ${wide.top}`);

  const line = await place("trailer");
  assert.equal(line.size, "s", "one line of text gets a dot");
  assert.ok(
    line.top <= 6 && line.left <= 8,
    `corner: ${line.top},${line.left}`,
  );
  await page.close();
});

test("remove mode takes spoilers out of the page", async () => {
  const page = await openFeed();
  await setSettings({ style: "hide" });
  await page.waitForSelector("#trailer[data-novice='hide']", {
    state: "attached",
  });
  assert.equal(await page.isVisible("#trailer"), false);
  assert.equal(await page.isVisible("#pasta"), true);
  await setSettings({ style: "blur" });
  await page.waitForSelector("#trailer[data-novice='blur']", {
    state: "attached",
  });
  await page.close();
});

test("facebook posts are expanded so text behind See more is checked", async () => {
  const page = await context.newPage();
  await page.goto("https://www.facebook.com/");
  await page.waitForSelector("#logitech[data-novice-level='gta6']", {
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
    () => !document.querySelector("#fb-helicopters[data-novice]"),
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
  assert.equal(
    await page.$eval("#link", (el) => el.getAttribute("style")),
    null,
    "revealing leaves no trace of the tag position on the page's markup",
  );
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
  await page.waitForSelector("novice-shield", { state: "attached" });
  assert.equal(await page.title(), "Spoiler ahead");
  assert.equal(
    await page.evaluate(
      () =>
        document
          .querySelector("novice-shield")
          .shadowRoot?.querySelector(".found")?.textContent,
    ),
    undefined,
    "the cover keeps its shadow root closed",
  );
  assert.equal(
    await page.$eval("body", (b) => getComputedStyle(b).opacity),
    "1",
  );
  await page.close();
});

test("covers a page whose URL is about GTA VI before it renders", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/gta-6-leaks`, { waitUntil: "commit" });
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.close();
});

test("on NoVice's own front page, blurs spoilers but not the game's name", async () => {
  await context.route("https://github.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<title>kpulka247/novice: NoVice - Block GTA 6 Spoilers</title>
        <p id="name">Play GTA VI knowing nothing about it.</p>
        <p id="spoiler">feat: block GTA 6 posts saying Lucia dies</p>`,
    }),
  );
  const page = await context.newPage();
  await page.goto("https://github.com/kpulka247/novice");
  await page.waitForSelector("#spoiler[data-novice='blur']", {
    state: "attached",
  });
  assert.equal(await page.$("novice-shield"), null);
  assert.equal(await stateOf(page, "name"), "visible");
  // GitHub opens an issue without reloading the page, and anyone writes there.
  await page.evaluate(() => {
    history.pushState(null, "", "/kpulka247/novice/issues/1");
    document.title = "Spoiler report: GTA 6";
  });
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.waitForSelector("#name[data-novice='blur']", {
    state: "attached",
  });
  await page.goBack();
  await page.waitForSelector("novice-shield", { state: "detached" });
  await page.waitForSelector("#name:not([data-novice])", { state: "attached" });
  assert.equal(await stateOf(page, "spoiler"), "blur");
  await page.close();
  await context.unroute("https://github.com/**");
});

test("a blurred unit the site made click-through still takes the click", async () => {
  const page = await openFeed();
  const box = await page.locator("#ghost").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(await stateOf(page, "ghost"), "revealed");
  await page.close();
});

test("the cover takes focus, and show anyway reveals the covered page", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/2`);
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForSelector("novice-shield", { state: "detached" });
  assert.equal(await page.title(), "GTA 6 ending explained");
  await page.close();
});

test("popup switches turn blurring off globally and per site", async () => {
  const feed = await openFeed();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  assert.equal(await popup.textContent("h1"), "NoVice");
  assert.equal(await popup.textContent("footer a"), "Report an issue");

  await popup.fill("#keyword-input", "  Lucia   actress ");
  await popup.press("#keyword-input", "Enter");
  await popup.fill("#keyword-input", "lucia actress");
  await popup.click("#keyword-add");
  await popup.waitForSelector("#keyword-list li");
  assert.deepEqual(
    await worker.evaluate(() =>
      chrome.storage.local.get("keywords").then((s) => s.keywords),
    ),
    ["Lucia actress"],
    "keywords are trimmed and added once",
  );
  await popup.click("#keyword-list button");
  await popup.waitForSelector("#keyword-list", { state: "hidden" });

  await popup.click("label.row:has(#enabled)");
  await feed.waitForFunction(
    () => !document.querySelector("[data-novice='blur']"),
  );
  await popup.click("label.row:has(#enabled)");
  await feed.waitForSelector("#trailer[data-novice='blur']", {
    state: "attached",
  });

  await setSettings({ allowedSites: ["127.0.0.1"] });
  await feed.waitForFunction(
    () => !document.querySelector("[data-novice='blur']"),
  );
  await setSettings({ allowedSites: [] });
  await feed.waitForSelector("#trailer[data-novice='blur']", {
    state: "attached",
  });

  await popup.close();
  await feed.close();
});

test("on a page about GTA, vague story spoilers are blurred too", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/forum`);
  await page.waitForSelector("#twist[data-novice]", { state: "attached" });
  assert.equal(await stateOf(page, "vague"), "blur");
  assert.equal(await levelOf(page, "vague"), "gta6");
  for (const id of ["heist", "red-dead"]) {
    assert.equal(await stateOf(page, id), "visible", `${id} should stay clear`);
  }
  await page.close();
});

test("the cover stays visible on pages that hide undefined elements", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/1`);
  await page.addStyleTag({ content: ":not(:defined) { visibility: hidden }" });
  await page.waitForSelector("novice-shield", { state: "visible" });
  await page.close();
});

test("take me back leaves the cover behind, even if the site keeps its title", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/spa`);
  await page.waitForSelector("#post[data-novice]", { state: "attached" });
  await page.click("#post");
  await page.click("#open");
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.keyboard.press("Enter");
  await page.waitForURL(`${base}/spa`);
  await page.waitForSelector("novice-shield", { state: "detached" });
  assert.equal(await page.title(), "Spa feed");
  await page.close();
});

test("a revealed unit stays revealed when the site renders it again", async () => {
  const page = await openFeed();
  await page.click("#trailer");
  assert.equal(await stateOf(page, "trailer"), "revealed");
  await page.$eval("#trailer", (old) => {
    const fresh = document.createElement("li");
    fresh.id = "trailer-again";
    fresh.textContent = old.textContent;
    old.replaceWith(fresh);
  });
  await page.waitForSelector("#trailer-again[data-novice]", {
    state: "attached",
  });
  assert.equal(await stateOf(page, "trailer-again"), "revealed");
  assert.equal(await stateOf(page, "split"), "blur");
  await page.close();
});

test("the site never learns the pointer is over a blurred unit", async () => {
  const page = await openFeed();
  await page.$eval("#feed", (feed) => {
    window.hovered = new Set();
    for (const type of ["mouseover", "pointerover", "mousemove"]) {
      feed.addEventListener(type, (event) =>
        window.hovered.add(event.target.closest("li").id),
      );
    }
  });
  await page.hover("#trailer");
  await page.hover("#pasta");
  assert.deepEqual(await page.evaluate(() => [...window.hovered]), ["pasta"]);
  await page.close();
});

test("a unit the site reuses for something else loses its cover", async () => {
  const page = await openFeed();
  await page.$eval("#link a", (a) => a.setAttribute("href", "/news/pasta"));
  await page.$eval("#trailer", (li) => {
    li.textContent = "Cat learns to swim";
  });
  await page.waitForTimeout(100);
  assert.equal(await stateOf(page, "link"), "visible");
  assert.equal(await stateOf(page, "trailer"), "visible");
  assert.equal(
    await page.$eval("#link", (el) => el.getAttribute("tabindex")),
    null,
  );
  assert.equal(await stateOf(page, "split"), "blur");
  await page.close();
});

test("show anyway holds for the rest of the tab's session", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/news/3`);
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForSelector("novice-shield", { state: "detached" });
  await page.goto(`${base}/news/4`);
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.goto(`${base}/news/3`);
  await page.waitForTimeout(300);
  assert.equal(await page.$("novice-shield"), null);
  await page.close();
});

test("a player that names a GTA VI track only while it plays stays covered until shown", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/player`);
  await page.click("#play");
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.waitForTimeout(300);
  assert.ok(await page.$("novice-shield"), "the cover stays after the pause");
  assert.equal(await page.$eval("#track", (track) => track.paused), true);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForSelector("novice-shield", { state: "detached" });
  await page.click("#play");
  await page.waitForTimeout(300);
  assert.equal(await page.$("novice-shield"), null);
  assert.equal(await page.$eval("#track", (track) => track.paused), false);
  await page.close();
});

test("covers a stream whose game is GTA VI, though the page title never says so", async () => {
  const page = await context.newPage();
  await page.goto("https://kick.com/streamer");
  await page.waitForSelector("novice-shield", { state: "attached" });
  assert.equal(await page.title(), "Spoiler ahead");
  await page.close();
});

test("an embedded video about GTA VI is blurred in its frame, not covered like a page", async () => {
  const page = await context.newPage();
  await page.goto(`${base}/embed`);
  const frame = page.frame({ url: /youtube\.com\/embed/ });
  await frame.waitForSelector("html[data-novice-shield]", {
    state: "attached",
  });
  assert.equal(
    await frame.$eval("html", (h) => h.getAttribute("data-novice-shield")),
    "frame",
  );
  assert.equal(await page.$("novice-shield"), null);
  assert.equal(await page.title(), "Funny posts");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "BODY",
    "the frame's cover does not pull focus into the post",
  );
  await page.click("#player");
  await frame.waitForSelector("novice-shield", { state: "detached" });
  assert.equal(page.url(), `${base}/embed`);
  await page.close();
});

test("on a shorts feed, Skip moves on to the next video", async () => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/shorts/0");
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.keyboard.press("Enter");
  await page.waitForURL("https://www.youtube.com/shorts/1");
  await page.waitForSelector("novice-shield", { state: "detached" });
  assert.equal(await page.title(), "Cat learns to swim - YouTube");
  await page.close();
});

test("on a shorts feed, scrolling or pressing Down on the cover skips one video", async () => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/shorts/0");
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.keyboard.press("ArrowDown");
  await page.waitForURL("https://www.youtube.com/shorts/1");
  await page.waitForSelector("novice-shield", { state: "detached" });
  await page.waitForTimeout(300);
  assert.equal(page.url(), "https://www.youtube.com/shorts/1");

  await page.goto("https://www.youtube.com/shorts/0");
  await page.waitForSelector("novice-shield", { state: "attached" });
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 400);
  await page.waitForURL("https://www.youtube.com/shorts/1");
  await page.close();
});

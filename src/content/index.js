import {
  compileKeywords,
  findSpoiler,
  findUrlSpoiler,
  isNovicePage,
} from "../spoilers.js";
import {
  DEFAULT_SETTINGS,
  blocksOn,
  ext,
  getSettings,
  onSettingsChange,
} from "../settings.js";
import { feedAt, findSubjects } from "../sites.js";
import { WATCHED_ATTRS, createBlocker, termLabel } from "./blocker.js";
import { createReveals } from "./reveals.js";
import { BLOCKED_TITLE, createShield } from "./shield.js";

const host = location.hostname;
const isTopFrame = window === window.top;
const reveals = createReveals();
const blocker = createBlocker(host, reveals);

let settings = DEFAULT_SETTINGS;
let keywords = null;
const siteTitles = new Map();
let lastHref = location.href;
let lastSubjects = "";
let lastReported = -1;
let appliedConfig = "off";
const cleanTitles = new Set();
let heldTitle = null;

const shield = createShield({
  framed: !isTopFrame,
  onSkip: skipFeedItem,
  onLeave: () => {
    if (history.length > 1) history.back();
    else ext.runtime.sendMessage({ type: "close-tab" });
  },
  onReveal: () => {
    reveals.addPage(location.href);
    sync();
  },
});

const feed = () => (isTopFrame ? feedAt(host, location.pathname) : null);

// The site's own next button is the surest step; Down is what its keyboard
// handler listens for when the button is not rendered.
function skipFeedItem() {
  const selector = feed()?.next;
  const next = selector && document.querySelector(selector);
  if (next) return next.click();
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      bubbles: true,
    }),
  );
}

function isActive() {
  return blocksOn(settings, host) && !reveals.hasPage(location.href);
}

const rules = () => ({ nameAllowed: isNovicePage(location.href) });

function pageMatches() {
  const page = rules();
  return [
    findUrlSpoiler(location.href, keywords, page),
    findSpoiler(siteTitle(), keywords, page),
    ...findSubjects(host).flatMap((subject) => [
      findSpoiler(subject.textContent, keywords, page),
      subject.href ? findUrlSpoiler(subject.href, keywords, page) : null,
    ]),
  ].filter(Boolean);
}

const pageSpoiler = () =>
  pageMatches().find((match) => match.level === "gta6") ?? null;
const isAboutGta = () => pageMatches().length > 0;

// A music player names the track in its title only while it plays, and the
// cover pauses it, which takes the name away again. A title that turns to GTA
// VI on a page first seen with a clean one keeps the cover up until the page
// changes, so Show anyway stays within reach.
function heldTitleSpoiler() {
  const title = siteTitle();
  const match = findSpoiler(title, keywords, rules());
  if (match?.level === "gta6") {
    if (cleanTitles.has(location.href)) {
      heldTitle = { href: location.href, match };
    }
  } else if (title) {
    cleanTitles.add(location.href);
  }
  return heldTitle?.href === location.href ? heldTitle.match : null;
}

const subjectsText = () =>
  findSubjects(host)
    .map((subject) => `${subject.textContent} ${subject.href ?? ""}`)
    .join("\n");

// Titles are kept per URL, so a site that keeps its title on Back cannot lend
// this page the title of the page it left.
const siteTitle = () => siteTitles.get(location.href) ?? "";

function readSiteTitle() {
  if (document.title !== BLOCKED_TITLE) {
    siteTitles.set(location.href, document.title);
  }
}

function restoreTitle() {
  if (document.title === BLOCKED_TITLE) document.title = siteTitle();
}

function count() {
  return blocker.count() + (shield.shown ? 1 : 0);
}

function report() {
  if (!isTopFrame) return;
  const current = count();
  if (current === lastReported) return;
  lastReported = current;
  ext.runtime
    .sendMessage({ type: "blocked-count", count: current })
    .catch(() => {});
}

function sync() {
  readSiteTitle();
  const active = isActive();
  const aboutGta = active && isAboutGta();
  const { nameAllowed } = rules();
  const config = active
    ? `on:${settings.strict}:${settings.style}:${aboutGta}:${nameAllowed}:${settings.keywords.join("\n")}`
    : "off";
  if (config !== appliedConfig) {
    appliedConfig = config;
    blocker.clearAll();
    blocker.configure(settings, { aboutGta, nameAllowed });
    if (active) blocker.scan(document.documentElement);
  }
  const held = active ? heldTitleSpoiler() : null;
  const spoiler = active ? (pageSpoiler() ?? held) : null;
  if (spoiler) {
    shield.show(termLabel(spoiler.term), { inFeed: Boolean(feed()) });
  } else {
    shield.hide();
    restoreTitle();
  }
  report();
}

function handleMutations(records) {
  if (appliedConfig !== "off") {
    for (const record of records) {
      if (record.type === "attributes") blocker.checkAttributes(record.target);
      else if (record.type === "characterData") blocker.scan(record.target);
      else record.addedNodes.forEach((node) => blocker.scan(node));
    }
    blocker.recheckCovered(records.map((record) => record.target));
  }
  const titleChanged =
    document.title !== BLOCKED_TITLE && document.title !== siteTitle();
  const subjects = subjectsText();
  if (
    titleChanged ||
    location.href !== lastHref ||
    subjects !== lastSubjects ||
    shield.shown
  ) {
    lastHref = location.href;
    lastSubjects = subjects;
    sync();
  } else {
    report();
  }
}

function revealOnActivate(event) {
  if (!event.isTrusted) return;
  const unit = blocker.blurredUnitAt(event.target);
  if (!unit) return;
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.type === "click" || event.type === "keydown") {
    blocker.reveal(unit);
    report();
  }
}

const GUARDED_EVENTS = [
  "pointerdown",
  "mousedown",
  "mouseup",
  "click",
  "auxclick",
  "keydown",
];

// Sites play a preview of what is under the pointer, so a blurred unit keeps
// the pointer to itself. Leave events still pass, so no hover state sticks.
function hideHover(event) {
  if (blocker.blurredUnitAt(event.target)) event.stopImmediatePropagation();
}

const HOVER_EVENTS = [
  "pointerover",
  "pointerenter",
  "pointermove",
  "mouseover",
  "mouseenter",
  "mousemove",
];

function start() {
  new MutationObserver(handleMutations).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: WATCHED_ATTRS,
  });

  window.addEventListener("popstate", () => handleMutations([]));

  for (const type of GUARDED_EVENTS) {
    window.addEventListener(type, revealOnActivate, true);
  }
  for (const type of HOVER_EVENTS) {
    window.addEventListener(type, hideHover, true);
  }

  document.addEventListener(
    "play",
    (event) => {
      if (shield.shown) event.target.pause();
    },
    true,
  );

  sync();
  const apply = (next) => {
    settings = next;
    keywords = compileKeywords(next.keywords);
    sync();
  };
  getSettings().then(apply);
  onSettingsChange(apply);

  if (isTopFrame) {
    ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type !== "status") return;
      sendResponse({ host, count: count(), shielded: shield.shown });
    });
  }
}

if (!window.__novice) {
  window.__novice = true;
  start();
}

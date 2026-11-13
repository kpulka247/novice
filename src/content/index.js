import { compileKeywords, findSpoiler, findUrlSpoiler } from "../spoilers.js";
import {
  DEFAULT_SETTINGS,
  blocksOn,
  ext,
  getSettings,
  onSettingsChange,
} from "../settings.js";
import { WATCHED_ATTRS, createBlocker, termLabel } from "./blocker.js";
import { BLOCKED_TITLE, createShield } from "./shield.js";

const host = location.hostname;
const isTopFrame = window === window.top;
const blocker = createBlocker(host);

let settings = DEFAULT_SETTINGS;
let keywords = null;
let revealedHref = null;
let siteTitle = "";
let lastHref = location.href;
let lastReported = -1;
let appliedConfig = "off";

const shield = createShield({
  onLeave: () => {
    if (history.length > 1) history.back();
    else ext.runtime.sendMessage({ type: "close-tab" });
  },
  onReveal: () => {
    revealedHref = location.href;
    sync();
  },
});

function isActive() {
  return blocksOn(settings, host) && revealedHref !== location.href;
}

const gta6Only = (match) => (match?.level === "gta6" ? match : null);

function pageSpoiler() {
  return (
    gta6Only(findUrlSpoiler(location.href, keywords)) ??
    gta6Only(findSpoiler(siteTitle, keywords))
  );
}

function readSiteTitle() {
  if (document.title !== BLOCKED_TITLE) siteTitle = document.title;
}

function restoreTitle() {
  if (document.title === BLOCKED_TITLE) document.title = siteTitle;
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
  const config = active
    ? `on:${settings.strict}:${settings.style}:${settings.keywords.join("\n")}`
    : "off";
  if (config !== appliedConfig) {
    appliedConfig = config;
    blocker.clearAll();
    blocker.configure(settings);
    if (active) blocker.scan(document.documentElement);
  }
  const spoiler = active ? pageSpoiler() : null;
  if (spoiler) {
    shield.show(termLabel(spoiler.term));
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
  }
  const titleChanged =
    document.title !== BLOCKED_TITLE && document.title !== siteTitle;
  if (titleChanged || location.href !== lastHref || shield.shown) {
    lastHref = location.href;
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

function start() {
  new MutationObserver(handleMutations).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: WATCHED_ATTRS,
  });

  for (const type of GUARDED_EVENTS) {
    window.addEventListener(type, revealOnActivate, true);
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

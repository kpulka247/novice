import { mentionsGta6, urlMentionsGta6 } from "../spoilers.js";
import { ext, getSettings, onSettingsChange, blocksOn } from "../settings.js";
import {
  WATCHED_ATTRS,
  checkAttributes,
  countHidden,
  hideSpoilersIn,
  revealAll,
} from "./blocker.js";
import { BLOCKED_TITLE, createShield } from "./shield.js";

const host = location.hostname;
const isTopFrame = window === window.top;

let settings = { enabled: true, allowedSites: [] };
let revealedHref = null;
let siteTitle = "";
let lastHref = location.href;
let lastReported = -1;
let wasActive = false;

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

function pageIsAboutGta6() {
  return urlMentionsGta6(location.href) || mentionsGta6(siteTitle);
}

function readSiteTitle() {
  if (document.title !== BLOCKED_TITLE) siteTitle = document.title;
}

function report() {
  if (!isTopFrame) return;
  const count = countHidden() + (shield.shown ? 1 : 0);
  if (count === lastReported) return;
  lastReported = count;
  ext.runtime.sendMessage({ type: "blocked-count", count }).catch(() => {});
}

function sync() {
  readSiteTitle();
  const active = isActive();
  if (active && !wasActive) hideSpoilersIn(document.documentElement, host);
  wasActive = active;
  if (!active) {
    shield.hide();
    revealAll();
    if (document.title === BLOCKED_TITLE) document.title = siteTitle;
  } else if (pageIsAboutGta6()) {
    shield.show();
  } else {
    shield.hide();
    if (document.title === BLOCKED_TITLE) document.title = siteTitle;
  }
  report();
}

function handleMutations(records) {
  if (isActive()) {
    for (const record of records) {
      if (record.type === "attributes") checkAttributes(record.target, host);
      else if (record.type === "characterData")
        hideSpoilersIn(record.target, host);
      else record.addedNodes.forEach((node) => hideSpoilersIn(node, host));
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

function start() {
  new MutationObserver(handleMutations).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: WATCHED_ATTRS,
  });

  document.addEventListener(
    "play",
    (event) => {
      if (shield.shown) event.target.pause();
    },
    true,
  );

  sync();

  getSettings().then((stored) => {
    settings = stored;
    sync();
  });

  onSettingsChange((next) => {
    settings = next;
    sync();
  });

  if (isTopFrame) {
    ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type !== "status") return;
      sendResponse({
        host,
        count: countHidden() + (shield.shown ? 1 : 0),
        shielded: shield.shown,
      });
    });
  }
}

if (!window.__gta6SpoilerBlocker) {
  window.__gta6SpoilerBlocker = true;
  start();
}

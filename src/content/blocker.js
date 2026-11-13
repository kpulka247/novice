import { compileKeywords, findSpoiler, findUrlSpoiler } from "../spoilers.js";
import { expanderSelectorFor, findEmptiedShelf, findUnit } from "../sites.js";
import { ext } from "../settings.js";

const STATE = "data-novice";
const LEVEL = "data-novice-level";
const COVERED = `[${STATE}="blur"],[${STATE}="hide"]`;
const BLURRED = `[${STATE}="blur"]`;
const REVEALED = `[${STATE}="revealed"]`;
const SETTLED = `${REVEALED},[${LEVEL}="gta6"]`;
const ANCHOR = "data-novice-anchor";
const TAG = "data-novice-tag";
const SHOW_LABEL = "data-novice-show";
const TERM = "data-novice-term";
const TERM_WIDTH = "--novice-term-width";
const SIZE = "data-novice-size";
const ADDED = "data-novice-added";
const OFFSET_X = "--novice-x";
const OFFSET_Y = "--novice-y";
const EXPANDED = "data-novice-expanded";
const ACCESSIBLE = { tabindex: "0", role: "button" };

const SKIPPED = new Set([
  "HEAD",
  "LINK",
  "META",
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "NOVICE-SHIELD",
]);

const TEXT_ATTRS = ["alt", "title", "aria-label"];
const URL_ATTRS = ["href", "src", "poster"];
export const WATCHED_ATTRS = [...TEXT_ATTRS, ...URL_ATTRS];
const ATTR_SELECTOR = WATCHED_ATTRS.map((a) => `[${a}]`).join(",");

const INLINE_CONTEXT = 300;
const MAX_EXPANDER_TEXT = 40;

const TAGS = { gta6: "GTA VI", franchise: "GTA" };
const SHOW = ext.i18n.getMessage("show");
const STORY = ext.i18n.getMessage("reasonStory");
const MAX_TERM = 32;
const SMALL = { height: 24, width: 72 };
const CONTENT_SAMPLE = 60;
const MEDIA_TAGS = new Set(["IMG", "VIDEO", "PICTURE", "CANVAS", "svg"]);

function contentOffset(unit, box) {
  const range = document.createRange();
  const walker = document.createTreeWalker(
    unit,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let seen = 0;
  for (
    let node = walker.nextNode();
    node && seen < CONTENT_SAMPLE;
    node = walker.nextNode()
  ) {
    let rect;
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.data.trim()) continue;
      range.selectNodeContents(node);
      rect = range.getBoundingClientRect();
    } else if (MEDIA_TAGS.has(node.tagName)) {
      rect = node.getBoundingClientRect();
    } else {
      continue;
    }
    if (!rect.width || !rect.height) continue;
    seen++;
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    top = Math.min(top, rect.top);
  }
  if (!seen) return { x: 0, y: 0 };
  const rtl = getComputedStyle(unit).direction === "rtl";
  return {
    x: Math.max(0, Math.round(rtl ? box.right - right : left - box.left)),
    y: Math.max(0, Math.round(top - box.top)),
  };
}

let measurer = null;

function chipWidth(text) {
  if (!measurer) {
    measurer = document.createElement("canvas").getContext("2d");
    measurer.font = getComputedStyle(document.documentElement)
      .getPropertyValue("--novice-chip-font")
      .trim();
  }
  return `${Math.ceil(measurer.measureText(text).width)}px`;
}

function installChipWidths() {
  const style = document.createElement("style");
  const tags = Object.entries(TAGS)
    .map(([level, tag]) => `--novice-chip-${level}: ${chipWidth(tag)};`)
    .join(" ");
  style.textContent = `:root { ${tags} --novice-chip-show: ${chipWidth(SHOW)}; }`;
  document.documentElement.append(style);
}

export function termLabel(term) {
  if (term === null) return STORY;
  const words = term.replace(/\s+/g, " ");
  const short =
    words.length > MAX_TERM ? `${words.slice(0, MAX_TERM - 1)}…` : words;
  return `“${short}”`;
}

const isGta6 = (match) => match?.level === "gta6";
const stronger = (a, b) => (isGta6(a) ? a : isGta6(b) ? b : (a ?? b));

export function createBlocker(host) {
  let strict = true;
  let style = "blur";
  let keywords = null;
  const expanderSelector = expanderSelectorFor(host);
  const pendingExpanders = new Set();
  let chipWidthsInstalled = false;
  const sizes = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      if (!target.isConnected) continue;
      const box = target.getBoundingClientRect();
      const small = box.height < SMALL.height || box.width < SMALL.width;
      const { x, y } = contentOffset(target, box);
      target.style.setProperty(OFFSET_X, `${x}px`);
      target.style.setProperty(OFFSET_Y, `${y}px`);
      target.setAttribute(SIZE, small ? "s" : "m");
    }
  });

  const accept = (match) =>
    match?.level === "franchise" && !strict ? null : match;
  const matchOf = (text) => accept(findSpoiler(text, keywords));

  const isSkipped = (element) =>
    SKIPPED.has(element.tagName) ||
    element.isContentEditable ||
    element.matches(SETTLED);

  function label(unit, { level, term }) {
    unit.setAttribute(LEVEL, level);
    if (unit.getAttribute(STATE) === "blur") {
      const reason = termLabel(term);
      unit.setAttribute(TAG, TAGS[level]);
      unit.setAttribute(SHOW_LABEL, SHOW);
      unit.setAttribute(TERM, reason);
      unit.style.setProperty(TERM_WIDTH, chipWidth(reason));
    }
  }

  function cover(unit, match) {
    unit.setAttribute(STATE, style);
    if (style === "blur") {
      if (!chipWidthsInstalled) {
        installChipWidths();
        chipWidthsInstalled = true;
      }
      sizes.observe(unit);
      if (getComputedStyle(unit).position === "static") {
        unit.setAttribute(ANCHOR, "");
      }
      const added = [...Object.keys(ACCESSIBLE), "style"].filter(
        (a) => !unit.hasAttribute(a),
      );
      added
        .filter((a) => a in ACCESSIBLE)
        .forEach((a) => unit.setAttribute(a, ACCESSIBLE[a]));
      unit.setAttribute(ADDED, added.join(" "));
    }
    label(unit, match);
  }

  function mark(element, match) {
    if (element.closest(REVEALED)) return;
    const covered = element.closest(COVERED);
    if (covered) {
      if (isGta6(match) && covered.getAttribute(LEVEL) !== "gta6") {
        label(covered, match);
      }
      return;
    }
    const unit = findUnit(element, host);
    if (!unit || unit.closest(`[${STATE}]`)) return;
    cover(unit, match);
    if (style === "hide") {
      const isGone = (el) => el.closest(COVERED) || el.querySelector(COVERED);
      const shelf = findEmptiedShelf(unit, host, isGone);
      if (shelf) cover(shelf, match);
    }
  }

  function clear(unit, nextState) {
    sizes.unobserve(unit);
    unit.style.removeProperty(OFFSET_X);
    unit.style.removeProperty(OFFSET_Y);
    unit.style.removeProperty(TERM_WIDTH);
    const added = unit.getAttribute(ADDED)?.split(" ").filter(Boolean) ?? [];
    [...added, ANCHOR, TAG, SHOW_LABEL, TERM, SIZE, ADDED, LEVEL].forEach((a) =>
      unit.removeAttribute(a),
    );
    if (nextState) unit.setAttribute(STATE, nextState);
    else unit.removeAttribute(STATE);
  }

  function textMatch(textNode) {
    if (!textNode.data.trim()) return null;
    const own = matchOf(textNode.data);
    if (isGta6(own)) return own;
    const context = textNode.parentElement?.textContent ?? "";
    return context.length <= INLINE_CONTEXT
      ? stronger(own, matchOf(context))
      : own;
  }

  function urlMatch(element, attr) {
    if (!element.hasAttribute(attr)) return null;
    // The property resolves relative links ("/@RockstarGames") to absolute URLs.
    const resolved = element[attr];
    const url =
      typeof resolved === "string" && resolved
        ? resolved
        : element.getAttribute(attr);
    return accept(findUrlSpoiler(url, keywords));
  }

  function attrsMatch(element) {
    return [
      ...URL_ATTRS.map((a) => urlMatch(element, a)),
      ...TEXT_ATTRS.map((a) => matchOf(element.getAttribute(a))),
    ].reduce(stronger, null);
  }

  function checkElement(element) {
    if (!element.isConnected || element.closest(SETTLED)) return;
    const match = attrsMatch(element);
    if (match) mark(element, match);
  }

  function checkText(textNode) {
    const parent = textNode.parentElement;
    if (!parent || isSkipped(parent) || parent.closest(SETTLED)) return;
    const match = textMatch(textNode);
    if (match) mark(parent, match);
  }

  function expandTruncatedText(root) {
    if (!expanderSelector) return;
    const buttons = [...root.querySelectorAll(expanderSelector)];
    if (root.matches(expanderSelector)) buttons.push(root);
    for (const button of buttons) {
      const post = findUnit(button, host) ?? button.parentElement;
      if (!post || post.hasAttribute(EXPANDED)) continue;
      post.setAttribute(EXPANDED, "");
      pendingExpanders.add(button);
    }
    if (pendingExpanders.size === 0) return;
    setTimeout(() => {
      for (const button of pendingExpanders) {
        const text = button.textContent.trim();
        if (button.isConnected && text && text.length <= MAX_EXPANDER_TEXT) {
          button.click();
        }
      }
      pendingExpanders.clear();
    });
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) return checkText(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.parentElement?.closest("head") || isSkipped(root)) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          node.nodeType === Node.ELEMENT_NODE && isSkipped(node)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
    );
    const texts = [];
    for (let node = walker.currentNode; node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) texts.push(node);
    }
    texts.forEach(checkText);

    if (root.matches(ATTR_SELECTOR)) checkElement(root);
    root.querySelectorAll(ATTR_SELECTOR).forEach(checkElement);
    expandTruncatedText(root);
  }

  return {
    scan,
    checkAttributes(element) {
      if (!element.closest("head") && !isSkipped(element)) {
        checkElement(element);
      }
    },
    configure(settings) {
      strict = settings.strict;
      style = settings.style;
      keywords = compileKeywords(settings.keywords);
    },
    blurredUnitAt(target) {
      return target instanceof Element ? target.closest(BLURRED) : null;
    },
    reveal(unit) {
      clear(unit, "revealed");
    },
    clearAll() {
      document.querySelectorAll(COVERED).forEach((unit) => clear(unit));
    },
    count() {
      return document.querySelectorAll(`:is(${COVERED}):not(:is(${COVERED}) *)`)
        .length;
    },
  };
}

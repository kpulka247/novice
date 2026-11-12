import { spoilerLevel, urlMentionsGta6 } from "../spoilers.js";
import { expanderSelectorFor, findEmptiedShelf, findUnit } from "../sites.js";
import { ext } from "../settings.js";

const STATE = "data-gta6sb";
const LEVEL = "data-gta6sb-level";
const COVERED = `[${STATE}="blur"],[${STATE}="hide"]`;
const BLURRED = `[${STATE}="blur"]`;
const REVEALED = `[${STATE}="revealed"]`;
const SETTLED = `${REVEALED},[${LEVEL}="gta6"]`;
const ANCHOR = "data-gta6sb-anchor";
const TAG = "data-gta6sb-tag";
const SHOW_LABEL = "data-gta6sb-show";
const SIZE = "data-gta6sb-size";
const ADDED = "data-gta6sb-added";
const OFFSET_X = "--gta6sb-x";
const OFFSET_Y = "--gta6sb-y";
const EXPANDED = "data-gta6sb-expanded";
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
  "GTA6SB-SHIELD",
]);

const TEXT_ATTRS = ["alt", "title", "aria-label"];
const URL_ATTRS = ["href", "src", "poster"];
export const WATCHED_ATTRS = [...TEXT_ATTRS, ...URL_ATTRS];
const ATTR_SELECTOR = WATCHED_ATTRS.map((a) => `[${a}]`).join(",");

const INLINE_CONTEXT = 300;
const MAX_EXPANDER_TEXT = 40;

const TAGS = { gta6: "GTA VI", franchise: "GTA" };
const SHOW = ext.i18n.getMessage("show");
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

function installChipWidths() {
  const font = getComputedStyle(document.documentElement)
    .getPropertyValue("--gta6sb-chip-font")
    .trim();
  const context = document.createElement("canvas").getContext("2d");
  context.font = font;
  const width = (text) => `${Math.ceil(context.measureText(text).width)}px`;
  const style = document.createElement("style");
  const tags = Object.entries(TAGS)
    .map(([level, tag]) => `--gta6sb-chip-${level}: ${width(tag)};`)
    .join(" ");
  style.textContent = `:root { ${tags} --gta6sb-chip-show: ${width(SHOW)}; }`;
  document.documentElement.append(style);
}

const stronger = (a, b) => (a === "gta6" || b === "gta6" ? "gta6" : (a ?? b));

export function createBlocker(host) {
  let strict = true;
  let style = "blur";
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

  const accept = (level) => (level === "franchise" && !strict ? null : level);
  const levelOf = (text) => accept(spoilerLevel(text));

  const isSkipped = (element) =>
    SKIPPED.has(element.tagName) ||
    element.isContentEditable ||
    element.matches(SETTLED);

  function label(unit, level) {
    unit.setAttribute(LEVEL, level);
    if (unit.getAttribute(STATE) === "blur") {
      unit.setAttribute(TAG, TAGS[level]);
      unit.setAttribute(SHOW_LABEL, SHOW);
    }
  }

  function cover(unit, level) {
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
    label(unit, level);
  }

  function mark(element, level) {
    if (element.closest(REVEALED)) return;
    const covered = element.closest(COVERED);
    if (covered) {
      if (level === "gta6" && covered.getAttribute(LEVEL) !== "gta6") {
        label(covered, "gta6");
      }
      return;
    }
    const unit = findUnit(element, host);
    if (!unit || unit.closest(`[${STATE}]`)) return;
    cover(unit, level);
    if (style === "hide") {
      const isGone = (el) => el.closest(COVERED) || el.querySelector(COVERED);
      const shelf = findEmptiedShelf(unit, host, isGone);
      if (shelf) cover(shelf, level);
    }
  }

  function clear(unit, nextState) {
    sizes.unobserve(unit);
    unit.style.removeProperty(OFFSET_X);
    unit.style.removeProperty(OFFSET_Y);
    const added = unit.getAttribute(ADDED)?.split(" ").filter(Boolean) ?? [];
    [...added, ANCHOR, TAG, SHOW_LABEL, SIZE, ADDED, LEVEL].forEach((a) =>
      unit.removeAttribute(a),
    );
    if (nextState) unit.setAttribute(STATE, nextState);
    else unit.removeAttribute(STATE);
  }

  function textLevel(textNode) {
    if (!textNode.data.trim()) return null;
    const own = levelOf(textNode.data);
    if (own === "gta6") return own;
    const context = textNode.parentElement?.textContent ?? "";
    return context.length <= INLINE_CONTEXT
      ? stronger(own, levelOf(context))
      : own;
  }

  function attrsLevel(element) {
    const urlSpoils = URL_ATTRS.some((a) => {
      if (!element.hasAttribute(a)) return false;
      // The property resolves relative links ("/@RockstarGames") to absolute URLs.
      const resolved = element[a];
      return urlMentionsGta6(
        typeof resolved === "string" && resolved
          ? resolved
          : element.getAttribute(a),
      );
    });
    if (urlSpoils) return "gta6";
    return TEXT_ATTRS.map((a) => levelOf(element.getAttribute(a))).reduce(
      stronger,
      null,
    );
  }

  function checkElement(element) {
    if (!element.isConnected || element.closest(SETTLED)) return;
    const level = attrsLevel(element);
    if (level) mark(element, level);
  }

  function checkText(textNode) {
    const parent = textNode.parentElement;
    if (!parent || isSkipped(parent) || parent.closest(SETTLED)) return;
    const level = textLevel(textNode);
    if (level) mark(parent, level);
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

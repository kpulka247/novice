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
const HINT = "data-gta6sb-hint";
const SIZE = "data-gta6sb-size";
const ADDED = "data-gta6sb-added";
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
const SMALL = { height: 36, width: 140 };

const hintFor = (level) => `${TAGS[level]} · ${SHOW}`;

function installChipWidths() {
  const font = getComputedStyle(document.documentElement)
    .getPropertyValue("--gta6sb-chip-font")
    .trim();
  const context = document.createElement("canvas").getContext("2d");
  context.font = font;
  const width = (text) => `${Math.ceil(context.measureText(text).width)}px`;
  const style = document.createElement("style");
  style.textContent = `:root {${Object.keys(TAGS)
    .map(
      (level) =>
        `--gta6sb-chip-${level}: ${width(TAGS[level])}; --gta6sb-chip-${level}-hint: ${width(hintFor(level))};`,
    )
    .join(" ")}}`;
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
    for (const { target, contentRect } of entries) {
      const small =
        contentRect.height < SMALL.height || contentRect.width < SMALL.width;
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
    if (unit.getAttribute(STATE) === "blur")
      unit.setAttribute(HINT, hintFor(level));
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
      const added = Object.keys(ACCESSIBLE).filter(
        (a) => !unit.hasAttribute(a),
      );
      added.forEach((a) => unit.setAttribute(a, ACCESSIBLE[a]));
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
    const added = unit.getAttribute(ADDED)?.split(" ").filter(Boolean) ?? [];
    [...added, ANCHOR, HINT, SIZE, ADDED, LEVEL].forEach((a) =>
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

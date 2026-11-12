import { mentionsGta6, urlMentionsGta6 } from "../spoilers.js";
import { findUnit } from "../sites.js";
import { ext } from "../settings.js";

const STATE = "data-gta6sb";
const BLURRED = `[${STATE}="blur"]`;
const REVEALED = `[${STATE}="revealed"]`;
const ANCHOR = "data-gta6sb-anchor";
const SIZE = "data-gta6sb-size";
const LABEL = "data-gta6sb-label";
const ADDED = "data-gta6sb-added";
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

const label = {
  long: ext.i18n.getMessage("blurLabel"),
  short: ext.i18n.getMessage("blurShort"),
};

export function createBlocker(host) {
  let strict = true;

  const spoils = (text) => mentionsGta6(text, { strict });
  const isSettled = (element) =>
    element.closest(`${BLURRED},${REVEALED}`) !== null;

  const isSkipped = (element) =>
    SKIPPED.has(element.tagName) ||
    element.isContentEditable ||
    element.hasAttribute(STATE);

  function blur(element) {
    const unit = findUnit(element, host);
    if (!unit || isSettled(unit)) return;
    const { width, height } = unit.getBoundingClientRect();
    const small = height > 0 && (height < 48 || width < 220);
    if (getComputedStyle(unit).position === "static")
      unit.setAttribute(ANCHOR, "");
    const added = Object.keys(ACCESSIBLE).filter((a) => !unit.hasAttribute(a));
    added.forEach((a) => unit.setAttribute(a, ACCESSIBLE[a]));
    unit.setAttribute(ADDED, added.join(" "));
    unit.setAttribute(SIZE, small ? "s" : "m");
    unit.setAttribute(LABEL, small ? label.short : label.long);
    unit.setAttribute(STATE, "blur");
  }

  function clear(unit, nextState) {
    const added = unit.getAttribute(ADDED)?.split(" ").filter(Boolean) ?? [];
    [...added, ANCHOR, SIZE, LABEL, ADDED].forEach((a) =>
      unit.removeAttribute(a),
    );
    if (nextState) unit.setAttribute(STATE, nextState);
    else unit.removeAttribute(STATE);
  }

  function textSpoils(textNode) {
    if (!textNode.data.trim()) return false;
    if (spoils(textNode.data)) return true;
    const context = textNode.parentElement?.textContent ?? "";
    return context.length <= INLINE_CONTEXT && spoils(context);
  }

  function attrsSpoil(element) {
    return (
      TEXT_ATTRS.some((a) => spoils(element.getAttribute(a))) ||
      URL_ATTRS.some((a) => {
        if (!element.hasAttribute(a)) return false;
        // The property resolves relative links ("/@RockstarGames") to absolute URLs.
        const resolved = element[a];
        return urlMentionsGta6(
          typeof resolved === "string" && resolved
            ? resolved
            : element.getAttribute(a),
        );
      })
    );
  }

  function checkElement(element) {
    if (element.isConnected && !isSettled(element) && attrsSpoil(element)) {
      blur(element);
    }
  }

  function checkText(textNode) {
    const parent = textNode.parentElement;
    if (!parent || isSkipped(parent) || isSettled(parent)) return;
    if (textSpoils(textNode)) blur(parent);
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
  }

  return {
    scan,
    checkAttributes(element) {
      if (!element.closest("head") && !isSkipped(element))
        checkElement(element);
    },
    setStrict(value) {
      strict = value;
    },
    blurredUnitAt(target) {
      return target instanceof Element ? target.closest(BLURRED) : null;
    },
    reveal(unit) {
      clear(unit, "revealed");
    },
    clearAll() {
      document.querySelectorAll(BLURRED).forEach((unit) => clear(unit));
    },
    count() {
      return document.querySelectorAll(`${BLURRED}:not(${BLURRED} *)`).length;
    },
  };
}

import { mentionsGta6, urlMentionsGta6 } from "../spoilers.js";
import { findEmptiedShelf, findUnit } from "../sites.js";

const HIDDEN = "data-gta6sb-hidden";

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

function isSkipped(element) {
  return (
    SKIPPED.has(element.tagName) ||
    element.isContentEditable ||
    element.hasAttribute(HIDDEN)
  );
}

const isHidden = (element) => element.closest(`[${HIDDEN}]`) !== null;

function hide(element, host) {
  const unit = findUnit(element, host);
  if (!unit || isHidden(unit)) return;
  unit.setAttribute(HIDDEN, "");
  const isGone = (el) =>
    isHidden(el) || el.querySelector(`[${HIDDEN}]`) !== null;
  findEmptiedShelf(unit, host, isGone)?.setAttribute(HIDDEN, "");
}

function textSpoils(textNode) {
  if (!textNode.data.trim()) return false;
  if (mentionsGta6(textNode.data)) return true;
  const context = textNode.parentElement?.textContent ?? "";
  return context.length <= INLINE_CONTEXT && mentionsGta6(context);
}

function attrsSpoil(element) {
  return (
    TEXT_ATTRS.some((a) => mentionsGta6(element.getAttribute(a))) ||
    URL_ATTRS.some((a) => {
      if (!element.hasAttribute(a)) return false;
      // The property resolves relative links ("/@RockstarGames") to absolute URLs.
      const resolved = element[a];
      const value =
        typeof resolved === "string" && resolved
          ? resolved
          : element.getAttribute(a);
      return urlMentionsGta6(value);
    })
  );
}

function checkElement(element, host) {
  if (!element.isConnected || isHidden(element)) return;
  if (attrsSpoil(element)) hide(element, host);
}

function checkText(textNode, host) {
  const parent = textNode.parentElement;
  if (!parent || isSkipped(parent) || isHidden(parent)) return;
  if (textSpoils(textNode)) hide(parent, host);
}

export function hideSpoilersIn(root, host) {
  if (root.nodeType === Node.TEXT_NODE) return checkText(root, host);
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
  texts.forEach((text) => checkText(text, host));

  if (root.matches(ATTR_SELECTOR)) checkElement(root, host);
  root.querySelectorAll(ATTR_SELECTOR).forEach((el) => checkElement(el, host));
}

export function checkAttributes(element, host) {
  if (!element.closest("head") && !isSkipped(element))
    checkElement(element, host);
}

export function revealAll() {
  document
    .querySelectorAll(`[${HIDDEN}]`)
    .forEach((el) => el.removeAttribute(HIDDEN));
}

export function countHidden() {
  return document.querySelectorAll(`[${HIDDEN}]:not([${HIDDEN}] *)`).length;
}

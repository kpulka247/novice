import logo from "../assets/logo.svg";
import tokens from "../styles/tokens.css?raw";
import styles from "./shield.css?raw";
import { ext } from "../settings.js";

const SHIELD_ATTR = "data-novice-shield";
const SKIP_KEYS = new Set(["ArrowDown", "PageDown"]);
const SKIP_PAUSE_MS = 1000;
const t = (key) => ext.i18n.getMessage(key);

export const BLOCKED_TITLE = t("shieldTitle");

// A framed shield covers an embed inside someone else's page. It only blurs
// and offers Show, since leaving would take the whole tab with it.
export function createShield({ framed, onLeave, onReveal, onSkip }) {
  const host = document.createElement("novice-shield");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>${tokens}${styles}</style>
    <div class="backdrop" role="alertdialog" aria-labelledby="title" aria-describedby="text">
      <div class="card">
        <div class="logo">${logo}</div>
        <h1 id="title"></h1>
        <p id="text"></p>
        <p class="found"></p>
        <button class="skip" type="button"></button>
        <button class="leave" type="button"></button>
        <button class="reveal" type="button"></button>
      </div>
    </div>`;
  const backdrop = root.querySelector(".backdrop");
  backdrop.dir = t("@@bidi_dir");
  backdrop.classList.toggle("framed", framed);
  root.querySelector("h1").textContent = t("shieldTitle");
  root.querySelector("#text").textContent = t("shieldText");
  root.querySelector(".skip").textContent = t("shieldSkip");
  root.querySelector(".leave").textContent = t("shieldBack");
  root.querySelector(".reveal").textContent = t("shieldShow");
  root.querySelector(".leave").addEventListener("click", onLeave);
  root.querySelector(".reveal").addEventListener("click", onReveal);
  if (framed) backdrop.addEventListener("click", onReveal);

  let shown = false;
  let feed = false;
  let lastSkip = 0;

  function skip() {
    if (Date.now() - lastSkip < SKIP_PAUSE_MS) return;
    lastSkip = Date.now();
    onSkip();
  }

  root.querySelector(".skip").addEventListener("click", skip);
  backdrop.addEventListener(
    "wheel",
    (event) => {
      if (!feed) return;
      event.preventDefault();
      if (event.deltaY > 0) skip();
    },
    { passive: false },
  );
  // Feeds move focus to their player after the cover takes it, so Down is
  // caught for the whole window rather than on the cover's buttons.
  window.addEventListener(
    "keydown",
    (event) => {
      if (!shown || !feed || !SKIP_KEYS.has(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      skip();
    },
    true,
  );

  return {
    get shown() {
      return shown;
    },
    show(reason, { inFeed = false } = {}) {
      const opening = !shown;
      shown = true;
      feed = inFeed;
      backdrop.classList.toggle("feed", feed);
      root.querySelector(".found").textContent =
        `${t("shieldFound")} ${reason}`;

      const html = document.documentElement;
      html.setAttribute(SHIELD_ATTR, framed ? "frame" : "");
      if (html.lastElementChild !== host) html.appendChild(host);
      if (opening && !framed) {
        root.querySelector(feed ? ".skip" : ".leave").focus();
      }
      if (document.title !== BLOCKED_TITLE) document.title = BLOCKED_TITLE;
      document.querySelectorAll("video, audio").forEach((m) => m.pause());
    },
    hide() {
      if (!shown) return;
      shown = false;
      document.documentElement.removeAttribute(SHIELD_ATTR);
      host.remove();
    },
  };
}

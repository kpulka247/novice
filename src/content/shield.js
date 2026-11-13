import logo from "../assets/logo.svg";
import tokens from "../styles/tokens.css?raw";
import styles from "./shield.css?raw";
import { ext } from "../settings.js";

const SHIELD_ATTR = "data-novice-shield";
const t = (key) => ext.i18n.getMessage(key);

export const BLOCKED_TITLE = t("shieldTitle");

export function createShield({ onLeave, onReveal }) {
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
        <button class="leave" type="button"></button>
        <button class="reveal" type="button"></button>
      </div>
    </div>`;
  root.querySelector(".backdrop").dir = t("@@bidi_dir");
  root.querySelector("h1").textContent = t("shieldTitle");
  root.querySelector("#text").textContent = t("shieldText");
  root.querySelector(".leave").textContent = t("shieldBack");
  root.querySelector(".reveal").textContent = t("shieldShow");
  root.querySelector(".leave").addEventListener("click", onLeave);
  root.querySelector(".reveal").addEventListener("click", onReveal);

  let shown = false;

  return {
    get shown() {
      return shown;
    },
    show(reason) {
      shown = true;
      root.querySelector(".found").textContent =
        `${t("shieldFound")} ${reason}`;

      const html = document.documentElement;
      html.setAttribute(SHIELD_ATTR, "");
      if (html.lastElementChild !== host) html.appendChild(host);
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

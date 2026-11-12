import logo from "../assets/logo.svg";
import styles from "./shield.css?raw";

const SHIELD_ATTR = "data-gta6sb-shield";
export const BLOCKED_TITLE = "Spoiler blocked";

const markup = `
  <style>${styles}</style>
  <div class="backdrop" role="alertdialog" aria-labelledby="title" aria-describedby="text">
    <div class="card">
      <div class="logo">${logo}</div>
      <h1 id="title">Spoiler blocked</h1>
      <p id="text">This page is about GTA VI. We covered it so you can go into the game knowing nothing.</p>
      <div class="actions">
        <button class="leave" type="button">Take me back</button>
        <button class="reveal" type="button">Show anyway (spoilers ahead)</button>
      </div>
      <div class="brand">GTA 6 Spoiler Blocker</div>
    </div>
  </div>`;

export function createShield({ onLeave, onReveal }) {
  const host = document.createElement("gta6sb-shield");
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = markup;
  root.querySelector(".leave").addEventListener("click", onLeave);
  root.querySelector(".reveal").addEventListener("click", onReveal);

  let shown = false;

  return {
    get shown() {
      return shown;
    },
    show() {
      shown = true;
      const html = document.documentElement;
      html.setAttribute(SHIELD_ATTR, "");
      if (host.parentNode !== html || html.lastElementChild !== host) {
        html.appendChild(host);
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

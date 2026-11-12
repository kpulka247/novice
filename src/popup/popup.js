import logo from "../assets/logo.svg";
import {
  ext,
  getSettings,
  isSiteAllowed,
  onSettingsChange,
  setEnabled,
  setSiteAllowed,
} from "../settings.js";

const $ = (id) => document.getElementById(id);

async function pageStatus() {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  try {
    return await ext.tabs.sendMessage(tab.id, { type: "status" });
  } catch {
    return null;
  }
}

function render(settings, status) {
  $("enabled").checked = settings.enabled;
  $("enabled-hint").textContent = settings.enabled
    ? "Blocking GTA VI everywhere"
    : "Paused, spoilers can get through";
  document.body.classList.toggle("paused", !settings.enabled);

  if (!status) {
    $("site-row").hidden = true;
    $("count").textContent = "–";
    $("count-label").textContent = "nothing to block on this page";
    return;
  }

  const siteBlocked = !isSiteAllowed(settings, status.host);
  $("site-row").hidden = false;
  $("site").checked = siteBlocked;
  $("site").disabled = !settings.enabled;
  $("site-host").textContent = siteBlocked
    ? status.host
    : `${status.host} is allowed`;

  $("count").textContent = status.count;
  $("count-label").textContent = status.shielded
    ? "this whole page is about GTA VI and is covered"
    : `spoiler${status.count === 1 ? "" : "s"} blocked on this page`;
}

async function init() {
  $("logo").innerHTML = logo;
  let settings = await getSettings();
  let status = await pageStatus();
  render(settings, status);

  $("enabled").addEventListener("change", (e) => setEnabled(e.target.checked));
  $("site").addEventListener("change", (e) => {
    if (status) setSiteAllowed(status.host, !e.target.checked);
  });

  onSettingsChange(async (next) => {
    settings = next;
    status = (await pageStatus()) ?? status;
    render(settings, status);
  });
}

init();

import logo from "../assets/logo.svg";
import {
  ext,
  getSettings,
  isSiteAllowed,
  onSettingsChange,
  setSiteAllowed,
  updateSettings,
} from "../settings.js";

const $ = (id) => document.getElementById(id);
const t = (key) => ext.i18n.getMessage(key);

function translate() {
  document.documentElement.lang = ext.i18n.getUILanguage();
  document.documentElement.dir = t("@@bidi_dir");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $("logo").innerHTML = logo;
}

async function pageStatus() {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  try {
    return await ext.tabs.sendMessage(tab.id, { type: "status" });
  } catch {
    return null;
  }
}

function render(settings, status) {
  document.body.classList.toggle("paused", !settings.enabled);
  $("enabled").checked = settings.enabled;
  $("enabled-hint").textContent = t(
    settings.enabled ? "protectionOn" : "protectionOff",
  );
  $("strict").checked = settings.strict;
  $("strict").disabled = !settings.enabled;

  $("site-row").hidden = !status;
  if (!status) {
    $("count").textContent = "0";
    $("count-label").textContent = t("countLabelNone");
    return;
  }

  const siteBlocked = !isSiteAllowed(settings, status.host);
  $("site").checked = siteBlocked;
  $("site").disabled = !settings.enabled;
  $("site-host").textContent = siteBlocked ? status.host : t("siteAllowed");
  $("count").textContent = status.count;
  $("count-label").textContent = t(
    status.shielded ? "countLabelPage" : "countLabel",
  );
}

async function init() {
  translate();
  let settings = await getSettings();
  let status = await pageStatus();
  render(settings, status);

  $("enabled").addEventListener("change", (e) =>
    updateSettings({ enabled: e.target.checked }),
  );
  $("strict").addEventListener("change", (e) =>
    updateSettings({ strict: e.target.checked }),
  );
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

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
  $("keyword-input").placeholder = t("keywordPlaceholder");
}

const sameKeyword = (a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

function renderKeywords(settings) {
  const list = $("keyword-list");
  list.replaceChildren(
    ...settings.keywords.map((keyword) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      const remove = document.createElement("button");
      text.textContent = keyword;
      remove.type = "button";
      remove.textContent = "×";
      remove.title = t("keywordRemove");
      remove.setAttribute("aria-label", `${t("keywordRemove")}: ${keyword}`);
      remove.disabled = !settings.enabled;
      remove.addEventListener("click", () =>
        updateSettings({
          keywords: settings.keywords.filter((k) => k !== keyword),
        }),
      );
      item.append(text, remove);
      return item;
    }),
  );
  list.hidden = settings.keywords.length === 0;
  $("keyword-input").disabled = !settings.enabled;
  $("keyword-add").disabled = !settings.enabled;
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
  document.querySelectorAll('input[name="style"]').forEach((radio) => {
    radio.checked = radio.value === settings.style;
    radio.disabled = !settings.enabled;
  });
  renderKeywords(settings);

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
  $("style").addEventListener("change", (e) =>
    updateSettings({ style: e.target.value }),
  );
  $("site").addEventListener("change", (e) => {
    if (status) setSiteAllowed(status.host, !e.target.checked);
  });
  $("keyword-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const keyword = $("keyword-input").value.trim().replace(/\s+/g, " ");
    $("keyword-input").value = "";
    if (!keyword || settings.keywords.some((k) => sameKeyword(k, keyword))) {
      return;
    }
    updateSettings({ keywords: [...settings.keywords, keyword] });
  });

  onSettingsChange(async (next) => {
    settings = next;
    status = (await pageStatus()) ?? status;
    render(settings, status);
  });
}

init();

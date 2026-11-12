export const ext = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = { enabled: true, allowedSites: [] };

export async function getSettings() {
  return { ...DEFAULTS, ...(await ext.storage.local.get(DEFAULTS)) };
}

export async function setEnabled(enabled) {
  await ext.storage.local.set({ enabled });
}

export async function setSiteAllowed(host, allowed) {
  const { allowedSites } = await getSettings();
  const others = allowedSites.filter((site) => site !== host);
  await ext.storage.local.set({
    allowedSites: allowed ? [...others, host] : others,
  });
}

export function onSettingsChange(callback) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && Object.keys(changes).some((k) => k in DEFAULTS)) {
      getSettings().then(callback);
    }
  });
}

export function isSiteAllowed(settings, host) {
  return settings.allowedSites.includes(host);
}

export function blocksOn(settings, host) {
  return settings.enabled && !isSiteAllowed(settings, host);
}

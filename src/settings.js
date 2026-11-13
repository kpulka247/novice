export const ext = globalThis.browser ?? globalThis.chrome;

export const DEFAULT_SETTINGS = {
  enabled: true,
  strict: true,
  style: "blur",
  allowedSites: [],
  keywords: [],
};

export async function getSettings() {
  return {
    ...DEFAULT_SETTINGS,
    ...(await ext.storage.local.get(DEFAULT_SETTINGS)),
  };
}

export async function updateSettings(patch) {
  await ext.storage.local.set(patch);
}

export async function setSiteAllowed(host, allowed) {
  const { allowedSites } = await getSettings();
  const others = allowedSites.filter((site) => site !== host);
  await updateSettings({ allowedSites: allowed ? [...others, host] : others });
}

export function onSettingsChange(callback) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (
      area === "local" &&
      Object.keys(changes).some((k) => k in DEFAULT_SETTINGS)
    ) {
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

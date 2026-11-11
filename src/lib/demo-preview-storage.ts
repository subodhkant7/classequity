export const demoPreviewKeys = {
  workspace: 'ce_demo_workspace_v1',
  parent: 'ce_demo_parent_v1',
  studio: 'ce_demo_studio_report_v1',
} as const;

const maxPreviewLength = 256_000;

export function readDemoPreview<T>(
  key: string,
  scope: string | undefined,
  decode: (value: unknown) => T | undefined,
) {
  if (!scope) return undefined;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw || raw.length > maxPreviewLength) return undefined;
    const stored = JSON.parse(raw);
    return stored?.scope === scope ? decode(stored.value) : undefined;
  } catch {
    return undefined;
  }
}

export function writeDemoPreview(key: string, scope: string | undefined, value: unknown) {
  if (!scope) return;
  try {
    const raw = JSON.stringify({ scope, value });
    if (raw.length <= maxPreviewLength) window.sessionStorage.setItem(key, raw);
    else removeDemoPreview(key);
  } catch {}
}

export function removeDemoPreview(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

export function clearDemoPreviews() {
  for (const key of Object.values(demoPreviewKeys)) removeDemoPreview(key);
}

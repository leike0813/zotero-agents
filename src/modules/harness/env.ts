export type HarnessEnv = {
  zoteroPluginDataDir?: string;
  zoteroPluginProfilePath?: string;
  zoteroPrefsPath?: string;
  values: Record<string, string>;
};

const PATH_KEYS = new Set([
  "ZOTERO_PLUGIN_DATA_DIR",
  "ZOTERO_PLUGIN_PROFILE_PATH",
  "ZOTERO_PREFS_PATH",
]);

function stripInlineComment(value: string) {
  let quote: '"' | "'" | "" = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
      continue;
    }
    if (char === "#" && !quote) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value.trimEnd();
}

function unquote(value: string) {
  const trimmed = stripInlineComment(value.trim());
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (
    trimmed.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseHarnessEnv(source: string): HarnessEnv {
  const values: Record<string, string> = {};
  for (const rawLine of String(source || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = normalized.slice(0, eqIndex).trim();
    if (!PATH_KEYS.has(key)) {
      continue;
    }
    values[key] = unquote(normalized.slice(eqIndex + 1));
  }
  return {
    zoteroPluginDataDir: values.ZOTERO_PLUGIN_DATA_DIR,
    zoteroPluginProfilePath: values.ZOTERO_PLUGIN_PROFILE_PATH,
    zoteroPrefsPath: values.ZOTERO_PREFS_PATH,
    values,
  };
}

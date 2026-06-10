import { readFile } from "node:fs/promises";
import path from "node:path";

export type ReadonlyPrefsStore = {
  values: Record<string, unknown>;
  get(key: string): unknown;
};

function unescapePrefString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function parsePrefValue(rawValue: string): unknown {
  const value = rawValue.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return unescapePrefString(value.slice(1, -1));
  }
  return value;
}

export function parseZoteroPrefs(source: string) {
  const values: Record<string, unknown> = {};
  const pattern =
    /user_pref\("((?:\\.|[^"\\])*)"\s*,\s*((?:"(?:\\.|[^"\\])*")|true|false|-?\d+(?:\.\d+)?)\s*\);/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const key = unescapePrefString(match[1]);
    values[key] = parsePrefValue(match[2]);
  }
  return values;
}

export async function readZoteroPrefsStore(prefsPath: string) {
  const source = await readFile(prefsPath, "utf8");
  const values = parseZoteroPrefs(source);
  return {
    values,
    get(key: string) {
      return values[key];
    },
  } satisfies ReadonlyPrefsStore;
}

export function resolveZoteroPrefsPath(args: {
  explicitPrefsPath?: string;
  profilePath?: string;
}) {
  const explicit = String(args.explicitPrefsPath || "").trim();
  if (explicit) return explicit;
  const profilePath = String(args.profilePath || "").trim();
  if (!profilePath) return "";
  return path.join(profilePath, "prefs.js");
}

export function installReadonlyZoteroPrefs(store: ReadonlyPrefsStore) {
  const runtime = globalThis as any;
  const zotero = (runtime.Zotero ||= {});
  const prefs = (zotero.Prefs ||= {});
  prefs.get = (key: string) => store.get(String(key || ""));
  prefs.set = () => {
    throw new Error("Readonly harness blocked Zotero.Prefs.set");
  };
  prefs.clear = () => {
    throw new Error("Readonly harness blocked Zotero.Prefs.clear");
  };
  return store;
}

import { readFile } from "node:fs/promises";
import path from "node:path";
function unescapePrefString(value) {
    try {
        return JSON.parse(`"${value}"`);
    }
    catch {
        return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
}
function parsePrefValue(rawValue) {
    const value = rawValue.trim();
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    if (/^-?\d+(?:\.\d+)?$/.test(value)) {
        return Number(value);
    }
    if (value.startsWith('"') && value.endsWith('"')) {
        return unescapePrefString(value.slice(1, -1));
    }
    return value;
}
export function parseZoteroPrefs(source) {
    const values = {};
    const pattern = /user_pref\("((?:\\.|[^"\\])*)"\s*,\s*((?:"(?:\\.|[^"\\])*")|true|false|-?\d+(?:\.\d+)?)\s*\);/g;
    let match;
    while ((match = pattern.exec(source))) {
        const key = unescapePrefString(match[1]);
        values[key] = parsePrefValue(match[2]);
    }
    return values;
}
export async function readZoteroPrefsStore(prefsPath) {
    const source = await readFile(prefsPath, "utf8");
    const values = parseZoteroPrefs(source);
    return {
        values,
        get(key) {
            return values[key];
        },
    };
}
export function resolveZoteroPrefsPath(args) {
    const explicit = String(args.explicitPrefsPath || "").trim();
    if (explicit)
        return explicit;
    const profilePath = String(args.profilePath || "").trim();
    if (!profilePath)
        return "";
    return path.join(profilePath, "prefs.js");
}
export function installReadonlyZoteroPrefs(store) {
    const runtime = globalThis;
    const zotero = (runtime.Zotero ||= {});
    const prefs = (zotero.Prefs ||= {});
    prefs.get = (key) => store.get(String(key || ""));
    prefs.set = () => {
        throw new Error("Readonly harness blocked Zotero.Prefs.set");
    };
    prefs.clear = () => {
        throw new Error("Readonly harness blocked Zotero.Prefs.clear");
    };
    return store;
}

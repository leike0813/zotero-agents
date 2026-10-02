import { config } from "../../package.json";
const PREFS_PREFIX = config.prefsPrefix;
export function getPrefName(key) {
    return `${PREFS_PREFIX}.${key}`;
}
/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref(key) {
    return Zotero.Prefs.get(getPrefName(key), true);
}
/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref(key, value) {
    return Zotero.Prefs.set(getPrefName(key), value, true);
}
/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key) {
    return Zotero.Prefs.clear(`${PREFS_PREFIX}.${key}`, true);
}

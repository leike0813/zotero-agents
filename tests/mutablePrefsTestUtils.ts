export function installMutablePrefsForTest() {
  const runtime = globalThis as { Zotero?: any };
  const zotero = (runtime.Zotero ||= {});
  const previousPrefs = zotero.Prefs;
  const values = new Map<string, unknown>();

  zotero.Prefs = {
    ...(previousPrefs || {}),
    get(key: string) {
      const prefKey = String(key || "");
      if (values.has(prefKey)) {
        return values.get(prefKey);
      }
      return previousPrefs?.get?.(prefKey, true);
    },
    set(key: string, value: unknown) {
      values.set(String(key || ""), value);
      return undefined;
    },
    clear(key: string) {
      values.delete(String(key || ""));
      return undefined;
    },
  };

  return () => {
    if (previousPrefs === undefined) {
      delete zotero.Prefs;
    } else {
      zotero.Prefs = previousPrefs;
    }
  };
}

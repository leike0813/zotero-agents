function parseFlag(raw?: string | null) {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  return !["0", "false", "off"].includes(String(raw).toLowerCase());
}

export function shouldKeepZoteroTestObjects() {
  if (typeof process !== "undefined" && process.env) {
    const parsed = parseFlag(process.env.ZOTERO_KEEP_TEST_OBJECTS);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  const services = globalThis.Services as
    | { env?: { get?: (key: string) => string } }
    | undefined;
  if (services?.env?.get) {
    try {
      const parsed = parseFlag(services.env.get("ZOTERO_KEEP_TEST_OBJECTS"));
      if (parsed !== undefined) {
        return parsed;
      }
    } catch {
      // ignore missing env var in Zotero sandbox
    }
  }
  const globalFlag = (globalThis as { ZOTERO_KEEP_TEST_OBJECTS?: string })
    .ZOTERO_KEEP_TEST_OBJECTS;
  const parsedGlobal = parseFlag(globalFlag);
  if (parsedGlobal !== undefined) {
    return parsedGlobal;
  }
  return false;
}

const HARDCODED_DEBUG_MODE = true;

let debugModeOverrideForTests: boolean | undefined;

export function isDebugModeEnabled() {
  if (typeof debugModeOverrideForTests === "boolean") {
    return debugModeOverrideForTests;
  }
  return HARDCODED_DEBUG_MODE;
}

export function setDebugModeOverrideForTests(enabled?: boolean) {
  if (typeof enabled === "boolean") {
    debugModeOverrideForTests = enabled;
    return;
  }
  debugModeOverrideForTests = undefined;
}

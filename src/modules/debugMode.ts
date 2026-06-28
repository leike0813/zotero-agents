const BUILD_TIME_DEBUG_MODE: boolean =
  typeof __debug_mode__ !== "undefined" ? __debug_mode__ : false;

let debugModeOverrideForTests: boolean | undefined;

export function isDebugModeEnabled() {
  if (typeof debugModeOverrideForTests === "boolean") {
    return debugModeOverrideForTests;
  }
  return BUILD_TIME_DEBUG_MODE;
}

export function setDebugModeOverrideForTests(enabled?: boolean) {
  if (typeof enabled === "boolean") {
    debugModeOverrideForTests = enabled;
    return;
  }
  debugModeOverrideForTests = undefined;
}

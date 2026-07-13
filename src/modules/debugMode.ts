const BUILD_TIME_DEBUG_MODE: boolean =
  typeof __debug_mode__ !== "undefined" ? __debug_mode__ : false;

let debugModeOverrideForTests: boolean | undefined;
const DEBUG_MODE_OVERRIDE_KEY = "__zs_debug_mode_override_for_tests__";

type DebugModeRuntime = typeof globalThis & {
  [DEBUG_MODE_OVERRIDE_KEY]?: boolean;
};

export function isDebugModeEnabled() {
  if (typeof debugModeOverrideForTests === "boolean") {
    return debugModeOverrideForTests;
  }
  return BUILD_TIME_DEBUG_MODE;
}

export function setDebugModeOverrideForTests(enabled?: boolean) {
  if (typeof enabled === "boolean") {
    debugModeOverrideForTests = enabled;
    (globalThis as DebugModeRuntime)[DEBUG_MODE_OVERRIDE_KEY] = enabled;
    return;
  }
  debugModeOverrideForTests = undefined;
  delete (globalThis as DebugModeRuntime)[DEBUG_MODE_OVERRIDE_KEY];
}

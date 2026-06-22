type RuntimeAddonLike = {
  data?: {
    config?: {
      addonName?: string;
      addonRef?: string;
      prefsPrefix?: string;
    };
    ztoolkit?: Record<string, unknown>;
  };
};

type RuntimeZoteroLike = typeof Zotero;

type RuntimeGlobalLike = typeof globalThis & {
  addon?: RuntimeAddonLike;
  Zotero?: RuntimeZoteroLike;
  ztoolkit?: Record<string, unknown>;
  alert?: (message?: unknown) => void;
  console?: typeof globalThis.console | null;
};

type RuntimeWindowLike = Partial<
  Pick<
    Window,
    | "fetch"
    | "btoa"
    | "atob"
    | "TextEncoder"
    | "TextDecoder"
    | "FileReader"
    | "navigator"
    | "console"
  >
>;

type RuntimeBridgeOverride = {
  addon?: RuntimeAddonLike | undefined;
  zotero?: RuntimeZoteroLike | undefined;
  ztoolkit?: Record<string, unknown> | undefined;
  fetch?: typeof globalThis.fetch | undefined;
  Buffer?: typeof globalThis.Buffer | null | undefined;
  btoa?: typeof globalThis.btoa | null | undefined;
  atob?: typeof globalThis.atob | null | undefined;
  TextEncoder?: typeof globalThis.TextEncoder | null | undefined;
  TextDecoder?: typeof globalThis.TextDecoder | null | undefined;
  FileReader?: typeof globalThis.FileReader | null | undefined;
  navigator?: typeof globalThis.navigator | null | undefined;
  console?: typeof globalThis.console | null | undefined;
};

type RuntimeHostCapabilities = {
  zotero?: RuntimeZoteroLike | undefined;
  addon?: RuntimeAddonLike | undefined;
  fetch?: typeof globalThis.fetch | null;
  Buffer?: typeof globalThis.Buffer | null;
  btoa?: typeof globalThis.btoa | null;
  atob?: typeof globalThis.atob | null;
  TextEncoder?: typeof globalThis.TextEncoder | null;
  TextDecoder?: typeof globalThis.TextDecoder | null;
  FileReader?: typeof globalThis.FileReader | null;
  navigator?: typeof globalThis.navigator | null;
  console?: typeof globalThis.console | undefined;
};

type RuntimeZoteroShape = {
  hasItems: boolean;
  hasPrefs: boolean;
  hasFile: boolean;
  hasDebug: boolean;
};

type RuntimeZoteroResolution = {
  zotero?: RuntimeZoteroLike | undefined;
  source: "override" | "global-var" | "global-this" | "unresolved";
  shape: RuntimeZoteroShape;
};

let runtimeBridgeOverride: RuntimeBridgeOverride | null = null;
const EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY = "__zsRuntimeBridgeOverride";

function resolveRuntimeGlobal() {
  return globalThis as RuntimeGlobalLike;
}

function readWindowFromGlobalVar() {
  const runtimeWindow = (
    globalThis as typeof globalThis & {
      window?: Window;
    }
  ).window;
  if (!runtimeWindow) {
    return undefined;
  }
  return runtimeWindow as RuntimeWindowLike;
}

function readHiddenDomWindow() {
  const runtimeGlobal = resolveRuntimeGlobal() as typeof globalThis & {
    Services?: {
      appShell?: {
        hiddenDOMWindow?: Window;
      };
    };
  };
  try {
    return runtimeGlobal.Services?.appShell?.hiddenDOMWindow as
      | RuntimeWindowLike
      | undefined;
  } catch {
    return undefined;
  }
}

function readMainWindow() {
  try {
    return resolveRuntimeZotero()?.getMainWindow?.() as
      | RuntimeWindowLike
      | undefined;
  } catch {
    return undefined;
  }
}

function resolveRuntimeWindow() {
  const runtimeAddon = resolveRuntimeAddon();
  const globalWindow = readWindowFromGlobalVar();
  return (
    (runtimeAddon?.data as
      | {
          dialog?: { window?: Window };
          prefs?: { window?: Window };
        }
      | undefined)?.dialog?.window ||
    (runtimeAddon?.data as
      | {
          dialog?: { window?: Window };
          prefs?: { window?: Window };
        }
      | undefined)?.prefs?.window ||
    globalWindow ||
    readMainWindow() ||
    readHiddenDomWindow() ||
    undefined
  ) as RuntimeWindowLike | undefined;
}

function readExternalRuntimeBridgeOverride() {
  const runtimeGlobal = resolveRuntimeGlobal() as RuntimeGlobalLike & {
    [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
  };
  const runtimeWindow = resolveRuntimeWindow() as
    | (RuntimeWindowLike & {
        [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
      })
    | undefined;
  return (
    runtimeGlobal[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY] ||
    runtimeWindow?.[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY] ||
    null
  );
}

function clearExternalRuntimeBridgeOverrideSlots() {
  const runtimeGlobal = resolveRuntimeGlobal() as RuntimeGlobalLike & {
    [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
    Services?: {
      appShell?: {
        hiddenDOMWindow?: Window;
      };
    };
  };
  const runtimeAddonWindows = resolveRuntimeAddon()?.data as
    | {
        dialog?: { window?: Window };
        prefs?: { window?: Window };
      }
    | undefined;
  const targets = [
    runtimeGlobal,
    readWindowFromGlobalVar() as
      | (RuntimeWindowLike & {
          [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
        })
      | undefined,
    runtimeAddonWindows?.dialog?.window as
      | (Window & {
          [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
        })
      | undefined,
    runtimeAddonWindows?.prefs?.window as
      | (Window & {
          [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
        })
      | undefined,
    readMainWindow() as
      | (Window & {
          [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
        })
      | undefined,
    readHiddenDomWindow() as
      | (Window & {
          [EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY]?: RuntimeBridgeOverride;
        })
      | undefined,
  ];
  const seen = new Set<unknown>();
  for (const target of targets) {
    if (!target || typeof target !== "object" || seen.has(target)) {
      continue;
    }
    seen.add(target);
    try {
      delete target[EXTERNAL_RUNTIME_BRIDGE_OVERRIDE_KEY];
    } catch {
      // ignore protected globals in real Zotero runtime
    }
  }
}

function readAddonFromGlobalVar() {
  if (typeof addon === "undefined" || !addon) {
    return undefined;
  }
  return addon as unknown as RuntimeAddonLike;
}

function readZoteroFromGlobalVar() {
  if (typeof Zotero === "undefined" || !Zotero) {
    return undefined;
  }
  return Zotero as unknown as RuntimeZoteroLike;
}

function readToolkitFromGlobalVar() {
  if (typeof ztoolkit === "undefined" || !ztoolkit) {
    return undefined;
  }
  return ztoolkit as unknown as Record<string, unknown>;
}

function readConsoleFromGlobalVar() {
  if (typeof console === "undefined" || !console) {
    return undefined;
  }
  return console as typeof globalThis.console;
}

export function summarizeRuntimeZoteroShape(
  value: unknown,
): RuntimeZoteroShape {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  const items =
    candidate && typeof candidate.Items === "object"
      ? (candidate.Items as Record<string, unknown>)
      : null;
  const prefs =
    candidate && typeof candidate.Prefs === "object"
      ? (candidate.Prefs as Record<string, unknown>)
      : null;
  const file =
    candidate && typeof candidate.File === "object"
      ? (candidate.File as Record<string, unknown>)
      : null;
  return {
    hasItems: !!items && typeof items.get === "function",
    hasPrefs:
      !!prefs &&
      typeof prefs.get === "function" &&
      typeof prefs.set === "function",
    hasFile: !!file && typeof file.pathToFile === "function",
    hasDebug: !!candidate && typeof candidate.debug === "function",
  };
}

function scoreRuntimeZoteroShape(shape: RuntimeZoteroShape) {
  return (
    (shape.hasItems && shape.hasPrefs ? 100 : 0) +
    (shape.hasItems ? 40 : 0) +
    (shape.hasPrefs ? 20 : 0) +
    (shape.hasFile ? 5 : 0) +
    (shape.hasDebug ? 1 : 0)
  );
}

export function resolveRuntimeZoteroDetails(): RuntimeZoteroResolution {
  if (runtimeBridgeOverride && "zotero" in runtimeBridgeOverride) {
    if (typeof runtimeBridgeOverride.zotero === "undefined") {
      return {
        zotero: undefined,
        source: "override",
        shape: summarizeRuntimeZoteroShape(undefined),
      };
    }
  }

  const candidates: Array<{
    source: "override" | "global-var" | "global-this";
    zotero: RuntimeZoteroLike;
  }> = [];
  if (
    runtimeBridgeOverride &&
    "zotero" in runtimeBridgeOverride &&
    runtimeBridgeOverride.zotero
  ) {
    candidates.push({
      source: "override",
      zotero: runtimeBridgeOverride.zotero,
    });
  }
  const fromGlobalThis = resolveRuntimeGlobal().Zotero;
  const suppressGlobalVarCandidate =
    !!runtimeBridgeOverride?.zotero && typeof fromGlobalThis === "undefined";
  const fromGlobalVar = suppressGlobalVarCandidate
    ? undefined
    : readZoteroFromGlobalVar();
  if (fromGlobalVar) {
    candidates.push({
      source: "global-var",
      zotero: fromGlobalVar,
    });
  }
  if (fromGlobalThis) {
    candidates.push({
      source: "global-this",
      zotero: fromGlobalThis,
    });
  }

  let best: RuntimeZoteroResolution | null = null;
  let bestScore = -1;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const shape = summarizeRuntimeZoteroShape(candidate.zotero);
    const score = scoreRuntimeZoteroShape(shape);
    if (score > bestScore) {
      best = {
        zotero: candidate.zotero,
        source: candidate.source,
        shape,
      };
      bestScore = score;
    }
  }

  if (best) {
    return best;
  }
  return {
    zotero: undefined,
    source: "unresolved",
    shape: summarizeRuntimeZoteroShape(undefined),
  };
}

export function resolveRuntimeAddon() {
  if (runtimeBridgeOverride && "addon" in runtimeBridgeOverride) {
    return runtimeBridgeOverride.addon;
  }
  return readAddonFromGlobalVar() || resolveRuntimeGlobal().addon;
}

export function resolveRuntimeZotero() {
  return resolveRuntimeZoteroDetails().zotero;
}

export function resolveRuntimeConsole() {
  const externalOverride = readExternalRuntimeBridgeOverride();
  const activeOverride = runtimeBridgeOverride || externalOverride;
  if (activeOverride && "console" in activeOverride) {
    return activeOverride.console || undefined;
  }
  return (
    readConsoleFromGlobalVar() ||
    resolveRuntimeGlobal().console ||
    resolveRuntimeWindow()?.console ||
    undefined
  );
}

export function resolveRuntimeHostCapabilities(): RuntimeHostCapabilities {
  const runtimeGlobal = resolveRuntimeGlobal();
  const runtimeWindow = resolveRuntimeWindow();
  const externalOverride = readExternalRuntimeBridgeOverride();
  const override = runtimeBridgeOverride || externalOverride;
  const fetchImpl =
    typeof override?.fetch === "function"
      ? override.fetch
      : typeof runtimeGlobal.fetch === "function"
      ? runtimeGlobal.fetch
      : typeof runtimeWindow?.fetch === "function"
        ? runtimeWindow.fetch
        : null;
  const boundFetch =
    typeof fetchImpl === "function"
      ? fetchImpl.bind(
          fetchImpl === runtimeWindow?.fetch ? runtimeWindow : runtimeGlobal,
        )
      : null;
  const btoaImpl =
    typeof override?.btoa === "function"
      ? override.btoa
      : typeof runtimeGlobal.btoa === "function"
      ? runtimeGlobal.btoa
      : typeof runtimeWindow?.btoa === "function"
        ? runtimeWindow.btoa
        : null;
  const boundBtoa =
    typeof btoaImpl === "function"
      ? btoaImpl.bind(
          btoaImpl === runtimeWindow?.btoa ? runtimeWindow : runtimeGlobal,
        )
      : null;
  const atobImpl =
    typeof override?.atob === "function"
      ? override.atob
      : typeof runtimeGlobal.atob === "function"
      ? runtimeGlobal.atob
      : typeof runtimeWindow?.atob === "function"
        ? runtimeWindow.atob
        : null;
  const boundAtob =
    typeof atobImpl === "function"
      ? atobImpl.bind(
          atobImpl === runtimeWindow?.atob ? runtimeWindow : runtimeGlobal,
        )
      : null;
  return {
    zotero: resolveRuntimeZotero(),
    addon: resolveRuntimeAddon(),
    fetch: boundFetch,
    Buffer: override && "Buffer" in override
      ? (override.Buffer ?? null)
      :
      (runtimeGlobal.Buffer as typeof globalThis.Buffer | undefined) ??
      (runtimeWindow as
        | {
            Buffer?: typeof globalThis.Buffer;
          }
        | undefined)?.Buffer ??
      null,
    btoa: boundBtoa,
    atob: boundAtob,
    TextEncoder: override && "TextEncoder" in override
      ? (override.TextEncoder ?? null)
      :
      (runtimeGlobal.TextEncoder as typeof globalThis.TextEncoder | undefined) ??
      runtimeWindow?.TextEncoder ??
      null,
    TextDecoder: override && "TextDecoder" in override
      ? (override.TextDecoder ?? null)
      :
      (runtimeGlobal.TextDecoder as typeof globalThis.TextDecoder | undefined) ??
      runtimeWindow?.TextDecoder ??
      null,
    FileReader: override && "FileReader" in override
      ? (override.FileReader ?? null)
      :
      (runtimeGlobal.FileReader as typeof globalThis.FileReader | undefined) ??
      runtimeWindow?.FileReader ??
      null,
    navigator: override && "navigator" in override
      ? (override.navigator ?? null)
      :
      (runtimeGlobal.navigator as typeof globalThis.navigator | undefined) ??
      runtimeWindow?.navigator ??
      null,
    console: resolveRuntimeConsole(),
  };
}

export function resolveRuntimeToolkit() {
  if (runtimeBridgeOverride && "ztoolkit" in runtimeBridgeOverride) {
    return runtimeBridgeOverride.ztoolkit;
  }
  const fromGlobalVar = readToolkitFromGlobalVar();
  const fromGlobalThis = resolveRuntimeGlobal().ztoolkit;
  const fromAddon = resolveRuntimeAddon()?.data?.ztoolkit;
  return fromGlobalVar || fromGlobalThis || fromAddon;
}

export function resolveToolkitMember<T>(member: string) {
  const toolkit = resolveRuntimeToolkit();
  const value = toolkit ? (toolkit as Record<string, unknown>)[member] : undefined;
  if (typeof value === "undefined") {
    return undefined;
  }
  return value as T;
}

export function resolveAddonName(fallback = "Zotero Agents") {
  const name = String(resolveRuntimeAddon()?.data?.config?.addonName || "").trim();
  return name || fallback;
}

export function resolveAddonRef(fallback = "") {
  const ref = String(resolveRuntimeAddon()?.data?.config?.addonRef || "").trim();
  return ref || fallback;
}

export function resolveRuntimeAlert(win?: unknown) {
  const candidate = win as { alert?: ((message?: unknown) => void) | undefined } | undefined;
  if (typeof candidate?.alert === "function") {
    return (message: string) => candidate.alert?.(message);
  }
  const toolkit = resolveRuntimeToolkit() as
    | {
        getGlobal?: (name: string) => unknown;
      }
    | undefined;
  const fromToolkit = toolkit?.getGlobal?.("alert");
  if (typeof fromToolkit === "function") {
    return (message: string) => (fromToolkit as (value: string) => unknown)(message);
  }
  const fromGlobal = resolveRuntimeGlobal().alert;
  if (typeof fromGlobal === "function") {
    return (message: string) => fromGlobal(message);
  }
  return undefined;
}

export function installRuntimeBridgeOverrideForTests(
  override: RuntimeBridgeOverride,
) {
  runtimeBridgeOverride = { ...override };
}

export function resetRuntimeBridgeOverrideForTests() {
  runtimeBridgeOverride = null;
  clearExternalRuntimeBridgeOverrideSlots();
}

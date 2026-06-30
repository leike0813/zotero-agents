import {
  installHostBridgeCli,
  resolveHostBridgeCliInstallTarget,
  type HostBridgeCliInstallResult,
  type HostBridgeCliInstallerDeps,
} from "./hostBridgeCliInstaller";
import { resolveHostBridgeCliPlatform } from "./hostBridgeCliResolver";
import { readPackagedBinaryAsset } from "./packagedAssetResolver";
import { detectRuntimePlatform } from "../platform/runtimePlatform";
import { readRuntimeEnv } from "../platform/env";
import { readRuntimeBytes, runtimePathExists } from "./runtimePersistence";
import { getPref, setPref } from "../utils/prefs";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const STARTUP_PROMPT_DISABLE_ENV_KEYS = [
  "ZOTERO_AGENTS_DISABLE_HOST_BRIDGE_CLI_STARTUP_PROMPT",
  "ZOTERO_AGENTS_DISABLE_HOST_BRIDGE_CLI_PROMPT",
];

const AUTOMATED_BOOLEAN_ENV_KEYS = [
  "CI",
  "GITHUB_ACTIONS",
  "ZOTERO_PLUGIN_TEST",
];

const AUTOMATED_VALUE_ENV_KEYS = [
  "ZOTERO_TEST_MODE",
  "ZOTERO_TEST_DOMAIN",
  "ZOTERO_TEST_TARGET_SCRIPT",
];

export type HostBridgeCliInstallPromptStatus =
  | "missing"
  | "stale"
  | "current"
  | "unavailable";

export type HostBridgeCliInstallPromptState =
  | {
      status: "missing" | "stale" | "current";
      targetPath: string;
      targetDir: string;
      bundledVersion: string;
      bundledSha256: string;
      bundledIdentity: string;
      targetSha256: string;
    }
  | {
      status: "unavailable";
      targetPath: string;
      targetDir: string;
      bundledVersion: string;
      bundledSha256: string;
      bundledIdentity: string;
      targetSha256: string;
      message: string;
      details?: Record<string, unknown>;
    };

export type HostBridgeCliStartupPromptResult = {
  prompted: boolean;
  installed: boolean;
  state: HostBridgeCliInstallPromptState;
  install?: HostBridgeCliInstallResult;
};

export type HostBridgeCliInstallPromptDeps = Pick<
  HostBridgeCliInstallerDeps,
  "platform" | "homeDir" | "localAppDataDir" | "pathEnv"
> & {
  readRuntimeFile?: (path: string) => Promise<Uint8Array>;
  runtimePathExists?: (path: string) => Promise<boolean>;
  readBundledAsset?: (relativePath: string) => Promise<Uint8Array | null>;
  hashBytes?: (bytes: Uint8Array) => Promise<string>;
  getDismissedIdentity?: () => string;
  setDismissedIdentity?: (identity: string) => void;
  install?: (
    deps?: HostBridgeCliInstallerDeps,
  ) => Promise<HostBridgeCliInstallResult>;
};

export type HostBridgeCliStartupPromptPolicyDeps = {
  runtimeEnv?: () => "development" | "production";
  readEnv?: (name: string) => string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function resolveBuildRuntimeEnv() {
  return typeof __env__ === "undefined" ? "development" : __env__;
}

function isTruthyEnvFlag(value: unknown) {
  const normalized = normalizeString(value).toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

export function shouldRunHostBridgeCliStartupPrompt(
  deps: HostBridgeCliStartupPromptPolicyDeps = {},
) {
  if ((deps.runtimeEnv || resolveBuildRuntimeEnv)() !== "production") {
    return false;
  }
  const readEnv = deps.readEnv || readRuntimeEnv;
  if (
    STARTUP_PROMPT_DISABLE_ENV_KEYS.some((key) => isTruthyEnvFlag(readEnv(key)))
  ) {
    return false;
  }
  if (AUTOMATED_BOOLEAN_ENV_KEYS.some((key) => isTruthyEnvFlag(readEnv(key)))) {
    return false;
  }
  if (AUTOMATED_VALUE_ENV_KEYS.some((key) => normalizeString(readEnv(key)))) {
    return false;
  }
  return true;
}

function resolveArch() {
  const runtime = globalThis as {
    process?: { arch?: string };
  };
  return normalizeString(runtime.process?.arch) || "x64";
}

function packagedCliRelativePath(deps: HostBridgeCliInstallPromptDeps = {}) {
  const platform = resolveHostBridgeCliPlatform({
    platform: deps.platform?.() || detectRuntimePlatform(),
    arch: resolveArch(),
  });
  return `bin/${platform.dir}/${platform.binary}`;
}

async function defaultReadBundledAsset(relativePath: string) {
  const read = await readPackagedBinaryAsset(relativePath);
  return read.ok ? read.bytes : null;
}

async function sha256Bytes(bytes: Uint8Array) {
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
      };
    };
    process?: unknown;
  };
  if (typeof runtime.crypto?.subtle?.digest === "function") {
    const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }
  if (runtime.process) {
    const crypto = await dynamicImport("crypto").catch(() => null);
    if (typeof crypto?.createHash === "function") {
      return crypto.createHash("sha256").update(bytes).digest("hex");
    }
  }
  throw new Error("No SHA-256 digest API is available");
}

function decodeUtf8(bytes: Uint8Array) {
  const Decoder =
    (globalThis as { TextDecoder?: typeof TextDecoder }).TextDecoder ||
    TextDecoder;
  return new Decoder("utf-8").decode(bytes);
}

async function readBundledReleaseVersion(args: {
  readBundledAsset: (relativePath: string) => Promise<Uint8Array | null>;
}) {
  const bytes = await args.readBundledAsset("bin/zotero-bridge-release.json");
  if (!bytes) {
    return "";
  }
  try {
    const manifest = JSON.parse(decodeUtf8(bytes)) as { version?: unknown };
    return normalizeString(manifest.version);
  } catch {
    return "";
  }
}

function buildBundledIdentity(args: { version: string; sha256: string }) {
  return args.version
    ? `${args.version}:${args.sha256}`
    : `sha256:${args.sha256}`;
}

export async function resolveHostBridgeCliInstallPromptState(
  deps: HostBridgeCliInstallPromptDeps = {},
): Promise<HostBridgeCliInstallPromptState> {
  const target = resolveHostBridgeCliInstallTarget(deps);
  const readBundledAsset = deps.readBundledAsset || defaultReadBundledAsset;
  const readRuntimeFile = deps.readRuntimeFile || readRuntimeBytes;
  const pathExists = deps.runtimePathExists || runtimePathExists;
  const hashBytes = deps.hashBytes || sha256Bytes;
  const bundledBytes = await readBundledAsset(packagedCliRelativePath(deps));
  const bundledVersion =
    (await readBundledReleaseVersion({ readBundledAsset })) || "unknown";
  if (!bundledBytes) {
    return {
      status: "unavailable",
      targetPath: target.targetPath,
      targetDir: target.targetDir,
      bundledVersion,
      bundledSha256: "",
      bundledIdentity: "",
      targetSha256: "",
      message: "Bundled Host Bridge CLI binary is unavailable.",
    };
  }

  const bundledSha256 = await hashBytes(bundledBytes);
  const bundledIdentity = buildBundledIdentity({
    version: bundledVersion === "unknown" ? "" : bundledVersion,
    sha256: bundledSha256,
  });
  let targetSha256 = "";
  if (!(await pathExists(target.targetPath))) {
    return {
      status: "missing",
      targetPath: target.targetPath,
      targetDir: target.targetDir,
      bundledVersion,
      bundledSha256,
      bundledIdentity,
      targetSha256,
    };
  }
  try {
    targetSha256 = await hashBytes(await readRuntimeFile(target.targetPath));
  } catch (error) {
    return {
      status: "stale",
      targetPath: target.targetPath,
      targetDir: target.targetDir,
      bundledVersion,
      bundledSha256,
      bundledIdentity,
      targetSha256,
    };
  }
  return {
    status: targetSha256 === bundledSha256 ? "current" : "stale",
    targetPath: target.targetPath,
    targetDir: target.targetDir,
    bundledVersion,
    bundledSha256,
    bundledIdentity,
    targetSha256,
  };
}

function defaultGetDismissedIdentity() {
  return normalizeString(
    getPref("hostBridgeCli.installPrompt.dismissedIdentity"),
  );
}

function defaultSetDismissedIdentity(identity: string) {
  setPref("hostBridgeCli.installPrompt.dismissedIdentity", identity);
}

export function shouldPromptHostBridgeCliInstall(args: {
  state: HostBridgeCliInstallPromptState;
  dismissedIdentity?: string;
}) {
  if (args.state.status !== "missing" && args.state.status !== "stale") {
    return false;
  }
  return (
    !!args.state.bundledIdentity &&
    normalizeString(args.dismissedIdentity) !== args.state.bundledIdentity
  );
}

export async function promptHostBridgeCliInstallOnStartup(args: {
  win: Pick<_ZoteroTypes.MainWindow, "confirm" | "alert">;
  message: (state: HostBridgeCliInstallPromptState) => string;
  successMessage: (install: HostBridgeCliInstallResult) => string;
  failureMessage: (install: HostBridgeCliInstallResult) => string;
  deps?: HostBridgeCliInstallPromptDeps;
}) {
  const deps = args.deps || {};
  const state = await resolveHostBridgeCliInstallPromptState(deps);
  const dismissedIdentity =
    deps.getDismissedIdentity?.() || defaultGetDismissedIdentity();
  if (!shouldPromptHostBridgeCliInstall({ state, dismissedIdentity })) {
    return {
      prompted: false,
      installed: false,
      state,
    };
  }

  if (!args.win.confirm(args.message(state))) {
    (deps.setDismissedIdentity || defaultSetDismissedIdentity)(
      state.bundledIdentity,
    );
    return {
      prompted: true,
      installed: false,
      state,
    };
  }

  const install = await (deps.install || installHostBridgeCli)({
    confirmAddToPath: (dir) =>
      args.win.confirm(
        `Install directory is not in PATH:\n\n${dir}\n\nAdd it to the user PATH? Restarting terminals may be required.`,
      ),
  });
  if (install.ok) {
    args.win.alert(args.successMessage(install));
    return {
      prompted: true,
      installed: true,
      state,
      install,
    };
  }
  args.win.alert(args.failureMessage(install));
  return {
    prompted: true,
    installed: false,
    state,
    install,
  };
}

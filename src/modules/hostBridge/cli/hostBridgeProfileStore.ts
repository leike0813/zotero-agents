import { joinPath } from "../../../utils/path";
import { HOST_BRIDGE_PROTOCOL_VERSION } from "../server/hostBridgeProtocol";
import { replacePrivateRuntimeTextFileAtomically } from "../../runtimePersistence";

export type HostBridgeWellKnownProfile = {
  schema: "zotero-bridge.profile.v1";
  protocol: typeof HOST_BRIDGE_PROTOCOL_VERSION;
  endpoint: string;
  connectionMode: "local";
  auth: {
    type: "bearer";
    token: string;
  };
  source: "well-known";
  updatedAt: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function readEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
    Services?: { env?: { get?: (name: string) => string } };
  };
  const processValue = normalizeString(runtime.process?.env?.[name]);
  if (processValue) {
    return processValue;
  }
  try {
    return normalizeString(runtime.Services?.env?.get?.(name));
  } catch {
    return "";
  }
}

function resolvePlatform() {
  const runtime = globalThis as {
    process?: { platform?: string };
    Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
  };
  if (runtime.Zotero?.isWin || runtime.process?.platform === "win32") {
    return "win32";
  }
  if (runtime.Zotero?.isMac || runtime.process?.platform === "darwin") {
    return "darwin";
  }
  if (runtime.Zotero?.isLinux || runtime.process?.platform === "linux") {
    return "linux";
  }
  return normalizeString(runtime.process?.platform) || "unknown";
}

function resolveHomeDir() {
  return (
    readEnv("HOME") ||
    readEnv("USERPROFILE") ||
    `${readEnv("HOMEDRIVE")}${readEnv("HOMEPATH")}`
  );
}

function resolveLocalAppDataDir() {
  return (
    readEnv("LOCALAPPDATA") || joinPath(resolveHomeDir(), "AppData", "Local")
  );
}

function resolveWellKnownProfileRoot() {
  const platform = resolvePlatform();
  if (platform === "win32") {
    return joinPath(resolveLocalAppDataDir(), "zotero-agents");
  }
  const home = resolveHomeDir();
  if (platform === "darwin") {
    return joinPath(home, "Library", "Application Support", "zotero-agents");
  }
  const xdgDataHome = readEnv("XDG_DATA_HOME");
  return joinPath(
    xdgDataHome || joinPath(home, ".local", "share"),
    "zotero-agents",
  );
}

export function resolveHostBridgeWellKnownProfilePath() {
  return joinPath(resolveWellKnownProfileRoot(), "bridge-profile.json");
}

let pendingProfileWrite: Promise<unknown> = Promise.resolve();

export async function writeHostBridgeWellKnownProfile(args: {
  endpoint: string;
  token: string;
  updatedAt?: string;
}) {
  const endpoint = normalizeString(args.endpoint);
  const token = normalizeString(args.token);
  if (!endpoint || !token) {
    return {
      ok: false as const,
      path: "",
      permissionProtected: false,
      reason: "missing_endpoint_or_token",
    };
  }

  const path = resolveHostBridgeWellKnownProfilePath();
  const profile: HostBridgeWellKnownProfile = {
    schema: "zotero-bridge.profile.v1",
    protocol: HOST_BRIDGE_PROTOCOL_VERSION,
    endpoint,
    connectionMode: "local",
    auth: {
      type: "bearer",
      token,
    },
    source: "well-known",
    updatedAt: args.updatedAt || new Date().toISOString(),
  };

  const write = pendingProfileWrite
    .catch(() => undefined)
    .then(async () => {
      await replacePrivateRuntimeTextFileAtomically(
        path,
        `${JSON.stringify(profile, null, 2)}\n`,
      );
      return { ok: true as const, path, permissionProtected: true };
    });
  pendingProfileWrite = write;
  return write;
}

export const hostBridgeProfileStoreInternalsForTests = {
  resolvePlatform,
  resolveHomeDir,
  resolveLocalAppDataDir,
  resolveWellKnownProfileRoot,
};

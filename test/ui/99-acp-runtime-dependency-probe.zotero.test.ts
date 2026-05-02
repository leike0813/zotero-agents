import { assert } from "chai";
import { defaultAcpRuntimeDependencyProbe } from "../../src/modules/acpRuntimeDependencyWrapper";

function hasZoteroInternalSubprocessRuntime() {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          subprocess?: unknown;
        };
      };
    };
  };
  return typeof runtime.Zotero?.Utilities?.Internal?.subprocess === "function";
}

function hasMozillaSubprocessRuntime() {
  const runtime = globalThis as {
    ChromeUtils?: {
      import?: (url: string) => { Subprocess?: { call?: unknown } };
    };
  };
  if (typeof runtime.ChromeUtils?.import !== "function") {
    return false;
  }
  try {
    const imported = runtime.ChromeUtils.import(
      "resource://gre/modules/Subprocess.jsm",
    );
    return typeof imported?.Subprocess?.call === "function";
  } catch {
    return false;
  }
}

function hasZoteroProbeRuntime() {
  return hasZoteroInternalSubprocessRuntime() || hasMozillaSubprocessRuntime();
}

function describeVisibleHostCapabilities() {
  const runtime = globalThis as {
    ChromeUtils?: {
      import?: unknown;
    };
    Zotero?: {
      Utilities?: {
        Internal?: Record<string, unknown>;
      };
      getTempDirectory?: unknown;
    };
  };
  return JSON.stringify({
    hasChromeUtils: !!runtime.ChromeUtils,
    chromeUtilsType: typeof runtime.ChromeUtils,
    chromeUtilsImportType: typeof runtime.ChromeUtils?.import,
    hasMozillaSubprocessRuntime: hasMozillaSubprocessRuntime(),
    hasZotero: !!runtime.Zotero,
    hasGetTempDirectory: typeof runtime.Zotero?.getTempDirectory,
    hasUtilitiesInternal: !!runtime.Zotero?.Utilities?.Internal,
    utilityInternalKeys: runtime.Zotero?.Utilities?.Internal
      ? Object.keys(runtime.Zotero.Utilities.Internal).slice(0, 50)
      : [],
    subprocessType: typeof runtime.Zotero?.Utilities?.Internal?.subprocess,
  });
}

function getZoteroTempDirectoryPath() {
  const runtime = globalThis as {
    Zotero?: {
      getTempDirectory?: () => { path?: string };
    };
  };
  const path = String(runtime.Zotero?.getTempDirectory?.().path || "").trim();
  if (!path) {
    throw new Error("Zotero temp directory is unavailable");
  }
  return path;
}

describe("ACP runtime dependency probe in Zotero", function () {
  const itZoteroProbeRuntime = hasZoteroProbeRuntime() ? it : it.skip;

  itZoteroProbeRuntime(
    "runs the uv dependency probe through Zotero Subprocess",
    async function () {
      assert.equal(
        hasZoteroProbeRuntime(),
        true,
        describeVisibleHostCapabilities(),
      );
      this.timeout(180000);
      const result = await defaultAcpRuntimeDependencyProbe({
        dependencies: ["pandas"],
        cwd: getZoteroTempDirectoryPath(),
        env: {},
        timeoutMs: 120000,
      });
      assert.equal(result.ok, true, result.summary || "uv probe failed");
    },
  );
});

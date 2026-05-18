import { assert } from "chai";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
  resolveAddonName,
  resolveAddonRef,
  resolveRuntimeAddon,
  resolveRuntimeAlert,
  resolveRuntimeConsole,
  resolveRuntimeHostCapabilities,
  resolveRuntimeToolkit,
  resolveRuntimeZoteroDetails,
  resolveRuntimeZotero,
  resolveToolkitMember,
} from "../../src/utils/runtimeBridge";

describe("runtime bridge", function () {
  beforeEach(function () {
    resetRuntimeBridgeOverrideForTests();
  });

  afterEach(function () {
    resetRuntimeBridgeOverrideForTests();
  });

  it("resolves addon/toolkit capabilities from injected override", function () {
    const dialogCtor = function MockDialog() {} as unknown as new (
      rows: number,
      columns: number,
    ) => unknown;
    const progressCtor = function MockProgress() {} as unknown as new (
      title: string,
    ) => unknown;

    installRuntimeBridgeOverrideForTests({
      addon: {
        data: {
          config: {
            addonName: "Runtime Bridge Addon",
            addonRef: "runtime-bridge",
          },
          ztoolkit: {
            Dialog: dialogCtor,
            ProgressWindow: progressCtor,
          },
        },
      },
      ztoolkit: {
        Dialog: dialogCtor,
        ProgressWindow: progressCtor,
      },
    });

    assert.equal(resolveAddonName("fallback"), "Runtime Bridge Addon");
    assert.equal(resolveAddonRef("fallback"), "runtime-bridge");
    assert.strictEqual(resolveToolkitMember("Dialog"), dialogCtor);
    assert.strictEqual(resolveToolkitMember("ProgressWindow"), progressCtor);
  });

  it("supports forcing unavailable capability path via explicit undefined override", function () {
    installRuntimeBridgeOverrideForTests({
      addon: undefined,
      ztoolkit: undefined,
    });

    assert.isUndefined(resolveRuntimeAddon());
    assert.isUndefined(resolveRuntimeToolkit());
    assert.equal(resolveAddonName("fallback"), "fallback");
    assert.equal(resolveAddonRef("fallback"), "fallback");
    assert.isUndefined(resolveToolkitMember("Dialog"));
  });

  it("resolves host capabilities from unified runtime resolvers", function () {
    installRuntimeBridgeOverrideForTests({
      addon: {
        data: {
          config: {
            addonName: "Unified Host Addon",
          },
        },
      },
    });

    const hostCapabilities = resolveRuntimeHostCapabilities();
    assert.strictEqual(hostCapabilities.zotero, resolveRuntimeZotero());
    assert.isFunction(hostCapabilities.zotero?.Items?.get);
    assert.isFunction(hostCapabilities.zotero?.Prefs?.get);
    assert.isFunction(hostCapabilities.zotero?.Prefs?.set);
    assert.isFunction(hostCapabilities.zotero?.File?.pathToFile);
    assert.equal(
      hostCapabilities.addon?.data?.config?.addonName,
      "Unified Host Addon",
    );
  });

  it("prefers the most complete Zotero candidate by shape", function () {
    const previousZotero = (globalThis as Record<string, unknown>).Zotero;
    try {
      (globalThis as Record<string, unknown>).Zotero = {
        Items: {
          get() {
            return null;
          },
        },
        Prefs: {
          get() {
            return "";
          },
          set() {
            return undefined;
          },
        },
        File: {
          pathToFile(path: string) {
            return path;
          },
        },
      };
      installRuntimeBridgeOverrideForTests({
        zotero: {
          File: {
            pathToFile(path: string) {
              return path;
            },
          },
        } as any,
      });

      const details = resolveRuntimeZoteroDetails();
      assert.equal(details.source, "global-var");
      assert.equal(details.shape.hasItems, true);
      assert.equal(details.shape.hasPrefs, true);
      assert.strictEqual(resolveRuntimeZotero(), (globalThis as any).Zotero);
    } finally {
      (globalThis as Record<string, unknown>).Zotero = previousZotero;
    }
  });

  it("does not inject null console into host capabilities", function () {
    const runtimeConsole = resolveRuntimeConsole();
    const hostCapabilities = resolveRuntimeHostCapabilities();
    assert.notStrictEqual(runtimeConsole, null);
    assert.notStrictEqual(hostCapabilities.console, null);
  });

  it("does not require hiddenDOMWindow during startup capability resolution", function () {
    const runtime = globalThis as typeof globalThis & {
      Services?: unknown;
    };
    const previousServices = Object.getOwnPropertyDescriptor(runtime, "Services");
    try {
      Object.defineProperty(runtime, "Services", {
        configurable: true,
        writable: true,
        value: {
          appShell: Object.defineProperty({}, "hiddenDOMWindow", {
            configurable: true,
            get() {
              throw new Error("hiddenDOMWindow unavailable during startup");
            },
          }),
        },
      });

      const runtimeConsole = resolveRuntimeConsole();
      const hostCapabilities = resolveRuntimeHostCapabilities();
      assert.notStrictEqual(runtimeConsole, null);
      assert.notStrictEqual(hostCapabilities.console, null);
    } finally {
      if (previousServices) {
        Object.defineProperty(runtime, "Services", previousServices);
      } else {
        delete runtime.Services;
      }
    }
  });

  it("resolves alert capability with window -> toolkit -> global fallback order", function () {
    const calls: string[] = [];
    const previousGlobalAlert = (globalThis as { alert?: (message: string) => void })
      .alert;

    try {
      installRuntimeBridgeOverrideForTests({
        ztoolkit: {
          getGlobal: (name: string) =>
            name === "alert"
              ? (message: string) => calls.push(`toolkit:${message}`)
              : undefined,
        },
      });

      const windowAlert = resolveRuntimeAlert({
        alert: (message: string) => calls.push(`window:${message}`),
      });
      windowAlert?.("a");

      const toolkitAlert = resolveRuntimeAlert();
      toolkitAlert?.("b");

      installRuntimeBridgeOverrideForTests({
        addon: undefined,
        ztoolkit: undefined,
      });
      (globalThis as { alert?: (message: string) => void }).alert = (
        message: string,
      ) => calls.push(`global:${message}`);
      const globalAlert = resolveRuntimeAlert();
      globalAlert?.("c");
    } finally {
      (globalThis as { alert?: (message: string) => void }).alert =
        previousGlobalAlert;
    }

    assert.deepEqual(calls, ["window:a", "toolkit:b", "global:c"]);
  });
});

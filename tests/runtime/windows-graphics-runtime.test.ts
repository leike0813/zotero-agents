import { assert } from "chai";
import { ensureWindowsD3D11Lifetime } from "../../src/platform/windowsGraphicsRuntime";

function replaceGlobal(key: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, {
    configurable: true,
    enumerable: descriptor?.enumerable ?? true,
    writable: true,
    value,
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  };
}

function installRuntime(args: {
  platform: "win32" | "linux";
  ctypes?: unknown;
}) {
  const restoreZotero = replaceGlobal("Zotero", {
    isWin: args.platform === "win32",
    isLinux: args.platform === "linux",
  });
  const restoreChromeUtils = replaceGlobal(
    "ChromeUtils",
    args.ctypes === undefined
      ? undefined
      : {
          importESModule: (url: string) => {
            assert.equal(url, "resource://gre/modules/ctypes.sys.mjs");
            return { ctypes: args.ctypes };
          },
        },
  );
  return () => {
    restoreChromeUtils();
    restoreZotero();
  };
}

function createCtypesMock(
  options: { failLoad?: boolean; failPin?: boolean } = {},
) {
  const abi = Symbol("winapi_abi");
  const int32 = Symbol("int32_t");
  const uint32 = Symbol("uint32_t");
  const jscharPtr = Symbol("jschar.ptr");
  const voidptrPtr = Symbol("voidptr_t.ptr");
  const moduleHandle = { value: "d3d11-module" };
  const model = {
    ordinaryRefs: 0,
    externalRefs: 1,
    pinned: false,
    loaded: true,
    openLibraries: 0,
    closedLibraries: 0,
    declarations: new Map<string, unknown[]>(),
    loadArguments: [] as unknown[],
    pinArguments: [] as unknown[],
    moduleHandle,
    failPin: options.failPin === true,
  };

  const voidptrType = Object.assign(
    (value?: unknown) => ({
      value: value ?? null,
      address() {
        return this;
      },
      isNull() {
        return this.value === null;
      },
    }),
    { ptr: voidptrPtr },
  );
  Object.assign(moduleHandle, {
    address() {
      return this;
    },
    isNull() {
      return false;
    },
  });
  const ctypes = {
    winapi_abi: abi,
    int32_t: int32,
    uint32_t: uint32,
    jschar: {
      ptr: jscharPtr,
      array: () => (value: string) => ({ value }),
    },
    voidptr_t: voidptrType,
    open(name: string) {
      assert.equal(name, "kernel32.dll");
      model.openLibraries += 1;
      return {
        declare(
          symbolName: string,
          callingConvention: unknown,
          returnType: unknown,
          ...argumentTypes: unknown[]
        ) {
          model.declarations.set(symbolName, [
            callingConvention,
            returnType,
            ...argumentTypes,
          ]);
          if (symbolName === "LoadLibraryExW") {
            return (path: unknown, file: unknown, flags: number) => {
              model.loadArguments = [path, file, flags];
              if (options.failLoad) return voidptrType();
              model.ordinaryRefs += 1;
              model.loaded = true;
              return moduleHandle;
            };
          }
          if (symbolName === "GetModuleHandleExW") {
            return (
              flags: number,
              address: unknown,
              output: { value: unknown },
            ) => {
              model.pinArguments = [flags, address, output];
              if (model.failPin) return 0;
              model.pinned = true;
              output.value = moduleHandle;
              return 1;
            };
          }
          if (symbolName === "FreeLibrary") {
            return () => {
              model.ordinaryRefs -= 1;
              model.loaded = model.pinned || model.externalRefs > 0;
              return 1;
            };
          }
          throw new Error(`unexpected native symbol: ${symbolName}`);
        },
        close() {
          model.closedLibraries += 1;
        },
      };
    },
  };

  return { ctypes, model, abi, int32, uint32, jscharPtr, voidptrPtr };
}

describe("Windows graphics runtime lifetime", function () {
  let restoreGlobals = () => {};

  afterEach(function () {
    restoreGlobals();
    restoreGlobals = () => {};
  });

  it("pins d3d11 for the process and releases each temporary FFI reference", function () {
    const native = createCtypesMock();
    restoreGlobals = installRuntime({
      platform: "win32",
      ctypes: native.ctypes,
    });

    ensureWindowsD3D11Lifetime();
    native.model.externalRefs = 0;
    native.model.loaded = native.model.pinned || native.model.ordinaryRefs > 0;

    assert.isTrue(native.model.pinned);
    assert.isTrue(native.model.loaded);
    assert.equal(native.model.ordinaryRefs, 0);
    assert.equal(native.model.openLibraries, native.model.closedLibraries);
    assert.equal(
      (native.model.loadArguments[0] as { value: string }).value,
      "d3d11.dll",
    );
    assert.isTrue(
      (native.model.loadArguments[1] as { isNull(): boolean }).isNull(),
    );
    assert.equal(native.model.loadArguments[2], 0x800);
    assert.equal(native.model.pinArguments[0], 0x5);
    assert.equal(
      (native.model.pinArguments[1] as { value: unknown }).value,
      native.model.moduleHandle.value,
    );
    assert.equal(
      (native.model.pinArguments[2] as { value: unknown }).value,
      native.model.moduleHandle,
    );

    ensureWindowsD3D11Lifetime();
    assert.isTrue(native.model.loaded);
    assert.equal(native.model.ordinaryRefs, 0);
    assert.equal(native.model.openLibraries, native.model.closedLibraries);

    assert.deepEqual(native.model.declarations.get("LoadLibraryExW"), [
      native.abi,
      native.ctypes.voidptr_t,
      native.jscharPtr,
      native.ctypes.voidptr_t,
      native.uint32,
    ]);
    assert.deepEqual(native.model.declarations.get("GetModuleHandleExW"), [
      native.abi,
      native.int32,
      native.uint32,
      native.ctypes.voidptr_t,
      native.voidptrPtr,
    ]);
    assert.deepEqual(native.model.declarations.get("FreeLibrary"), [
      native.abi,
      native.int32,
      native.ctypes.voidptr_t,
    ]);
  });

  it("does not touch ctypes outside Windows or Gecko", function () {
    const native = createCtypesMock();
    restoreGlobals = installRuntime({
      platform: "linux",
      ctypes: native.ctypes,
    });
    ensureWindowsD3D11Lifetime();
    assert.equal(native.model.openLibraries, 0);

    restoreGlobals();
    restoreGlobals = installRuntime({ platform: "win32" });
    ensureWindowsD3D11Lifetime();
    assert.equal(native.model.openLibraries, 0);
  });

  it("cleans native references after a failed pin and can retry", function () {
    const native = createCtypesMock({ failPin: true });
    restoreGlobals = installRuntime({
      platform: "win32",
      ctypes: native.ctypes,
    });

    assert.throws(() => ensureWindowsD3D11Lifetime());
    assert.equal(native.model.ordinaryRefs, 0);
    assert.equal(native.model.openLibraries, native.model.closedLibraries);
    assert.isFalse(native.model.pinned);

    native.model.failPin = false;
    ensureWindowsD3D11Lifetime();
    assert.isTrue(native.model.pinned);
    assert.equal(native.model.ordinaryRefs, 0);
    assert.equal(native.model.openLibraries, native.model.closedLibraries);
  });

  it("throws and closes the FFI library when the system DLL cannot be loaded", function () {
    const native = createCtypesMock({ failLoad: true });
    restoreGlobals = installRuntime({
      platform: "win32",
      ctypes: native.ctypes,
    });

    assert.throws(() => ensureWindowsD3D11Lifetime());
    assert.equal(native.model.ordinaryRefs, 0);
    assert.equal(native.model.openLibraries, native.model.closedLibraries);
  });
});

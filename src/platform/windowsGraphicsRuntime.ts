import { detectRuntimePlatform } from "./runtimePlatform";

const LOAD_LIBRARY_SEARCH_SYSTEM32 = 0x800;
const GET_MODULE_HANDLE_EX_FLAG_PIN = 0x1;
const GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS = 0x4;

type NativePointer = {
  isNull(): boolean;
  address(): unknown;
};

type GeckoCtypes = {
  winapi_abi: unknown;
  int32_t: unknown;
  uint32_t: unknown;
  voidptr_t: {
    (): NativePointer;
    ptr: unknown;
  };
  jschar: {
    array(): (value: string) => unknown;
    ptr: unknown;
  };
  open(name: string): {
    declare(
      name: string,
      abi: unknown,
      returnType: unknown,
      ...argumentTypes: unknown[]
    ): unknown;
    close(): void;
  };
};

// OS pinning keeps the DLL code image until process exit, including across
// plugin reloads; context/GPU resources still follow their normal cleanup.
export function ensureWindowsD3D11Lifetime(): void {
  if (detectRuntimePlatform() !== "win32") {
    return;
  }

  const runtime = globalThis as {
    ChromeUtils?: {
      importESModule?: (url: string) => { ctypes?: GeckoCtypes };
    };
  };
  const importESModule = runtime.ChromeUtils?.importESModule;
  if (typeof importESModule !== "function") {
    return;
  }

  const ctypes = importESModule.call(
    runtime.ChromeUtils,
    "resource://gre/modules/ctypes.sys.mjs",
  ).ctypes;
  if (!ctypes) {
    throw new Error("Gecko ctypes module is unavailable");
  }

  const library = ctypes.open("kernel32.dll");
  let module: NativePointer | undefined;
  let freeLibrary: ((handle: NativePointer) => number) | undefined;
  let failure: unknown;

  try {
    const loadLibraryExW = library.declare(
      "LoadLibraryExW",
      ctypes.winapi_abi,
      ctypes.voidptr_t,
      ctypes.jschar.ptr,
      ctypes.voidptr_t,
      ctypes.uint32_t,
    ) as (path: unknown, file: NativePointer, flags: number) => NativePointer;
    const getModuleHandleExW = library.declare(
      "GetModuleHandleExW",
      ctypes.winapi_abi,
      ctypes.int32_t,
      ctypes.uint32_t,
      ctypes.voidptr_t,
      ctypes.voidptr_t.ptr,
    ) as (flags: number, address: NativePointer, output: unknown) => number;
    freeLibrary = library.declare(
      "FreeLibrary",
      ctypes.winapi_abi,
      ctypes.int32_t,
      ctypes.voidptr_t,
    ) as (handle: NativePointer) => number;

    const loadedModule = loadLibraryExW(
      ctypes.jschar.array()("d3d11.dll"),
      ctypes.voidptr_t(),
      LOAD_LIBRARY_SEARCH_SYSTEM32,
    );
    if (loadedModule.isNull()) {
      throw new Error("LoadLibraryExW failed to load d3d11.dll");
    }
    module = loadedModule;

    const pinnedModule = ctypes.voidptr_t();
    if (
      getModuleHandleExW(
        GET_MODULE_HANDLE_EX_FLAG_PIN | GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS,
        module,
        pinnedModule.address(),
      ) === 0
    ) {
      throw new Error("GetModuleHandleExW failed to pin d3d11.dll");
    }
  } catch (error) {
    failure = error;
  } finally {
    if (module && freeLibrary) {
      try {
        if (freeLibrary(module) === 0) {
          failure ??= new Error("FreeLibrary failed to release d3d11.dll");
        }
      } catch (error) {
        failure ??= error;
      }
    }
    try {
      library.close();
    } catch (error) {
      failure ??= error;
    }
  }

  if (failure !== undefined) {
    throw failure;
  }
}

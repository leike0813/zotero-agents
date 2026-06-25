type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type MozillaSubprocessModule = {
  pathSearch?: (command: string) => Promise<string | null>;
  call?: (args: {
    command: string;
    arguments?: string[];
    environment?: Record<string, string>;
    environmentAppend?: boolean;
    workdir?: string;
  }) => Promise<{
    stdin?: {
      write?: (data: string) => Promise<void>;
      close?: () => Promise<void>;
    };
    stdout?: {
      readString?: () => Promise<string>;
    };
    stderr?: {
      readString?: () => Promise<string>;
    };
    wait?: () => Promise<unknown>;
    exitCode?: unknown;
    exitValue?: unknown;
    kill?: (timeout?: number) => void;
  }>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export async function delay(ms: number) {
  const wait = Math.max(0, Math.floor(Number(ms) || 0));
  if (wait <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, wait));
}

export async function yieldToEventLoop() {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

function extractSubprocess(value: unknown) {
  const record =
    value && typeof value === "object"
      ? (value as { Subprocess?: unknown })
      : null;
  return (record?.Subprocess || null) as MozillaSubprocessModule | null;
}

export function getMozillaSubprocessModule() {
  const runtime = globalThis as {
    ChromeUtils?: {
      importESModule?: (url: string) => unknown;
      import?: (url: string) => unknown;
    };
  };

  const importESModule = runtime.ChromeUtils?.importESModule;
  if (typeof importESModule === "function") {
    for (const specifier of [
      "resource://gre/modules/Subprocess.sys.mjs",
      "resource://gre/modules/Subprocess.mjs",
    ]) {
      try {
        const imported = importESModule(specifier);
        const subprocess = extractSubprocess(imported);
        if (subprocess) {
          return subprocess;
        }
      } catch {
        // Try the next runtime-specific module shape.
      }
    }
  }

  const legacyImport = runtime.ChromeUtils?.import;
  if (typeof legacyImport === "function") {
    try {
      return extractSubprocess(
        legacyImport("resource://gre/modules/Subprocess.jsm"),
      );
    } catch {
      return null;
    }
  }
  return null;
}

export async function runtimeFileExists(pathRaw: string) {
  const targetPath = normalizeString(pathRaw);
  if (!targetPath) {
    return false;
  }
  const runtime = globalThis as {
    IOUtils?: {
      exists?: (path: string) => Promise<boolean>;
      stat?: (path: string) => Promise<unknown>;
    };
    Zotero?: {
      File?: {
        pathToFile?: (path: string) => { exists?: () => boolean };
      };
    };
    OS?: { File?: { exists?: (path: string) => Promise<boolean> } };
  };

  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      return await runtime.IOUtils.exists(targetPath);
    } catch {
      return false;
    }
  }
  if (typeof runtime.IOUtils?.stat === "function") {
    try {
      await runtime.IOUtils.stat(targetPath);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const file = runtime.Zotero?.File?.pathToFile?.(targetPath);
    if (file && typeof file.exists === "function") {
      return file.exists();
    }
  } catch {
    // Continue to older and node fallbacks.
  }
  if (typeof runtime.OS?.File?.exists === "function") {
    try {
      return await runtime.OS.File.exists(targetPath);
    } catch {
      return false;
    }
  }
  const fs = await tryNodeFs();
  if (fs) {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function tryNodeFs() {
  const runtime = globalThis as { process?: unknown };
  if (!runtime.process) {
    return null;
  }
  try {
    return await dynamicImport("fs/promises");
  } catch {
    return null;
  }
}

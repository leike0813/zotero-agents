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

export type MozillaRuntimeModuleProbeResult = {
  specifier: string;
  imported?: unknown;
  error?: unknown;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function shouldPreferImportESModule(specifier: string) {
  return /\.(?:sys\.)?mjs$/i.test(specifier);
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

export function probeMozillaRuntimeModules(args: {
  specifiers: string[];
  useESModule?: (specifier: string) => boolean;
}): MozillaRuntimeModuleProbeResult[] {
  const runtime = globalThis as {
    ChromeUtils?: {
      importESModule?: (url: string) => unknown;
      import?: (url: string) => unknown;
    };
  };
  const results: MozillaRuntimeModuleProbeResult[] = [];
  for (const specifierRaw of args.specifiers) {
    const specifier = normalizeString(specifierRaw);
    if (!specifier) {
      continue;
    }
    try {
      const shouldUseESModule =
        args.useESModule?.(specifier) === true ||
        shouldPreferImportESModule(specifier);
      const imported =
        shouldUseESModule &&
        typeof runtime.ChromeUtils?.importESModule === "function"
          ? runtime.ChromeUtils.importESModule(specifier)
          : typeof runtime.ChromeUtils?.import === "function"
            ? runtime.ChromeUtils.import(specifier)
            : null;
      results.push({ specifier, imported });
    } catch (error) {
      results.push({ specifier, error });
    }
  }
  return results;
}

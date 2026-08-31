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

import { joinPath } from "../../src/utils/path";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type DiagnosticsRuntime = typeof globalThis & {
  Services?: { env?: { get?: (key: string) => string } };
  PathUtils?: { tempDir?: string };
  IOUtils?: {
    makeDirectory?: (
      path: string,
      options?: { createAncestors?: boolean },
    ) => Promise<void>;
    writeUTF8?: (path: string, content: string) => Promise<void>;
  };
  process?: { cwd?: () => string; env?: Record<string, string | undefined> };
};

function getRuntime() {
  return globalThis as DiagnosticsRuntime;
}

export function normalizeDiagnosticsString(value: unknown) {
  return String(value || "").trim();
}

export function readDiagnosticsEnv(name: string) {
  const runtime = getRuntime();
  const fromProcess = runtime.process?.env?.[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }
  if (typeof runtime.Services?.env?.get === "function") {
    try {
      const fromServices = runtime.Services.env.get(name);
      if (typeof fromServices === "string" && fromServices.trim()) {
        return fromServices.trim();
      }
    } catch {
      // ignore env lookup failures
    }
  }
  return "";
}

export async function ensureDiagnosticsDirectory(targetPath: string) {
  const runtime = getRuntime();
  if (typeof runtime.IOUtils?.makeDirectory === "function") {
    await runtime.IOUtils.makeDirectory(targetPath, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(targetPath, { recursive: true });
}

export async function writeDiagnosticsText(
  targetPath: string,
  content: string,
) {
  const runtime = getRuntime();
  if (typeof runtime.IOUtils?.writeUTF8 === "function") {
    await runtime.IOUtils.writeUTF8(targetPath, content);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(targetPath, content, "utf8");
}

export function resolveDefaultTestDiagnosticsDirectory() {
  const runtime = getRuntime();
  const cwd = runtime.process?.cwd?.();
  if (typeof cwd === "string" && cwd.trim()) {
    return joinPath(cwd, "artifact", "test-diagnostics");
  }
  const tempDir = normalizeDiagnosticsString(runtime.PathUtils?.tempDir);
  if (tempDir) {
    return joinPath(tempDir, "zotero-skills-test-diagnostics");
  }
  return joinPath("artifact", "test-diagnostics");
}

export function resolveDefaultTestDiagnosticsOutputPath(args: {
  envName: string;
  prefix: string;
}) {
  const explicit = readDiagnosticsEnv(args.envName);
  if (explicit) {
    return explicit;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return joinPath(
    resolveDefaultTestDiagnosticsDirectory(),
    `${args.prefix}-${stamp}.json`,
  );
}

import { builtinModules } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const prototypeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dependencyRoot = process.env.OMP_PROTOTYPE_DEPS;
const outputRoot = process.env.OMP_PROTOTYPE_OUTPUT;
if (!dependencyRoot || !outputRoot) {
  throw new Error("OMP_PROTOTYPE_DEPS and OMP_PROTOTYPE_OUTPUT are required");
}

const nodeModules = join(dependencyRoot, "node_modules");
const esbuildUrl = pathToFileURL(join(nodeModules, "esbuild/lib/main.js")).href;
const { build } = await import(esbuildUrl);
const forbiddenHostImports = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
  "bun",
  "bun:ffi",
  "bun:jsc",
  "bun:sqlite",
  "bun:test",
]);

function strictBoundary(observed) {
  return {
    name: "strict-zotero-runtime-boundary",
    setup(buildApi) {
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        if (
          !forbiddenHostImports.has(args.path) &&
          !args.path.startsWith("node:") &&
          !args.path.startsWith("bun:")
        ) {
          return undefined;
        }
        observed.add(args.path);
        return {
          errors: [
            {
              text: `Firefox115 bundle reached host import ${args.path} from ${args.importer}`,
            },
          ],
        };
      });
    },
  };
}

function mockErrorAdapter() {
  return {
    name: "pi-ai-mock-error-adapter",
    setup(buildApi) {
      buildApi.onLoad(
        { filter: /@oh-my-pi\/pi-ai\/src\/error\/index\.ts$/ },
        () => ({
          contents: `
export class ValidationError extends Error { constructor(message){ super(message); this.name = "ValidationError" } }
export class AbortError extends Error { constructor(message = "Request was aborted"){ super(message); this.name = "AbortError" } }
export class ProviderResponseError extends Error { constructor(message, options = {}){ super(message); this.name = "ProviderResponseError"; this.kind = options.kind ?? "output" } }
export function classifyMessage(){ return 0 }
`,
          loader: "ts",
        }),
      );
    },
  };
}

const surfaces = {
  nativeCore: 'export { Agent } from "@earendil-works/pi-agent-core";',
  catalog:
    'export { getBundledModels, getBundledProviders } from "@oh-my-pi/pi-catalog/models";',
  hybridMock: `
export { Agent } from "@earendil-works/pi-agent-core";
export { createMockModel } from "@oh-my-pi/pi-ai/providers/mock";
export { createOmpPiAiStreamFn } from "./src/ompPiAiStreamAdapter";
`,
  hybridStreamSimple: `
export { Agent } from "@earendil-works/pi-agent-core";
export { streamSimple } from "@oh-my-pi/pi-ai";
export { createOmpPiAiStreamFn } from "./src/ompPiAiStreamAdapter";
`,
  hybridOpenAi: `
export { Agent } from "@earendil-works/pi-agent-core";
export { streamOpenAIResponses } from "@oh-my-pi/pi-ai/providers/openai-responses";
export { getBundledModels } from "@oh-my-pi/pi-catalog/models";
export { createOmpPiAiStreamFn } from "./src/ompPiAiStreamAdapter";
`,
  ompCoreNegativeControl:
    'export { Agent } from "@oh-my-pi/pi-agent-core/agent";',
};

async function inspectSurface(contents, extraPlugins = []) {
  const observed = new Set();
  try {
    await build({
      absWorkingDir: prototypeRoot,
      bundle: true,
      format: "esm",
      legalComments: "none",
      logLevel: "silent",
      nodePaths: [nodeModules],
      platform: "browser",
      plugins: [...extraPlugins, strictBoundary(observed)],
      stdin: { contents, loader: "ts", resolveDir: prototypeRoot },
      target: "firefox115",
      treeShaking: true,
      write: false,
    });
    return { status: "direct", errors: 0, hostImports: [] };
  } catch (error) {
    const errors = Array.isArray(error.errors) ? error.errors : [];
    return {
      status: "unavailable",
      errors: errors.length,
      hostImports: [...observed].sort(),
      textImportErrors: errors.filter((entry) =>
        entry.text.includes('type attribute of "text"'),
      ).length,
    };
  }
}

const surfaceResults = {};
for (const [name, contents] of Object.entries(surfaces)) {
  surfaceResults[name] = await inspectSurface(contents);
}
if (surfaceResults.hybridMock.status === "unavailable") {
  const directFailure = surfaceResults.hybridMock;
  const adapted = await inspectSurface(surfaces.hybridMock, [mockErrorAdapter()]);
  if (adapted.status === "direct") {
    surfaceResults.hybridMock = {
      status: "adapter-required",
      errors: directFailure.errors,
      hostImports: directFailure.hostImports,
      adapters: ["OMP pi-ai mock error barrel"],
    };
  }
}

const observedMain = new Set();
const result = await build({
  absWorkingDir: prototypeRoot,
  banner: {
    js: "Promise.withResolvers ??= function(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};",
  },
  bundle: true,
  entryPoints: ["src/probe.ts"],
  format: "iife",
  globalName: "OmpZoteroPrototype",
  legalComments: "none",
  metafile: true,
  nodePaths: [nodeModules],
  outfile: join(outputRoot, "omp.iife.js"),
  platform: "browser",
  plugins: [mockErrorAdapter(), strictBoundary(observedMain)],
  sourcemap: false,
  target: "firefox115",
  treeShaking: true,
  write: false,
});

await mkdir(outputRoot, { recursive: true });
const output = result.outputFiles[0].contents;
await writeFile(join(outputRoot, "omp.iife.js"), output);
const mainInputs = Object.keys(result.metafile.inputs);
const packageReached = (packageName) =>
  mainInputs.some((path) => path.includes(`/node_modules/${packageName}/`));

async function packageVersion(name) {
  const manifest = JSON.parse(
    await readFile(join(nodeModules, name, "package.json"), "utf8"),
  );
  return manifest.version;
}

const summary = {
  verdict: "no-go",
  versions: {
    nativeCore: await packageVersion("@earendil-works/pi-agent-core"),
    nativeAiAbi: await packageVersion("@earendil-works/pi-ai"),
    ompCoreNegativeControl: await packageVersion("@oh-my-pi/pi-agent-core"),
    ompAi: await packageVersion("@oh-my-pi/pi-ai"),
    ompCatalog: await packageVersion("@oh-my-pi/pi-catalog"),
  },
  bytes: output.byteLength,
  gzipBytes: gzipSync(output).byteLength,
  adapters: [
    "project-owned OMP pi-ai StreamFn bridge",
    "Promise.withResolvers",
    "OMP pi-ai mock error barrel (evidence only)",
  ],
  classifications: {
    direct: ["native pi-agent-core", "pi-catalog/models"],
    adapterRequired: [
      "OMP pi-ai event/message/options ABI",
      "OMP pi-ai/providers/mock (evidence only)",
      "Promise.withResolvers",
      "project-owned models.yml sanitizer",
    ],
    unavailable: [
      "OMP pi-ai streamSimple production dispatcher",
      "OMP pi-ai OpenAI Responses provider",
    ],
  },
  mainBundle: {
    containsNativeCore: packageReached("@earendil-works/pi-agent-core"),
    containsOmpAi: packageReached("@oh-my-pi/pi-ai"),
    containsOmpCore: packageReached("@oh-my-pi/pi-agent-core"),
  },
  reachableHostImports: [...observedMain].sort(),
  surfaces: surfaceResults,
};
await writeFile(
  join(outputRoot, "build-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

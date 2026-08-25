import { builtinModules } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const prototypeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dependencyRoot = process.env.PI_PROTOTYPE_DEPS;
const outputRoot = process.env.PI_PROTOTYPE_OUTPUT;
const zoteroTestOut = process.env.PI_ZOTERO_TEST_OUT;

if (!dependencyRoot || !outputRoot) {
  throw new Error("PI_PROTOTYPE_DEPS and PI_PROTOTYPE_OUTPUT are required");
}

const esbuildEntry = join(
  dependencyRoot,
  "node_modules",
  "esbuild",
  "lib",
  "main.js",
);
const { build } = await import(pathToFileURL(esbuildEntry).href);
const nodeModules = join(dependencyRoot, "node_modules");
const guardedProviderEnvPath = resolve(
  nodeModules,
  "@earendil-works/pi-ai/dist/utils/provider-env.js",
);
const forbiddenBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

function createRuntimeBoundary(includeOpenAi) {
  const guardedNodeImports = [];
  return {
    guardedNodeImports,
    plugin: {
      name: "pi-firefox-runtime-boundary",
      setup(buildApi) {
        if (!includeOpenAi) {
          buildApi.onResolve(
            { filter: /^@earendil-works\/pi-ai\/providers\/openai$/ },
            () => ({ namespace: "excluded-provider", path: "openai" }),
          );
          buildApi.onLoad(
            { filter: /.*/, namespace: "excluded-provider" },
            () => ({
              contents:
                "export function openaiProvider(){throw new Error('OpenAI provider is excluded from the core-only bundle')}\n",
              loader: "js",
            }),
          );
        }
        buildApi.onResolve({ filter: /.*/ }, (args) => {
          if (!forbiddenBuiltins.has(args.path)) return undefined;
          const isGuardedBunFallback =
            args.path === "node:fs" &&
            resolve(args.importer) === guardedProviderEnvPath;
          if (isGuardedBunFallback) {
            guardedNodeImports.push({
              importer: args.importer,
              path: args.path,
            });
            return { namespace: "unreachable-node-guard", path: args.path };
          }
          return {
            errors: [
              {
                text: `Firefox115 bundle reached Node builtin ${args.path} from ${args.importer}`,
              },
            ],
          };
        });
        buildApi.onLoad(
          { filter: /.*/, namespace: "unreachable-node-guard" },
          () => ({
            contents:
              "export function readFileSync(){throw new Error('Browser runtime reached guarded node:fs fallback')}\n",
            loader: "js",
          }),
        );
      },
    },
  };
}

await mkdir(outputRoot, { recursive: true });

async function buildProbe(name, includeOpenAi) {
  const outfile = join(outputRoot, `${name}.iife.js`);
  const runtimeBoundary = createRuntimeBoundary(includeOpenAi);
  const result = await build({
    absWorkingDir: prototypeRoot,
    bundle: true,
    define: {
      __include_openai__: includeOpenAi ? "true" : "false",
      process: "undefined",
    },
    entryPoints: ["src/probe.ts"],
    format: "iife",
    globalName: "PiCompatibilityPrototype",
    legalComments: "none",
    metafile: true,
    nodePaths: [nodeModules],
    outfile,
    platform: "browser",
    plugins: [runtimeBoundary.plugin],
    sourcemap: false,
    target: "firefox115",
    treeShaking: true,
    tsconfigRaw: {
      compilerOptions: { useDefineForClassFields: true },
    },
    write: false,
  });
  const output = result.outputFiles[0].contents;
  await writeFile(outfile, output);
  await writeFile(
    join(outputRoot, `${name}.metafile.json`),
    `${JSON.stringify(result.metafile, null, 2)}\n`,
  );
  return {
    bytes: output.byteLength,
    gzipBytes: gzipSync(output).byteLength,
    guardedNodeImports: runtimeBoundary.guardedNodeImports.map((entry) => ({
      importer: entry.importer.replace(`${dependencyRoot}/node_modules/`, ""),
      path: entry.path,
    })),
    name,
    reachableNodeBuiltins: Object.values(result.metafile.inputs)
      .flatMap((input) => input.imports)
      .filter((entry) => forbiddenBuiltins.has(entry.path))
      .map((entry) => entry.path),
  };
}

const core = await buildProbe("core-faux", false);
const openai = await buildProbe("openai", true);
let zoteroTest;
if (zoteroTestOut) {
  const runtimeBoundary = createRuntimeBoundary(true);
  const result = await build({
    absWorkingDir: prototypeRoot,
    bundle: true,
    define: {
      __include_openai__: "true",
      process: "undefined",
    },
    entryPoints: ["src/zotero-test-entry.ts"],
    format: "esm",
    legalComments: "none",
    metafile: true,
    nodePaths: [nodeModules],
    outfile: zoteroTestOut,
    platform: "browser",
    plugins: [runtimeBoundary.plugin],
    sourcemap: false,
    target: "firefox115",
    treeShaking: true,
    tsconfigRaw: {
      compilerOptions: { useDefineForClassFields: true },
    },
    write: false,
  });
  const output = result.outputFiles[0].contents;
  await mkdir(dirname(zoteroTestOut), { recursive: true });
  await writeFile(zoteroTestOut, output);
  zoteroTest = {
    bytes: output.byteLength,
    guardedNodeImports: runtimeBoundary.guardedNodeImports.map((entry) => ({
      importer: entry.importer.replace(`${dependencyRoot}/node_modules/`, ""),
      path: entry.path,
    })),
  };
}
await writeFile(
  join(outputRoot, "build-summary.json"),
  `${JSON.stringify(
    { core, openai, openaiDeltaBytes: openai.bytes - core.bytes, zoteroTest },
    null,
    2,
  )}\n`,
);

process.stdout.write(
  `${JSON.stringify({ core, openai, zoteroTest }, null, 2)}\n`,
);

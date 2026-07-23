import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { normalizeManifestInputTriggerDefaults } from "../src/workflows/loaderContracts";
import {
  projectWorkflowManifestContract,
  type WorkflowManifestContract,
} from "../src/workflows/manifestContract";
import type {
  WorkflowManifest,
  WorkflowPackageManifest,
} from "../src/workflows/types";

type BuiltinManifest = {
  version: number;
  files: string[];
};

export type BuiltinWorkflowCatalogEntry = {
  packageId: string;
  manifestPath: string;
  manifest: WorkflowManifest;
  contract: WorkflowManifestContract;
};

function readJson<T>(root: string, path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

function normalizedPath(path: string) {
  return path.replaceAll("\\", "/");
}

export function loadBuiltinWorkflowCatalog(
  root: string,
): BuiltinWorkflowCatalogEntry[] {
  const manifestPath = "workflows_builtin/manifest.json";
  const builtin = readJson<BuiltinManifest>(root, manifestPath);
  const shippedFiles = new Set(builtin.files.map(normalizedPath));
  const packagePaths = builtin.files.filter((path) =>
    path.endsWith("/workflow-package.json"),
  );
  const entries: BuiltinWorkflowCatalogEntry[] = [];
  const seenIds = new Set<string>();

  for (const packagePath of packagePaths) {
    const packageManifest = readJson<WorkflowPackageManifest>(
      root,
      join("workflows_builtin", packagePath),
    );
    const packageDirectory = dirname(packagePath);
    for (const workflowPath of packageManifest.workflows) {
      const shippedPath = normalizedPath(join(packageDirectory, workflowPath));
      if (!shippedFiles.has(shippedPath)) {
        throw new Error(
          `${packagePath} declares ${workflowPath}, which is absent from workflows_builtin/manifest.json`,
        );
      }
      const repositoryPath = normalizedPath(
        join("workflows_builtin", shippedPath),
      );
      const manifest = normalizeManifestInputTriggerDefaults(
        readJson<WorkflowManifest>(root, repositoryPath),
      );
      if (manifest.debug_only === true) {
        continue;
      }
      if (seenIds.has(manifest.id)) {
        throw new Error(`Duplicate built-in workflow id ${manifest.id}`);
      }
      seenIds.add(manifest.id);
      entries.push({
        packageId: packageManifest.id,
        manifestPath: relative(root, join(root, repositoryPath)).replaceAll(
          "\\",
          "/",
        ),
        manifest,
        contract: projectWorkflowManifestContract(manifest),
      });
    }
  }
  return entries;
}

function inlineJson(value: unknown) {
  return `\`${JSON.stringify(value)}\``;
}

function renderParameters(manifest: WorkflowManifest) {
  const parameters = Object.entries(manifest.parameters || {});
  if (parameters.length === 0) {
    return ["- Workflow options: none declared."];
  }
  return [
    "- Workflow options:",
    ...parameters.map(
      ([key, schema]) => `  - \`${key}\`: ${inlineJson(schema)}.`,
    ),
  ];
}

export function renderBuiltinWorkflowCatalog(
  template: string,
  entries: BuiltinWorkflowCatalogEntry[],
) {
  const marker = "<!-- zotero-builtin-workflow-catalog:entries -->";
  if (template.split(marker).length !== 2) {
    throw new Error(
      "Workflow catalog template must contain exactly one entry marker",
    );
  }
  const rendered = entries.flatMap(
    ({ packageId, manifestPath, manifest, contract }) => [
      `### \`${manifest.id}\``,
      "",
      `**${manifest.label}**`,
      "",
      manifest.description || "No description is declared.",
      "",
      `- Package: \`${packageId}\`; manifest: \`${manifestPath}\`; core: \`${manifest.display?.core === true}\`.`,
      `- Provider requirements: ${inlineJson(contract.providerRequirements)}.`,
      `- Execution modes: ${inlineJson(contract.executionModes)}.`,
      `- Selection: ${inlineJson(contract.selection)}.`,
      `- Required workflow options: ${inlineJson(contract.requiredWorkflowOptions)}.`,
      ...renderParameters(manifest),
      `- Result evidence: ${inlineJson(contract.resultEvidence)}.`,
      `- Invocation inputs: use workflow id \`${manifest.id}\`, ${contract.selection.acceptsNoSelection ? "the declared no-selection form" : `a validated \`${contract.selection.inputUnit || "item"}\` selection`}, declared workflow options, and a separately validated compatible provider profile when the provider requires one.`,
      "",
    ],
  );
  return template.replace(marker, rendered.join("\n"));
}

import type { AcpSkillInjectionPlan } from "./acpAgentFamilyResolver";
import type {
  AcpSharedSkillCatalog,
  AcpSharedSkillCatalogEntry,
} from "./acpSharedSkillCatalog";
import {
  copyRuntimeDirectory,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";
import {
  insertAcpSkillProxyPatchBlock,
  rewriteAcpSkillReferences,
} from "./acpSkillReferenceRewriter";
import {
  ACP_SKILL_PATCH_TEMPLATES_BY_MODULE,
  loadAcpSkillPatchTemplate,
  renderAcpSkillPatchTemplate,
} from "./acpSkillPatchTemplates";

export type AcpThinProxyMaterializationResult = {
  materializedDirs: string[];
  requestedSkillProxyDirs: string[];
  requestedSkillProxyPath?: string;
  requestedOutputContractDetailsMarkdown?: string;
  proxySkillRoots: string[];
  proxySkillCount: number;
  resourceRewriteWarnings: string[];
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function toPortablePath(path: string) {
  return normalizeString(path).replace(/\\/g, "/");
}

function getPortableDirName(path: string) {
  const portable = toPortablePath(path);
  const index = portable.lastIndexOf("/");
  return index > 0 ? portable.slice(0, index) : "";
}

function resolveFeedbackSidecarPath(resultJsonPath: string) {
  const resultDir = getPortableDirName(resultJsonPath);
  return resultDir
    ? `${resultDir}/_skill_run_feedback.md`
    : "_skill_run_feedback.md";
}

type AcpSkillExecutionMode = "auto" | "interactive";

function normalizeExecutionMode(value: unknown): AcpSkillExecutionMode {
  return normalizeString(value).toLowerCase() === "interactive"
    ? "interactive"
    : "auto";
}

function resolveRelativeOrAbsolutePath(root: string, target: string) {
  const normalized = normalizeString(target);
  if (!normalized) {
    return "";
  }
  return /^[A-Za-z]:[\\/]|^\//.test(normalized)
    ? normalized
    : joinPath(root, normalized);
}

async function resolveOutputSchemaPath(args: {
  runnerJson: Record<string, unknown>;
  skillRoot: string;
}) {
  const schemas = args.runnerJson.schemas;
  const declared =
    schemas && typeof schemas === "object" && !Array.isArray(schemas)
      ? normalizeString((schemas as Record<string, unknown>).output)
      : "";
  const candidates = [declared, "assets/output.schema.json"].filter(
    (entry, index, array) => entry && array.indexOf(entry) === index,
  );
  for (const candidate of candidates) {
    const resolved = resolveRelativeOrAbsolutePath(args.skillRoot, candidate);
    if (resolved && (await runtimePathExists(resolved))) {
      return resolved;
    }
  }
  return declared
    ? resolveRelativeOrAbsolutePath(args.skillRoot, declared)
    : "";
}

function describeJsonSchemaType(schema: Record<string, unknown>) {
  const type = schema.type;
  if (typeof type === "string") {
    return type;
  }
  if (Array.isArray(type)) {
    return type
      .map((entry) => normalizeString(entry))
      .filter(Boolean)
      .join(" | ");
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const")) {
    return `const ${JSON.stringify(schema.const)}`;
  }
  if (Array.isArray(schema.enum)) {
    return `enum ${schema.enum.map((entry) => JSON.stringify(entry)).join(" | ")}`;
  }
  return "any";
}

function describeJsonSchemaDescription(schema: Record<string, unknown>) {
  return (
    normalizeString(schema.description) ||
    normalizeString(schema.title) ||
    (Object.prototype.hasOwnProperty.call(schema, "const")
      ? `Must equal ${JSON.stringify(schema.const)}.`
      : "")
  );
}

function buildSchemaFieldRows(schema: unknown) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return "| `(schema)` | object | yes | Final payload must satisfy the output schema. |";
  }
  const objectSchema = schema as Record<string, unknown>;
  const properties =
    objectSchema.properties &&
    typeof objectSchema.properties === "object" &&
    !Array.isArray(objectSchema.properties)
      ? (objectSchema.properties as Record<string, unknown>)
      : {};
  const required = new Set(
    Array.isArray(objectSchema.required)
      ? objectSchema.required
          .map((entry) => normalizeString(entry))
          .filter(Boolean)
      : [],
  );
  const propertyRows = Object.entries(properties)
    .filter(([name]) => name !== "__SKILL_DONE__")
    .map(([name, value]) => {
      const fieldSchema =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      return `| \`${name}\` | ${describeJsonSchemaType(fieldSchema)} | ${required.has(name) ? "yes" : "no"} | ${describeJsonSchemaDescription(fieldSchema) || "-"} |`;
    });
  return [
    "| `__SKILL_DONE__` | boolean | yes | Set to `true` for the final branch. |",
    ...(propertyRows.length > 0
      ? propertyRows
      : [
          "| `(schema)` | object | yes | Final payload must satisfy the output schema. |",
        ]),
  ].join("\n");
}

function buildExampleFromSchema(schema: unknown) {
  const example: Record<string, unknown> = { __SKILL_DONE__: true };
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return JSON.stringify(example, null, 2);
  }
  const objectSchema = schema as Record<string, unknown>;
  const properties =
    objectSchema.properties &&
    typeof objectSchema.properties === "object" &&
    !Array.isArray(objectSchema.properties)
      ? (objectSchema.properties as Record<string, unknown>)
      : {};
  const required = Array.isArray(objectSchema.required)
    ? objectSchema.required
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    : [];
  for (const name of required) {
    if (name === "__SKILL_DONE__") {
      continue;
    }
    const fieldSchema =
      properties[name] &&
      typeof properties[name] === "object" &&
      !Array.isArray(properties[name])
        ? (properties[name] as Record<string, unknown>)
        : {};
    if (Object.prototype.hasOwnProperty.call(fieldSchema, "const")) {
      example[name] = fieldSchema.const;
    } else if (Array.isArray(fieldSchema.enum) && fieldSchema.enum.length > 0) {
      example[name] = fieldSchema.enum[0];
    } else if (fieldSchema.type === "boolean") {
      example[name] = true;
    } else if (
      fieldSchema.type === "number" ||
      fieldSchema.type === "integer"
    ) {
      example[name] = 0;
    } else if (fieldSchema.type === "array") {
      example[name] = [];
    } else if (fieldSchema.type === "object") {
      example[name] = {};
    } else {
      example[name] = `<${name}>`;
    }
  }
  return JSON.stringify(example, null, 2);
}

async function buildRuntimeEnforcementSection() {
  return loadAcpSkillPatchTemplate(
    ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.runtime_enforcement,
  );
}

async function buildResourceMappingSection(args: {
  entry: AcpSharedSkillCatalogEntry;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  requested: boolean;
}) {
  return renderAcpSkillPatchTemplate({
    template: await loadAcpSkillPatchTemplate(
      ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.resource_mapping,
    ),
    replacements: {
      workspace_dir: toPortablePath(args.workspaceDir),
      catalog_skill_root: toPortablePath(args.entry.catalogSkillRoot),
    },
    requiredPlaceholders: ["workspace_dir", "catalog_skill_root"],
  });
}

async function buildOutputFormatContractSection() {
  return loadAcpSkillPatchTemplate(
    ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.output_format_contract,
  );
}

async function buildOutputContractDetailsSection(args: {
  runnerJson: Record<string, unknown>;
  skillRoot: string;
  executionMode: AcpSkillExecutionMode;
}) {
  let schema: unknown = null;
  let schemaPath = "";
  try {
    schemaPath = await resolveOutputSchemaPath({
      runnerJson: args.runnerJson,
      skillRoot: args.skillRoot,
    });
    if (schemaPath) {
      schema = JSON.parse(await readRuntimeTextFile(schemaPath));
    }
  } catch {
    schema = null;
  }
  const pendingBranchBlock =
    args.executionMode === "interactive"
      ? renderAcpSkillPatchTemplate({
          template: await loadAcpSkillPatchTemplate(
            ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.output_contract_interactive_pending,
          ),
          replacements: {
            kind_values: "open_text | choose_one | confirm | upload_files",
            options_fields: "`label` and `value`",
            files_fields: "`name`, `required`, `hint`, and `accept`",
            pending_example_json: JSON.stringify(
              {
                __SKILL_DONE__: false,
                message: "Please choose how to continue.",
                ui_hints: {
                  kind: "choose_one",
                  prompt: "Continue?",
                  hint: "Select one option.",
                  options: [{ label: "Continue", value: "continue" }],
                  files: [],
                },
              },
              null,
              2,
            ),
          },
          requiredPlaceholders: [
            "kind_values",
            "options_fields",
            "files_fields",
            "pending_example_json",
          ],
        })
      : "";
  return renderAcpSkillPatchTemplate({
    template: await loadAcpSkillPatchTemplate(
      ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.output_contract_details,
    ),
    replacements: {
      field_rows: buildSchemaFieldRows(schema),
      output_schema_path: schemaPath
        ? toPortablePath(schemaPath)
        : "(not declared)",
      example_json: buildExampleFromSchema(schema),
      pending_branch_block: pendingBranchBlock,
    },
    requiredPlaceholders: [
      "field_rows",
      "output_schema_path",
      "example_json",
      "pending_branch_block",
    ],
  });
}

async function buildModePatchSection(executionMode: AcpSkillExecutionMode) {
  return loadAcpSkillPatchTemplate(
    executionMode === "interactive"
      ? ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.mode_interactive
      : ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.mode_auto,
  );
}

async function buildSkillRunFeedbackPatchSection(args: {
  resultJsonPath: string;
}) {
  return renderAcpSkillPatchTemplate({
    template: await loadAcpSkillPatchTemplate(
      ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.skill_run_feedback,
    ),
    replacements: {
      feedback_path: resolveFeedbackSidecarPath(args.resultJsonPath),
    },
    requiredPlaceholders: ["feedback_path"],
  });
}

async function buildPatchBlock(args: {
  entry: AcpSharedSkillCatalogEntry;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  requested: boolean;
  runnerJson: Record<string, unknown>;
  executionMode: AcpSkillExecutionMode;
  collectSkillRunFeedback?: boolean;
}) {
  const outputContractDetails = await buildOutputContractDetailsSection({
    runnerJson: args.runnerJson,
    skillRoot: args.entry.catalogSkillRoot,
    executionMode: args.executionMode,
  });
  const resourceMapping = await buildResourceMappingSection(args);
  const runtimePatch = [
    await buildRuntimeEnforcementSection(),
    await buildOutputFormatContractSection(),
    outputContractDetails,
    await buildModePatchSection(args.executionMode),
    ...(args.collectSkillRunFeedback
      ? [
          await buildSkillRunFeedbackPatchSection({
            resultJsonPath: args.resultJsonPath,
          }),
        ]
      : []),
  ].join("\n\n");
  return {
    headerPatchBlock: [
      "<!-- zotero-skills-acp-thin-proxy:start -->",
      resourceMapping,
      "<!-- zotero-skills-acp-thin-proxy:end -->",
    ].join("\n\n"),
    footerPatchBlock: [
      "<!-- zotero-skills-acp-runtime-patch:start -->",
      runtimePatch,
      "<!-- zotero-skills-acp-runtime-patch:end -->",
    ].join("\n\n"),
    outputContractDetails,
  };
}

function shouldUseFullSnapshot(runnerJson: Record<string, unknown>) {
  if (runnerJson.requiresFullSnapshot === true) {
    return true;
  }
  const acp = runnerJson.acp;
  return !!(
    acp &&
    typeof acp === "object" &&
    !Array.isArray(acp) &&
    (acp as Record<string, unknown>).requiresFullSnapshot === true
  );
}

async function readJsonFile(path: string) {
  try {
    return JSON.parse(await readRuntimeTextFile(path)) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

async function writeProxySkill(args: {
  entry: AcpSharedSkillCatalogEntry;
  targetDir: string;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  requested: boolean;
  executionMode: AcpSkillExecutionMode;
  runnerJson: Record<string, unknown>;
  collectSkillRunFeedback?: boolean;
}) {
  await removeRuntimePath(args.targetDir);
  const original = await readRuntimeTextFile(args.entry.skillMdPath);
  const rewrite = rewriteAcpSkillReferences({
    skillId: args.entry.skillId,
    skillRoot: args.entry.catalogSkillRoot,
    skillMdContent: original,
  });
  const patch = await buildPatchBlock(args);
  const content = insertAcpSkillProxyPatchBlock({
    rewrittenSkillMd: rewrite.content,
    headerPatchBlock: patch.headerPatchBlock,
    footerPatchBlock: patch.footerPatchBlock,
  });
  await writeRuntimeTextFile(joinPath(args.targetDir, "SKILL.md"), content);
  await writeRuntimeTextFile(
    joinPath(args.targetDir, "zotero-skill-proxy.json"),
    JSON.stringify(
      {
        schema: "zotero-skills.acp.thin-proxy-skill.v1",
        skillId: args.entry.skillId,
        sourceKind: args.entry.sourceKind,
        checksum: args.entry.checksum,
        catalogSkillRoot: args.entry.catalogSkillRoot,
        resourceManifest: args.entry.resourceManifest,
        requested: args.requested,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return {
    warnings: rewrite.warnings,
    outputContractDetails: patch.outputContractDetails,
  };
}

async function appendFeedbackPatchToSnapshotSkill(args: {
  targetDir: string;
  resultJsonPath: string;
  collectSkillRunFeedback?: boolean;
}) {
  if (!args.collectSkillRunFeedback) {
    return;
  }
  const skillMdPath = joinPath(args.targetDir, "SKILL.md");
  if (!(await runtimePathExists(skillMdPath))) {
    return;
  }
  const original = await readRuntimeTextFile(skillMdPath);
  const feedbackPatch = await buildSkillRunFeedbackPatchSection({
    resultJsonPath: args.resultJsonPath,
  });
  await writeRuntimeTextFile(
    skillMdPath,
    [
      original.trimEnd(),
      "",
      "<!-- zotero-skills-acp-runtime-patch:start -->",
      feedbackPatch,
      "<!-- zotero-skills-acp-runtime-patch:end -->",
    ].join("\n"),
  );
}

export async function materializeAcpThinProxySkills(args: {
  catalog: AcpSharedSkillCatalog;
  requestedSkillId: string;
  injectionPlan: AcpSkillInjectionPlan;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  executionMode?: string;
  collectSkillRunFeedback?: boolean;
}): Promise<AcpThinProxyMaterializationResult> {
  const materializedDirs: string[] = [];
  const requestedSkillProxyDirs: string[] = [];
  let requestedOutputContractDetailsMarkdown = "";
  const resourceRewriteWarnings: string[] = [];
  const diagnostics: AcpThinProxyMaterializationResult["diagnostics"] = [];
  const executionMode = normalizeExecutionMode(args.executionMode);
  for (const root of args.injectionPlan.skillRoots) {
    for (const entry of args.catalog.entries) {
      const targetDir = joinPath(root, entry.skillId);
      const runnerJson = await readJsonFile(entry.runnerJsonPath);
      const requested = entry.skillId === args.requestedSkillId;
      if (shouldUseFullSnapshot(runnerJson)) {
        await copyRuntimeDirectory({
          sourceDir: entry.catalogSkillRoot,
          targetDir,
        });
        await appendFeedbackPatchToSnapshotSkill({
          targetDir,
          resultJsonPath: args.resultJsonPath,
          collectSkillRunFeedback: args.collectSkillRunFeedback,
        });
        diagnostics.push({
          level: "warning",
          code: "acp_skill_full_snapshot_fallback",
          message: `Skill ${entry.skillId} requested full snapshot fallback.`,
        });
      } else {
        const proxy = await writeProxySkill({
          entry,
          targetDir,
          workspaceDir: args.workspaceDir,
          resultJsonPath: args.resultJsonPath,
          inputManifestPath: args.inputManifestPath,
          requested,
          executionMode,
          runnerJson,
          collectSkillRunFeedback: args.collectSkillRunFeedback,
        });
        resourceRewriteWarnings.push(
          ...proxy.warnings.map((warning) => `${entry.skillId}: ${warning}`),
        );
        if (requested && !requestedOutputContractDetailsMarkdown) {
          requestedOutputContractDetailsMarkdown = proxy.outputContractDetails;
        }
      }
      materializedDirs.push(targetDir);
      if (requested) {
        requestedSkillProxyDirs.push(targetDir);
      }
    }
  }
  diagnostics.push({
    level: "info",
    code: "acp_thin_proxy_skills_materialized",
    message: `Materialized ${materializedDirs.length} ACP thin proxy skill(s) into ${args.injectionPlan.skillRoots.length} root(s).`,
  });
  return {
    materializedDirs,
    requestedSkillProxyDirs,
    requestedSkillProxyPath: requestedSkillProxyDirs[0],
    requestedOutputContractDetailsMarkdown,
    proxySkillRoots: [...args.injectionPlan.skillRoots],
    proxySkillCount: materializedDirs.length,
    resourceRewriteWarnings,
    diagnostics,
  };
}

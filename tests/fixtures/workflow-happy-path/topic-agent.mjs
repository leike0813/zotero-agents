import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const TOPIC_SKILLS = new Set([
  "create-topic-synthesis-prepare",
  "update-topic-synthesis-prepare",
  "topic-synthesis-core-enrichment",
  "topic-synthesis-finalize",
  "topic-planner",
]);
const OWNED_SIDECARS = {
  concept_cards_proposal: "concept-cards-proposal",
  topic_graph_relation_proposals: "topic-graph-relation-proposals",
  topic_interest_metadata: "topic-interest-metadata",
  prospective_topic_relation_proposals: "prospective-topic-relation-proposals",
};
const SOURCE_ARTIFACT_TYPES = [
  "digest",
  "references",
  "citation_analysis",
  "literature_score",
];

export const SEED_TOPIC_ID = "system-e2e:wf:seed-topic";
export const PLANNED_TOPIC_ID = "system-e2e:wf:planned-topic";
const PLANNED_TOPIC_TITLE = "合成规划主题";
const PLANNED_TOPIC_DEFINITION = "用于离线演练的合成规划主题定义。";
const PAPER_PLACEHOLDER = "__PAPER_REF__";
const TOPIC_PLACEHOLDER = "__TOPIC_ID__";
const REPORT_SUPPLEMENT =
  "补充说明：以上内容只描述合成输入、合成判定口径与合成覆盖边界，用于验证离线工作流对主题结构、来源引用和失败恢复的处理；它不陈述真实文献结论，也不替代后续对新增来源的人工复核。覆盖边界按合成候选集的大小固定给出：当来源数量较少时，判定保持 partial，并把缺口写成可补充的方向，而不是把合成条目当作充分证据。";

export function isTopicSkill(skillId) {
  return TOPIC_SKILLS.has(String(skillId || "").trim());
}

function fail(message) {
  throw new Error(`workflow_fixture_${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_missing`);
  }
  return value;
}

function nonEmptyString(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) fail(`${label}_missing`);
  return normalized;
}

function stringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
}

function insideWorkspace(workspace, target) {
  const root = path.resolve(workspace);
  const resolved = path.resolve(target);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    fail("path_outside_workspace");
  }
  return resolved;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(filePath, text, "utf8");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(`${label}_unreadable`);
  }
}

function readFileText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    fail("handoff_artifact_unreadable");
  }
}

function workspacePaths(workspace) {
  const root = path.resolve(workspace);
  const runtime = path.join(root, "runtime");
  return {
    root,
    runtime,
    payloads: path.join(runtime, "payloads"),
    handoff: path.join(runtime, "handoff"),
    db: path.join(runtime, "topic-synthesis.sqlite"),
    result: path.join(root, "result"),
    sections: path.join(root, "result", "sections"),
    sidecars: path.join(root, "result", "sidecars"),
  };
}

function writeState(dbPath, state) {
  const db = new DatabaseSync(dbPath);
  db.exec(
    "create table if not exists topic_fixture_state (singleton integer primary key check (singleton = 1), payload text not null)",
  );
  db.prepare(
    "insert into topic_fixture_state (singleton, payload) values (1, ?) on conflict(singleton) do update set payload = excluded.payload",
  ).run(JSON.stringify(state));
  db.close();
}

function readState(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db
      .prepare("select payload from topic_fixture_state where singleton = 1")
      .get();
    if (!row?.payload) fail("topic_state_missing");
    return JSON.parse(String(row.payload));
  } finally {
    db.close();
  }
}

function envRefs(env) {
  let value;
  try {
    value = JSON.parse(String(env.ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS || ""));
  } catch {
    fail("paper_refs_env_invalid");
  }
  const refs = stringList(value);
  if (!refs.length) fail("paper_refs_env_missing");
  return refs;
}

function uniqueRefs(papers) {
  return [
    ...new Set(
      papers
        .map((paper) => String(paper?.paper_ref || "").trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeArtifacts(refs, rows) {
  const known = new Set(refs);
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && known.has(String(row.paper_ref || "")))
    .map((row) => {
      const hash = String(row.hash || row.payload_hash || "").trim();
      return {
        paper_ref: String(row.paper_ref),
        artifact_type: String(row.artifact_type || ""),
        payload_type: String(row.payload_type || ""),
        status: String(row.status || ""),
        ...(hash ? { hash } : {}),
      };
    });
}

function readHandoffManifest(workspace, manifestPath) {
  const resolved = insideWorkspace(workspace, manifestPath);
  const manifest = requireObject(
    readJson(resolved, "handoff_manifest"),
    "handoff_manifest",
  );
  const entries = {};
  for (const [key, value] of Object.entries(manifest)) {
    if (typeof value !== "string" || !value.trim()) {
      fail("handoff_manifest_path_invalid");
    }
    entries[key] = insideWorkspace(workspace, value);
    readFileText(entries[key]);
  }
  if (!entries.db_path) fail("handoff_manifest_db_missing");
  return entries;
}

function requireOperation(input, parameter, expected) {
  const operation = String(input?.operation || parameter?.operation || "").trim();
  if (operation && operation !== expected) {
    fail("operation_unreviewed");
  }
}

function topicDefinitionFromSnapshot(snapshot, template) {
  const definition = requireObject(
    snapshot?.topic_definition,
    "planned_topic_definition",
  );
  const topicId = nonEmptyString(snapshot?.topic_id, "planned_topic_id");
  if (String(definition.id || "") !== topicId) {
    fail("planned_topic_identity_mismatch");
  }
  if (snapshot?.lifecycle !== "planned") {
    fail("planned_topic_not_active");
  }
  const scopeInclude = stringList(definition.scope_include);
  const scopeExclude = stringList(definition.scope_exclude);
  return {
    ...template,
    id: topicId,
    title: nonEmptyString(definition.title, "planned_topic_title"),
    definition: nonEmptyString(
      definition.definition,
      "planned_topic_definition_text",
    ),
    aliases: stringList(definition.aliases),
    scope_include: scopeInclude,
    scope_exclude: scopeExclude,
    scope_boundary: {
      include: scopeInclude,
      exclude: scopeExclude,
      notes: "Planned Topic scope carried into the offline synthesis fixture.",
    },
  };
}

function loadTemplates() {
  return {
    sections: readJson(
      fileURLToPath(new URL("./topic/sections.json", import.meta.url)),
      "topic_sections_template",
    ),
    sidecars: readJson(
      fileURLToPath(new URL("./topic/sidecars.json", import.meta.url)),
      "topic_sidecars_template",
    ),
  };
}

function substitutePlaceholders(value, topicId, refs) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (entry === PAPER_PLACEHOLDER) return [...refs];
      return [substitutePlaceholders(entry, topicId, refs)];
    });
  }
  if (typeof value === "string") {
    return value
      .replaceAll(TOPIC_PLACEHOLDER, topicId)
      .replaceAll(PAPER_PLACEHOLDER, refs[0]);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        substitutePlaceholders(entry, topicId, refs),
      ]),
    );
  }
  return value;
}

function ensureReportDepth(sections, paperCount) {
  const report = requireObject(sections.synthesis_report, "synthesis_report");
  const minimum = paperCount >= 5 ? 800 : 400;
  while (report.body.length < minimum) {
    report.body += `\n\n${REPORT_SUPPLEMENT}`;
  }
}

function materializeSections(state, template) {
  const sections = substitutePlaceholders(template, state.topic.id, state.source_refs);
  const sourceRow = requireObject(
    sections.source_papers?.[0],
    "source_papers_template",
  );
  sections.source_papers = state.source_refs.map((paperRef) => ({
    ...sourceRow,
    paper_ref: paperRef,
    digest_ref: {
      ...requireObject(sourceRow.digest_ref, "digest_ref_template"),
      paper_ref: paperRef,
      payload_type: "digest-markdown",
    },
  }));
  sections.statistics = {
    ...requireObject(sections.statistics, "statistics_template"),
    paper_count: state.source_refs.length,
  };
  sections.source_artifacts = state.artifacts;
  sections.topic = state.topic;
  ensureReportDepth(sections, state.source_refs.length);
  return sections;
}

function materializeSidecars(state, template) {
  return substitutePlaceholders(template, state.topic.id, state.source_refs);
}

function resolverManifest(state) {
  return {
    schema_id: "synthesis.topic_synthesis_resolver_manifest",
    schema_version: "1.0.0",
    resolver: state.resolver,
    resolver_reasoning: "",
    operation_intent: state.operation,
    resolved_paper_set: { papers: state.papers },
    paper_refs: state.source_refs,
    diagnostics: [],
  };
}

function materializeFinalize(workspace, paths, state) {
  const templates = loadTemplates();
  const sections = materializeSections(state, templates.sections);
  const sidecars = materializeSidecars(state, templates.sidecars);
  const sectionEntries = {};
  const sectionPaths = {};
  for (const [section, value] of Object.entries(sections)) {
    const filePath = path.join(paths.sections, `${section}.json`);
    writeJson(filePath, value);
    sectionEntries[section] = {
      path: `result/sections/${section}.json`,
      content_type: "json",
    };
    sectionPaths[section] = filePath;
  }
  const sidecarEntries = {};
  const sidecarPaths = {};
  for (const [name, fileName] of Object.entries(OWNED_SIDECARS)) {
    const value = requireObject(sidecars[name], "sidecar_template");
    const filePath = path.join(paths.sidecars, `${fileName}.json`);
    writeJson(filePath, value);
    sidecarEntries[name] = {
      path: `result/sidecars/${fileName}.json`,
      content_type: "json",
      schema_id: String(value.schema_id || value.schema || "").trim(),
    };
    if (!sidecarEntries[name].schema_id) fail("sidecar_schema_missing");
    sidecarPaths[name] = filePath;
  }
  const resolverPath = path.join(paths.payloads, "resolver.json");
  writeJson(resolverPath, resolverManifest(state));
  const analysisPath = path.join(paths.result, "topic-analysis.json");
  const analysis = {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "1.0.0",
    topic_id: state.topic.id,
    operation: state.operation,
    language: state.language,
    sections: sectionEntries,
    sidecars: sidecarEntries,
  };
  writeJson(analysisPath, analysis);
  const artifactManifestPath = path.join(
    paths.result,
    "topic-synthesis-artifacts.json",
  );
  const candidatePath = path.join(paths.result, "final-output.candidate.json");
  const candidate = {
    kind: "topic_synthesis",
    operation: state.operation,
    language: state.language,
    topic_definition: state.topic,
    artifact_manifest_path: artifactManifestPath,
    ...(state.operation === "update_full"
      ? { base_hashes: state.base_hashes }
      : {}),
  };
  writeJson(candidatePath, candidate);
  writeJson(artifactManifestPath, {
    resolver_manifest: resolverPath,
    topic_analysis: analysisPath,
    final_output_candidate: candidatePath,
    ...Object.fromEntries(
      Object.entries(sectionPaths).map(([name, filePath]) => [
        `${name}_section`,
        filePath,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(sidecarPaths).map(([name, filePath]) => [
        `${name}_sidecar`,
        filePath,
      ]),
    ),
  });
  return candidate;
}

function prepareTopic({ skillId, input, parameter, workspace, env, publicReader }) {
  const paths = workspacePaths(workspace);
  const templates = loadTemplates();
  const reader = publicReader;
  const updating = skillId === "update-topic-synthesis-prepare";
  requireOperation(input, parameter, updating ? "update_full" : "create");
  let topic;
  let resolver;
  let language = String(parameter.language || "zh-CN");
  let baseHashes;
  if (updating) {
    const topicId = nonEmptyString(parameter.topicId, "topic_id");
    const context = requireObject(
      reader.readTopicContext(topicId),
      "topic_context",
    );
    const semantic = requireObject(context.semantic, "topic_context_semantic");
    topic = requireObject(semantic.topic_definition, "topic_definition");
    if (String(topic.id || "") !== topicId) {
      fail("update_topic_identity_mismatch");
    }
    resolver = requireObject(semantic.topic_resolver, "topic_resolver");
    const audit = requireObject(context.audit, "topic_context_audit");
    language = nonEmptyString(audit.language, "topic_context_language");
    baseHashes = Object.fromEntries(
      ["artifact", "manifest", "metadata"].map((key) => [
        key,
        nonEmptyString(audit.current_hashes?.[key], `base_hash_${key}`),
      ]),
    );
  } else if (input.planned_topic) {
    topic = topicDefinitionFromSnapshot(
      input.planned_topic,
      templates.sections.topic,
    );
    resolver = requireObject(
      input.planned_topic.topic_resolver,
      "planned_topic_resolver",
    );
  } else {
    topic = {
      ...templates.sections.topic,
      id: SEED_TOPIC_ID,
    };
    resolver = { paper_refs: envRefs(env).slice(0, 7), combine: "union" };
  }
  const resolution = reader.resolve(resolver);
  const papers = Array.isArray(resolution?.papers) ? resolution.papers : [];
  const sourceRefs = uniqueRefs(papers);
  if (!sourceRefs.length) fail("resolver_empty");
  const artifacts = normalizeArtifacts(
    sourceRefs,
    reader.readArtifacts(sourceRefs)?.artifacts,
  );
  const topicPath = path.join(paths.payloads, "topic-definition.json");
  const artifactsPath = path.join(paths.payloads, "source-artifacts.json");
  const resolverPath = path.join(paths.payloads, "resolver.json");
  const state = {
    operation: updating ? "update_full" : "create",
    language,
    topic,
    resolver,
    papers,
    source_refs: sourceRefs,
    artifacts,
    ...(baseHashes ? { base_hashes: baseHashes } : {}),
  };
  writeJson(topicPath, topic);
  writeJson(artifactsPath, { artifacts });
  writeJson(resolverPath, resolverManifest(state));
  writeState(paths.db, state);
  const handoffManifestPath = path.join(
    paths.handoff,
    "prepare-analysis-context.artifacts.json",
  );
  writeJson(handoffManifestPath, {
    db_path: paths.db,
    topic_definition: topicPath,
    resolver_manifest: resolverPath,
    source_artifacts: artifactsPath,
  });
  return {
    kind: "topic_synthesis_handoff",
    handoff: "prepare_analysis_context",
    operation: state.operation,
    db_path: paths.db,
    handoff_manifest_path: handoffManifestPath,
    next_skill_id: "topic-synthesis-core-enrichment",
    __SKILL_DONE__: true,
  };
}

function readHandoff(input, expectedHandoff) {
  const handoff = requireObject(input.handoff, "handoff");
  if (
    handoff.kind !== "topic_synthesis_handoff" ||
    handoff.handoff !== expectedHandoff ||
    !["create", "update_full"].includes(handoff.operation)
  ) {
    fail("handoff_contract_mismatch");
  }
  return handoff;
}

function coreTopic({ input, workspace }) {
  const handoff = readHandoff(input, "prepare_analysis_context");
  const paths = workspacePaths(workspace);
  const entries = readHandoffManifest(workspace, handoff.handoff_manifest_path);
  const dbPath = insideWorkspace(workspace, handoff.db_path);
  if (entries.db_path !== dbPath) fail("handoff_db_mismatch");
  const state = readState(dbPath);
  if (
    !["create", "update_full"].includes(state.operation) ||
    handoff.operation !== state.operation
  ) {
    fail("handoff_state_operation_mismatch");
  }
  if (!state.topic?.id || !state.source_refs?.length) {
    fail("topic_state_incomplete");
  }
  const storedTopic = readJson(
    entries.topic_definition,
    "handoff_topic_definition",
  );
  if (storedTopic?.id !== state.topic.id) fail("handoff_topic_mismatch");
  const coreManifestPath = path.join(
    paths.handoff,
    "core-enrichment.artifacts.json",
  );
  writeJson(coreManifestPath, {
    db_path: dbPath,
    topic_definition: entries.topic_definition,
    resolver_manifest: entries.resolver_manifest,
    source_artifacts: entries.source_artifacts,
  });
  return {
    kind: "topic_synthesis_handoff",
    handoff: "core_enrichment",
    operation: state.operation,
    db_path: dbPath,
    handoff_manifest_path: coreManifestPath,
    next_skill_id: "topic-synthesis-finalize",
    __SKILL_DONE__: true,
  };
}

function finalizeTopic({ input, workspace }) {
  const handoff = readHandoff(input, "core_enrichment");
  const paths = workspacePaths(workspace);
  const entries = readHandoffManifest(workspace, handoff.handoff_manifest_path);
  const dbPath = insideWorkspace(workspace, handoff.db_path);
  if (entries.db_path !== dbPath) fail("handoff_db_mismatch");
  const state = readState(dbPath);
  if (
    !["create", "update_full"].includes(state.operation) ||
    handoff.operation !== state.operation
  ) {
    fail("handoff_state_operation_mismatch");
  }
  const candidate = materializeFinalize(workspace, paths, state);
  return { ...candidate, __SKILL_DONE__: true };
}

function planTopics({ input, workspace, env, publicReader }) {
  requireOperation(input, {}, "create");
  const context = requireObject(
    publicReader.readPlanningContext(),
    "planning_context",
  );
  const baseGraphHash = nonEmptyString(
    context.topic_graph?.manifest?.manifest_hash,
    "planning_graph_hash",
  );
  const libraryIndexHash = nonEmptyString(
    context.library?.index_hash,
    "planning_library_hash",
  );
  const resolver = { paper_refs: envRefs(env).slice(0, 5), combine: "union" };
  if (!resolver.paper_refs.length) fail("paper_refs_env_missing");
  return {
    kind: "topic_plan",
    operation: "reconcile",
    base_graph_hash: baseGraphHash,
    library_index_hash: libraryIndexHash,
    topic_actions: [
      {
        action: "create",
        topic_id: PLANNED_TOPIC_ID,
        title: PLANNED_TOPIC_TITLE,
        definition: PLANNED_TOPIC_DEFINITION,
        aliases: ["规划主题"],
        scope: {
          include: ["合成候选集", "合成引用关系"],
          exclude: ["真实文献结论", "线上系统指标"],
        },
        resolver,
        revision: 1,
      },
    ],
    relation_proposals: [],
    recommended_updates: [],
    __SKILL_DONE__: true,
  };
}

function unwrapCli(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(String(stdout || ""));
  } catch {
    fail("bridge_json_invalid");
  }
  if (parsed?.ok === false) {
    throw new Error(
      `workflow_fixture_bridge_failed:${JSON.stringify(parsed.error || {})}`,
    );
  }
  const outer = parsed?.data ?? parsed;
  return outer?.data ?? outer;
}

function createCliReader(workspace) {
  const cli = path.join(workspace, ".zotero-bridge", "bin", "zotero-bridge");
  const payloads = path.join(workspace, "runtime", "payloads");
  const run = (command, inputName, query) => {
    if (!existsSync(cli)) fail("bridge_missing");
    writeJson(path.join(payloads, inputName), query);
    const completed = spawnSync(
      cli,
      [...command, "--query", `@runtime/payloads/${inputName}`],
      { cwd: workspace, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (completed.error) {
      throw new Error(`workflow_fixture_bridge_failed:${completed.error.message}`);
    }
    if (completed.status !== 0) {
      throw new Error(
        `workflow_fixture_bridge_failed:${String(
          completed.stdout || completed.stderr || "",
        ).slice(0, 2000)}`,
      );
    }
    return unwrapCli(completed.stdout);
  };
  const download = (data, label) => {
    const fileId =
      data?.delivery?.bundle?.fileId || data?.delivery?.file?.fileId || "";
    if (!fileId) return null;
    const relativePath = `runtime/payloads/${label}.json`;
    const completed = spawnSync(
      cli,
      ["file", "download", fileId, "--output", relativePath, "--force"],
      { cwd: workspace, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (completed.error || completed.status !== 0) {
      throw new Error(
        `workflow_fixture_bridge_failed:${String(
          completed.error?.message || completed.stdout || completed.stderr || "",
        ).slice(0, 2000)}`,
      );
    }
    return readJson(path.join(workspace, relativePath), "bridge_download");
  };
  return {
    resolve(resolver) {
      const data = run(
        ["synthesis", "resolver", "resolve"],
        "topic-resolver-input.json",
        resolver,
      );
      return {
        papers: Array.isArray(data.papers)
          ? data.papers
          : Array.isArray(data.candidates)
            ? data.candidates
            : [],
        diagnostics: data.diagnostics,
      };
    },
    readArtifacts(refs) {
      const data = run(
        ["synthesis", "artifact", "read"],
        "topic-artifacts-input.json",
        { paper_refs: refs, artifact_types: SOURCE_ARTIFACT_TYPES },
      );
      const full = data.delivery ? download(data, "topic-artifacts") : data;
      if (!Array.isArray(full?.artifacts)) fail("artifact_payload_missing");
      return { artifacts: full.artifacts };
    },
    readTopicContext(topicId) {
      const data = run(
        ["synthesis", "topic", "get-context"],
        "topic-context-input.json",
        { topicId, view: "full" },
      );
      return download(data, "topic-context-full") || data;
    },
    readPlanningContext() {
      const data = run(
        ["synthesis", "topic", "get-planning-context"],
        "topic-planning-context-input.json",
        {},
      );
      const downloaded = download(data, "planning-context");
      if (!downloaded) fail("planning_context_missing");
      return downloaded;
    },
  };
}

function createStubReader(stub) {
  return {
    resolve(resolver) {
      const key = stringList(resolver?.paper_refs).join("|");
      const entry = stub.resolverByRefs?.[key] ?? stub.defaultResolver;
      const papers = Array.isArray(entry) ? entry : entry?.papers;
      if (!Array.isArray(papers)) fail("stub_resolver_missing");
      return { papers };
    },
    readArtifacts() {
      return { artifacts: Array.isArray(stub.artifacts) ? stub.artifacts : [] };
    },
    readTopicContext() {
      if (!stub.topicContext) fail("stub_topic_context_missing");
      return stub.topicContext;
    },
    readPlanningContext() {
      if (!stub.planningContext) fail("stub_planning_context_missing");
      return stub.planningContext;
    },
  };
}

export function createTopicPublicReader({ workspace, env = process.env }) {
  const stubPath = String(
    env.ZOTERO_WORKFLOW_TOPIC_PUBLIC_READER || "",
  ).trim();
  if (stubPath) {
    return createStubReader(readJson(stubPath, "topic_reader_stub"));
  }
  return createCliReader(workspace);
}

export function handleTopicSkill({
  skillId,
  input = {},
  parameter = {},
  workspace,
  env = process.env,
  publicReader,
}) {
  if (!isTopicSkill(skillId)) fail("skill_unreviewed");
  const root = nonEmptyString(workspace, "workspace");
  const reader = publicReader || createTopicPublicReader({ workspace: root, env });
  const args = {
    skillId,
    input,
    parameter,
    workspace: root,
    env,
    publicReader: reader,
  };
  switch (skillId) {
    case "create-topic-synthesis-prepare":
    case "update-topic-synthesis-prepare":
      return prepareTopic(args);
    case "topic-synthesis-core-enrichment":
      return coreTopic(args);
    case "topic-synthesis-finalize":
      return finalizeTopic(args);
    case "topic-planner":
      return planTopics(args);
    default:
      return fail("skill_unreviewed");
  }
}

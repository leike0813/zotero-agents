import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESEARCH_SKILLS = new Set([
  "export-research-bundle",
  "manuscript-literature-framing",
]);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const PAPER_REFS_ENV = "ZOTERO_WORKFLOW_RESEARCH_PAPER_REFS";
const TOPIC_IDS_ENV = "ZOTERO_WORKFLOW_RESEARCH_TOPIC_IDS";

export function isResearchSkill(skillId) {
  return RESEARCH_SKILLS.has(String(skillId || "").trim());
}

function fail(message) {
  throw new Error(`workflow_research_fixture_${message}`);
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(`${label}_unreadable`);
  }
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readList(value, label) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      fail(`${label}_invalid`);
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function refsFromEnv(env) {
  const refs = readList(env[PAPER_REFS_ENV], "paper_refs");
  if (!refs.length) fail("paper_refs_missing");
  return refs;
}

function topicsFromEnv(env) {
  const topics = readList(env[TOPIC_IDS_ENV], "topic_ids");
  if (!topics.length) fail("topic_ids_missing");
  return topics;
}

function pythonCommand(script, args) {
  const uv = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (uv.status !== 0) fail("uv_unavailable");
  return {
    command: "uv",
    args: [
      "run",
      `--project=${path.join(os.homedir(), ".ar")}`,
      "--locked",
      "--",
      "python",
      script,
      ...args,
    ],
  };
}

function runJson(script, args, { workspace, env }) {
  const { command, args: commandArgs } = pythonCommand(script, args);
  const completed = spawnSync(command, commandArgs, {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, ...env, PYTHONUTF8: "1" },
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = String(completed.stdout || "").trim();
  if (completed.error || completed.status !== 0) {
    throw new Error(
      `workflow_research_runtime_failed:${String(
        completed.error?.message || output || completed.stderr || "unknown",
      ).slice(0, 4000)}`,
    );
  }
  try {
    return JSON.parse(output);
  } catch {
    fail("runtime_json_invalid");
  }
}

function unwrapCli(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(String(stdout || "").trim());
  } catch {
    fail("bridge_json_invalid");
  }
  if (parsed?.ok === false) fail("bridge_failed");
  const outer = parsed?.data ?? parsed;
  return outer?.data ?? outer;
}

function cliPath(workspace, env) {
  const candidates = [
    String(env.ZOTERO_BRIDGE_BIN || ""),
    path.join(workspace, ".zotero-bridge", "bin", "zotero-bridge"),
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) fail("bridge_missing");
  return found;
}

function runCli(workspace, env, command, query, label) {
  const queryPath = path.join(workspace, "runtime", "payloads", `${label}.json`);
  writeJson(queryPath, query);
  const relative = path.relative(workspace, queryPath).split(path.sep).join("/");
  const completed = spawnSync(
    cliPath(workspace, env),
    [...command, "--query", `@${relative}`],
    {
      cwd: workspace,
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (completed.error || completed.status !== 0) {
    throw new Error(
      `workflow_research_bridge_failed:${String(
        completed.error?.message || completed.stdout || completed.stderr || "",
      ).slice(0, 4000)}`,
    );
  }
  return unwrapCli(completed.stdout);
}

function substitute(value, context) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (entry === "__PAPER_REFS__") return [...context.paperRefs];
      if (entry === "__PAPER_REF__") return [context.paperRefs[0]];
      return [substitute(entry, context)];
    });
  }
  if (typeof value === "string") {
    return value
      .replaceAll("__TITLE__", context.title)
      .replaceAll("__LANGUAGE__", context.language)
      .replaceAll("__ARTICLE_TYPE__", context.articleType)
      .replaceAll("__STYLE__", context.stylePreference)
      .replaceAll("__TOPIC_ID__", context.topicId)
      .replaceAll("__PAPER_REF__", context.paperRefs[0]);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        substitute(entry, context),
      ]),
    );
  }
  return value;
}

function exportSkill({ parameter, workspace, env }) {
  const gateScript = path.join(
    REPO_ROOT,
    "skills_builtin/export-research-bundle/scripts/gate_runtime.py",
  );
  const inputPath = path.join(workspace, "runtime", "input.json");
  const dbPath = path.join(workspace, "runtime", "export-research-bundle.sqlite");
  writeJson(inputPath, { parameter });
  const fixture = readJson(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "research/export-research-bundle.json",
    ),
    "export_fixture",
  );
  const common = [
    "--db",
    dbPath,
    "--input",
    inputPath,
  ];
  for (let step = 0; step < 24; step += 1) {
    const gate = runJson(gateScript, [...common, "--action", "gate"], {
      workspace,
      env,
    });
    if (gate.stage === "completed") return gate.output;
    if (gate.next_action === "run_stage") {
      runJson(gateScript, [...common, "--action", "run"], { workspace, env });
      continue;
    }
    if (gate.payload_path && gate.stage === "stage_10_intent_query_plan") {
      writeJson(gate.payload_path, fixture.query_plan);
      runJson(
        gateScript,
        [...common, "--action", "submit", "--payload", gate.payload_path],
        { workspace, env },
      );
      continue;
    }
    if (gate.payload_path && gate.stage === "stage_30_topic_assessment") {
      const topics = readJson(gate.required_reads[0], "topic_candidates");
      const requested = topicsFromEnv(env);
      const maxTopics = Number(parameter.maxTopics ?? 1);
      const selected = (Array.isArray(topics.topics) ? topics.topics : [])
        .filter((topic) =>
          requested.includes(String(topic.topic_id || topic.id || "")),
        )
        .slice(0, Math.max(0, maxTopics));
      writeJson(gate.payload_path, {
        topics: selected.map((topic, index) => ({
          topic_id: String(topic.topic_id || topic.id),
          relevance: Math.max(0.5, 0.95 - index * 0.05),
          reason: "Synthetic topic selected for the offline research fixture.",
        })),
      });
      runJson(
        gateScript,
        [...common, "--action", "submit", "--payload", gate.payload_path],
        { workspace, env },
      );
      continue;
    }
    if (gate.payload_path && gate.stage === "stage_50_paper_assessment") {
      const packet = readJson(gate.required_reads[0], "assessment_packet");
      const selectedTopics = (packet.selected_topics || []).map((topic) =>
        String(topic.topic_id || ""),
      );
      writeJson(gate.payload_path, {
        batch_id: packet.batch_id,
        assessments: packet.candidates.map((candidate, index) => ({
          paper_ref: String(candidate.paper_ref),
          semantic_relevance: Math.max(0.72, 0.92 - index * 0.05),
          matched_topic_ids: selectedTopics,
          reason: "Synthetic relevance for the offline query-routing fixture.",
          evidence_basis: ["metadata"],
          caveats: ["Synthetic assessment only."],
        })),
      });
      runJson(
        gateScript,
        [...common, "--action", "submit", "--payload", gate.payload_path],
        { workspace, env },
      );
      continue;
    }
    fail(`unexpected_export_gate_${gate.stage || "unknown"}`);
  }
  return fail("export_gate_incomplete");
}

function literatureQuality(workspace, env, refs) {
  const data = runCli(
    workspace,
    env,
    ["synthesis", "artifact", "manifest"],
    { paper_refs: refs },
    "research-artifact-manifest",
  );
  const papers = Array.isArray(data.papers) ? data.papers : [];
  return Object.fromEntries(
    papers.map((paper) => {
      const score = (paper.artifacts || []).find(
        (artifact) => artifact.artifact_type === "literature_score",
      );
      return [
        String(paper.paper_ref || ""),
        score?.literature_quality || {
          status: "available",
          quality_prior: 0.7,
          diagnostics: [],
        },
      ];
    }),
  );
}

function framingSkill({ parameter, workspace, env }) {
  const gateScript = path.join(
    REPO_ROOT,
    "skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py",
  );
  const stageScript = path.join(
    REPO_ROOT,
    "skills_builtin/manuscript-literature-framing/scripts/stage_runtime.py",
  );
  const statePath = path.join(
    workspace,
    "runtime",
    "manuscript-literature-framing.json",
  );
  const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "research/manuscript-literature-framing.json",
  );
  const fixture = readJson(fixturePath, "framing_fixture");
  const paperRefs = refsFromEnv(env);
  const topicId = topicsFromEnv(env)[0];
  const quality = literatureQuality(workspace, env, paperRefs);
  const context = {
    title: String(parameter.paperTitle || "Synthetic query routing study"),
    language: String(parameter.language || "zh-CN"),
    articleType: String(parameter.articleType || "original research"),
    stylePreference: String(parameter.stylePreference || "Synthetic study plan"),
    topicId,
    paperRefs,
  };
  for (let step = 0; step < 24; step += 1) {
    const gate = runJson(gateScript, ["--state", statePath], { workspace, env });
    if (gate.next_action === "done") break;
    const action = String(gate.next_action || "");
    const template = fixture[action];
    if (!template) fail(`unmapped_framing_action_${action}`);
    const payloadPath = gate.required_writes?.[0];
    if (!payloadPath) fail("framing_payload_path_missing");
    const payload = substitute(template, context);
    if (action === "persist_evidence_inventory") {
      payload.evidence_inventory.papers = paperRefs.map((paperRef, index) => ({
        paper_ref: paperRef,
        literature_quality: quality[paperRef] || {
          status: "available",
          quality_prior: 0.7,
          diagnostics: [],
        },
        evidence_role: index === 0 ? "primary" : "supporting",
        reason: "Synthetic evidence selected for offline literature framing.",
        caveats: ["Synthetic fixture only."],
      }));
    }
    writeJson(payloadPath, payload);
    runJson(
      stageScript,
      ["--state", statePath, "--action", action, "--payload-file", payloadPath],
      { workspace, env },
    );
  }
  const resultPath = path.join(
    workspace,
    "manuscript-literature-framing.result.json",
  );
  if (!existsSync(resultPath)) fail("framing_result_missing");
  return readJson(resultPath, "framing_result");
}

export function handleResearchSkill({
  skillId,
  input = {},
  parameter = {},
  workspace,
  env = process.env,
}) {
  if (!isResearchSkill(skillId)) fail("skill_unreviewed");
  const root = path.resolve(String(workspace || ""));
  if (!workspace) fail("workspace_missing");
  const params = { ...input, ...parameter };
  const result =
    skillId === "export-research-bundle"
      ? exportSkill({ parameter: params, workspace: root, env })
      : framingSkill({ parameter: params, workspace: root, env });
  return { ...result, __SKILL_DONE__: true };
}

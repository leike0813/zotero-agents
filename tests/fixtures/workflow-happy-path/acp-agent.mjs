import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { createInterface } from "node:readline";
import { handleTopicSkill, isTopicSkill, SEED_TOPIC_ID, PLANNED_TOPIC_ID } from "./topic-agent.mjs";
import { handleIngestSkill } from "./ingest-agent.mjs";
import { handleResearchSkill, isResearchSkill } from "./research-agent.mjs";

const modelId = "minimax-cn-coding-plan/MiniMax-M3.1-Flash";
const sessionId = "workflow-fixture";
let explainerContext;

function send(message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
}

function workflowResult(params) {
  const text = (params.prompt || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  const manifestPath = text.match(/^- Input manifest: (.+)$/m)?.[1]?.trim();
  const explainerReply = !manifestPath && explainerContext;
  if (!manifestPath && !explainerReply) throw new Error("workflow_fixture_manifest_missing");
  const manifest = manifestPath
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : explainerContext.manifest;
  if (manifest.skill_id === "literature-search-ingest" || isResearchSkill(manifest.skill_id)) {
    const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
    if (!workspace) throw new Error("workflow_fixture_workspace_missing");
    const args = { skillId: manifest.skill_id, input: manifest.input || {}, parameter: manifest.parameter || {}, workspace };
    return manifest.skill_id === "literature-search-ingest"
      ? { ...handleIngestSkill(args), __SKILL_DONE__: true }
      : handleResearchSkill({ ...args, env: {
        ...process.env,
        ZOTERO_WORKFLOW_RESEARCH_PAPER_REFS: JSON.stringify(JSON.parse(process.env.ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS || "[]").slice(0, 7)),
        ZOTERO_WORKFLOW_RESEARCH_TOPIC_IDS: JSON.stringify([SEED_TOPIC_ID, PLANNED_TOPIC_ID]),
      } });
  }
  if (isTopicSkill(manifest.skill_id)) {
    const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
    if (!workspace) throw new Error("workflow_fixture_workspace_missing");
    return handleTopicSkill({
      skillId: manifest.skill_id,
      input: manifest.input || {},
      parameter: manifest.parameter || {},
      workspace,
    });
  }
  if (["collection-collector", "literature-metadata-search"].includes(manifest.skill_id)) {
    let text = readFileSync(new URL(`./curation/${manifest.skill_id}.json`, import.meta.url), "utf8");
    if (manifest.skill_id === "collection-collector") {
      const bindings = JSON.parse(readFileSync(new URL("./curation/bindings.json", import.meta.url), "utf8"));
      const refs = JSON.parse(process.env.ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS || "[]");
      const collection = manifest.parameter?.collection;
      if (!collection || refs.length !== 20) throw new Error("workflow_fixture_curation_bindings_missing");
      text = text.replaceAll(bindings.collection["collection-collector.json"].placeholder, collection);
      for (const binding of bindings.paperRefs["collection-collector.json"]) {
        const index = Number(binding.sourceKey.slice(3)) - 1;
        if (!refs[index]) throw new Error("workflow_fixture_curation_ref_missing");
        text = text.replaceAll(binding.placeholder, refs[index]);
      }
      text = text.replaceAll("__TOPIC_ID__", SEED_TOPIC_ID);
    }
    return { ...JSON.parse(text), __SKILL_DONE__: true };
  }
  if (!["tag-bootstrapper", "tag-regulator", "literature-analysis", "literature-translator", "literature-deep-reading", "literature-explainer"].includes(manifest.skill_id)) {
    throw new Error("workflow_fixture_skill_unreviewed");
  }
  if (manifest.skill_id === "literature-explainer") {
    if (!explainerReply) {
      const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
      if (!workspace) throw new Error("workflow_fixture_workspace_missing");
      explainerContext = { manifest, workspace, phase: 0 };
    }
    const note = readFileSync(new URL("./explainer-note.md", import.meta.url), "utf8");
    if (explainerContext.phase++ === 0) {
      return {
        __SKILL_DONE__: false,
        message: "已完成合成文献初析。请选择生成学习笔记。",
        ui_hints: { kind: "choose_one", options: [{ label: "生成学习笔记", value: "generate_note" }] },
      };
    }
    if (explainerContext.phase === 2) {
      return {
        __SKILL_DONE__: false,
        message: `学习笔记预览，尚未生成最终文件。\n\n${note}`,
        ui_hints: { kind: "confirm", options: [{ label: "确认生成笔记", value: "confirm_note" }] },
      };
    }
    const notePath = path.join(explainerContext.workspace, "explainer-note.md");
    writeFileSync(notePath, note);
    return {
      __SKILL_DONE__: true,
      note_path: notePath,
      provenance: {
        generated_at: "2026-01-01T00:00:00Z",
        input_hash: `sha256:${createHash("sha256").update(readFileSync(manifest.input.source_path)).digest("hex")}`,
        model: modelId,
      },
      warnings: [],
      error: {},
    };
  }
  if (manifest.skill_id === "literature-deep-reading") {
    const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
    if (!workspace) throw new Error("workflow_fixture_workspace_missing");
    const directory = path.join(workspace, "result");
    mkdirSync(path.join(directory, "sections"), { recursive: true });
    const artifacts = Object.fromEntries(Object.entries({
      deep_reading_html: "deep-reading.html",
      deep_reading_manifest: "deep-reading-manifest.json",
      final_output_candidate: "final-output.candidate.json",
      sections: "sections/sections.json",
      source_images: "sections/source-images.json",
      diagnostics: "sections/diagnostics.json",
    }).map(([key, file]) => [key, path.join(directory, file)]));
    const html = readFileSync(new URL("./deep-reading.html", import.meta.url));
    writeFileSync(artifacts.deep_reading_html, html);
    writeFileSync(artifacts.deep_reading_manifest, JSON.stringify({
      schema_version: "literature-deep-reading.final-manifest.v0",
      entrypoint: artifacts.deep_reading_html,
      final_html_available: true,
      html_sha256: createHash("sha256").update(html).digest("hex"),
      html_bytes: html.length,
      generated_at: "2026-01-01T00:00:00Z",
      diagnostics_count: 0,
    }));
    writeFileSync(artifacts.diagnostics, JSON.stringify({
      schema_version: "literature-deep-reading.final-diagnostics.v0",
      diagnostics: [],
      final_review: { status: "passed" },
    }));
    writeFileSync(artifacts.sections, "{}");
    writeFileSync(artifacts.source_images, "{}");
    const manifestPath = path.join(directory, "deep-reading-artifacts.json");
    writeFileSync(manifestPath, JSON.stringify(artifacts));
    const result = {
      kind: "literature_deep_reading_finalized",
      status: "completed",
      diagnostics_path: artifacts.diagnostics,
      final_html_available: true,
      html_path: artifacts.deep_reading_html,
      artifact_manifest_path: manifestPath,
      warnings: [],
      error: {},
    };
    writeFileSync(artifacts.final_output_candidate, JSON.stringify(result));
    return { ...result, __SKILL_DONE__: true };
  }
  if (manifest.skill_id === "literature-translator") {
    const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
    if (!workspace) throw new Error("workflow_fixture_workspace_missing");
    if (manifest.parameter?.target_language !== "zh-CN") {
      throw new Error("workflow_fixture_language_unreviewed");
    }
    const sourcePath = manifest.input.source_path;
    const source = readFileSync(sourcePath, "utf8");
    const imageRef = source.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1];
    if (!imageRef) throw new Error("workflow_fixture_source_image_missing");
    const result = {
      status: "success",
      reason: "Synthetic translation completed",
      provenance: { source_path: sourcePath, source_language: "en-US", target_language: "zh-CN" },
      warnings: [],
      __SKILL_DONE__: true,
    };
    for (const [field, file] of Object.entries({
      output_path: "output.md",
      alignment_path: "alignment.json",
      glossary_path: "glossary.json",
      qa_report_path: "qa_report.json",
    })) {
      const content = readFileSync(new URL(`./translation/${file}`, import.meta.url), "utf8")
        .replaceAll("__IMAGE_REF__", imageRef);
      const target = path.join(workspace, file);
      writeFileSync(target, content);
      result[field] = target;
    }
    return result;
  }
  if (manifest.skill_id === "literature-analysis") {
    const workspace = text.match(/^- Run workspace: (.+)$/m)?.[1]?.trim();
    if (!workspace) throw new Error("workflow_fixture_workspace_missing");
    const result = {
      provenance: { generated_at: "2026-01-01T00:00:00Z", model: modelId },
      warnings: [],
      error: {},
      __SKILL_DONE__: true,
    };
    for (const [field, file] of Object.entries({
      digest_path: "digest.md",
      references_path: "references.json",
      citation_analysis_path: "citation_analysis.json",
      literature_score_path: "literature_score.json",
      literature_matching_metadata_path: "literature_matching_metadata.json",
    })) {
      const target = path.join(workspace, file);
      writeFileSync(target, readFileSync(new URL(`./analysis/${file}`, import.meta.url)));
      result[field] = target;
    }
    return result;
  }
  const result = JSON.parse(
    readFileSync(new URL(`./${manifest.skill_id}.json`, import.meta.url), "utf8"),
  );
  if (manifest.skill_id === "tag-regulator") {
    result.metadata = manifest.input?.metadata ?? null;
    result.input_tags = manifest.input?.input_tags ?? [];
  }
  return { ...result, __SKILL_DONE__: true };
}

function handle(request) {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: request.params?.protocolVersion ?? 1,
        agentInfo: { name: "builtin-workflow-fixture", version: "1" },
        agentCapabilities: {},
        authMethods: [],
      };
    case "session/new":
      return {
        sessionId,
        models: {
          currentModelId: modelId,
          availableModels: [{ modelId, name: modelId }],
        },
      };
    case "session/set_model":
      if (request.params?.modelId !== modelId) {
        throw new Error("workflow_fixture_model_unavailable");
      }
      return {};
    case "session/prompt":
      send({
        method: "session/update",
        params: {
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: JSON.stringify(workflowResult(request.params)) },
          },
        },
      });
      return { stopReason: "end_turn" };
    case "session/cancel":
      return {};
    default:
      throw new Error("workflow_fixture_method_unsupported");
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  const request = JSON.parse(line);
  try {
    const result = handle(request);
    if (request.id !== undefined) send({ id: request.id, result });
  } catch (error) {
    if (request.id !== undefined) {
      send({ id: request.id, error: { code: -32602, message: error.message } });
    }
  }
});

import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AcpSkillRunRequestV1,
  SkillRunnerJobRequestV1,
  SkillRunnerSequenceRequestV1,
} from "../../src/providers/contracts";
import type { WorkflowHostApi } from "../../src/workflows/types";
import { adaptSkillRunnerJobToAcpSkillRun } from "../../src/modules/acp/skillRun/acpSkillRunRequestAdapter";
import { executeSkillRunnerSequence } from "../../src/modules/workflowExecution/sequenceRuntime";
import {
  resolveAcpSkillSchemaAsset,
  validateAcpSkillRunRequestAgainstSchemas,
} from "../../src/modules/acp/skillRun/acpSkillSchemaAssets";
import { validateAcpSkillFinalPayload } from "../../src/modules/acp/skillRun/acpSkillOutputValidator";

type ConcreteRequest = AcpSkillRunRequestV1 | SkillRunnerJobRequestV1;
export type RequestContractEvidence = {
  skillId: string;
  request: AcpSkillRunRequestV1;
  validated: string[];
  unused: string[];
};

/** Exercise the same adapter, inheritance and validator used before an ACP prompt. */
export async function validateBuiltinSkillRequests(args: {
  workflowId: string;
  request: ConcreteRequest | SkillRunnerSequenceRequestV1;
  workspaceDir: string;
  hostApi: WorkflowHostApi;
}) {
  const evidence: RequestContractEvidence[] = [];
  const dispatch = async (raw: ConcreteRequest) => {
    const request =
      raw.kind === "skillrunner.job.v1"
        ? adaptSkillRunnerJobToAcpSkillRun(raw)
        : raw;
    const skillDir = path.resolve("skills_builtin", request.skill_id);
    const runnerJson = JSON.parse(
      await fs.readFile(path.join(skillDir, "assets/runner.json"), "utf8"),
    );
    const row: RequestContractEvidence = {
      skillId: request.skill_id,
      request,
      validated: [],
      unused: [],
    };
    for (const schemaKey of ["input", "parameter"] as const) {
      const resolution = await resolveAcpSkillSchemaAsset({
        skillDir,
        runnerJson,
        schemaKey,
      });
      if (resolution.path) row.validated.push(schemaKey);
      else {
        assert.isEmpty(
          request[schemaKey] || {},
          `${args.workflowId}/${request.skill_id}: nonempty ${schemaKey} has no schema`,
        );
        row.unused.push(schemaKey);
      }
    }
    const validation = await validateAcpSkillRunRequestAgainstSchemas({
      request,
      runnerJson,
      skillDir,
      workspaceDir: args.workspaceDir,
    });
    assert.isTrue(
      validation.ok,
      `${args.workflowId}/${request.skill_id}: ${validation.errors.join("; ")}`,
    );
    evidence.push(row);
    const resultJson = await handoffFixture(request, args.workspaceDir);
    if (resultJson) {
      const output = await validateAcpSkillFinalPayload({
        payload: resultJson,
        runnerJson,
        primarySkillDir: skillDir,
      });
      assert.isTrue(
        output.ok,
        `invalid handoff fixture for ${request.skill_id}: ${output.errors.join("; ")}`,
      );
    }
    return {
      status: "succeeded" as const,
      requestId: `contract-${args.workflowId}-${evidence.length}`,
      workspaceDir: args.workspaceDir,
      fetchType: "result" as const,
      resultJson: resultJson || {},
      responseJson: {},
    };
  };
  if (args.request.kind === "skillrunner.sequence.v1") {
    await executeSkillRunnerSequence({
      request: args.request,
      hostApi: args.hostApi,
      backend: {
        id: "contract-acp",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      workflowId: args.workflowId,
      workflowRunId: `contract-${args.workflowId}-${path.basename(args.workspaceDir)}`,
      jobId: `contract-${args.workflowId}`,
      appendRuntimeLog: () => {},
      executeWithProvider: ({ request }) =>
        dispatch(request as ConcreteRequest),
    });
    assert.lengthOf(
      evidence,
      args.request.steps.length,
      `${args.workflowId}: all concrete steps must reach admission`,
    );
  } else await dispatch(args.request);
  return evidence;
}

async function handoffFixture(request: AcpSkillRunRequestV1, root: string) {
  const skill = request.skill_id;
  const file = async (name: string, text = "fixture") => {
    const target = path.join(root, name);
    await fs.writeFile(target, text, "utf8");
    return target;
  };
  if (
    skill.endsWith("topic-synthesis-prepare") ||
    skill === "topic-synthesis-core-enrichment"
  ) {
    const core = skill === "topic-synthesis-core-enrichment";
    return {
      kind: "topic_synthesis_handoff",
      handoff: core ? "core_enrichment" : "prepare_analysis_context",
      operation: core
        ? (request.input as { handoff?: { operation?: string } })?.handoff
            ?.operation || "create"
        : skill.startsWith("update-")
          ? "update_full"
          : "create",
      db_path: await file("topic.sqlite"),
      handoff_manifest_path: await file(`${skill}.json`, "{}"),
      next_skill_id: core
        ? "topic-synthesis-finalize"
        : "topic-synthesis-core-enrichment",
    };
  }
  if (skill === "literature-analysis")
    return {
      digest_path: await file("digest.md", "# Synthetic digest"),
      references_path: await file("references.json", "{}"),
      citation_analysis_path: await file("citation.json", "{}"),
      literature_matching_metadata_path: await file("matching.json", "{}"),
      literature_score_path: await file("score.json", "{}"),
      provenance: {},
      warnings: [],
      error: {},
    };
  if (skill === "literature-translator")
    return {
      status: "success",
      output_path: await file("translated.md", "# Translation"),
      alignment_path: await file(
        "translated.json",
        JSON.stringify({ format: "v1", target_language: "zh-CN", blocks: [] }),
      ),
    };
  if (skill.startsWith("debug-sequence-probe-"))
    return {
      kind: "debug_sequence_probe_result",
      probe_id: "contract",
      status: "ok",
      checks: [],
      diagnostics: [],
      public_marker: "synthetic-public",
      artifact_path: await file("probe-artifact.json", "{}"),
    };
  if (skill === "debug-sequence-countdown-probe")
    return {
      kind: "debug_countdown_probe_result",
      step_id: request.parameter?.step_id,
      status: "ok",
      marker: "synthetic-marker",
      countdown_seconds: 1,
      countdown_completed: true,
      handoff_checks: [],
      checks: [],
      diagnostics: [],
    };
  return undefined;
}

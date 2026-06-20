const BUNDLE_SKILL_ID = "debug-apply-bundle-probe";
const RESULT_SKILL_ID = "debug-apply-result-probe";

function normalizeString(value) {
  return String(value || "").trim();
}

function randomRunKey() {
  return Math.random().toString(36).slice(2, 8);
}

function resolveWorkflowParams(executionOptions) {
  const workflowParams = executionOptions?.workflowParams || {};
  return {
    runResultStep: workflowParams.run_result_step === true,
    skipResultStep: workflowParams.skip_result_step === true,
  };
}

async function createTestParent({ manifest, runtime, runKey }) {
  const workflowId = normalizeString(manifest?.id) || "debug-apply-contract";
  const title = `${workflowId} ${runKey}`;
  if (!runtime?.handlers?.item?.create) {
    throw new Error("debug apply contract buildRequest requires item handler");
  }
  const parent = await runtime.handlers.item.create({
    itemType: "journalArticle",
    fields: { title },
  });
  return {
    parent,
    title,
    workflowId,
  };
}

function buildStepParameter({ workflowId, stepId, runKey, applyMode }) {
  return {
    workflow_id: workflowId,
    step_id: stepId,
    run_key: runKey,
    message: `${workflowId}:${stepId}:${applyMode}:${runKey}`,
    ...(applyMode === "result" ? { tag: `debug-result:${runKey}` } : {}),
  };
}

function buildSingleRequest({ workflowId, parent, parentTitle, runKey, applyMode }) {
  const stepId = applyMode === "bundle" ? "bundle" : "result";
  const skillId = applyMode === "bundle" ? BUNDLE_SKILL_ID : RESULT_SKILL_ID;
  return {
    kind: "skillrunner.job.v1",
    skill_id: skillId,
    mode: "auto",
    targetParentID: parent.id,
    taskName: parentTitle,
    input: {},
    parameter: buildStepParameter({ workflowId, stepId, runKey, applyMode }),
    fetch_type: applyMode,
    poll: {
      interval_ms: 1000,
      timeout_ms: 180000,
    },
  };
}

function buildSequenceStep({
  workflowId,
  stepId,
  runKey,
  applyMode,
  workspace,
  mode = "auto",
  skillId,
  applyResult = true,
}) {
  const resolvedSkillId =
    normalizeString(skillId) ||
    (applyMode === "bundle" ? BUNDLE_SKILL_ID : RESULT_SKILL_ID);
  return {
    id: stepId,
    skill_id: resolvedSkillId,
    mode,
    workspace,
    fetch_type: applyMode,
    ...(applyResult
      ? {
          apply_result: {
            workflow_id: workflowId,
            on_failure: "fail_sequence",
          },
        }
      : {}),
    handoff: {
      pass_through: false,
      required: false,
    },
    input: {},
    parameter: buildStepParameter({ workflowId, stepId, runKey, applyMode }),
  };
}

function buildSequenceRequest({
  workflowId,
  parent,
  parentTitle,
  runKey,
  steps,
}) {
  return {
    kind: "skillrunner.sequence.v1",
    targetParentID: parent.id,
    taskName: parentTitle,
    steps,
    final_step_id: steps[steps.length - 1].id,
    parameter: {
      workflow_id: workflowId,
      run_key: runKey,
    },
    poll: {
      interval_ms: 1000,
      timeout_ms: 300000,
    },
  };
}

async function buildRequestImpl({ manifest, executionOptions, runtime }) {
  const runKey = randomRunKey();
  const { parent, title, workflowId } = await createTestParent({
    manifest,
    runtime,
    runKey,
  });
  const params = resolveWorkflowParams(executionOptions);

  switch (workflowId) {
    case "debug-apply-single-bundle":
      return buildSingleRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        applyMode: "bundle",
      });
    case "debug-apply-single-result":
      return buildSingleRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        applyMode: "result",
      });
    case "debug-apply-sequence-bundle":
      return buildSequenceRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        steps: [
          buildSequenceStep({
            workflowId,
            stepId: "bundle_one",
            runKey,
            applyMode: "bundle",
            workspace: "new",
          }),
          buildSequenceStep({
            workflowId,
            stepId: "bundle_two",
            runKey,
            applyMode: "bundle",
            workspace: "reuse-workflow",
          }),
        ],
      });
    case "debug-apply-sequence-result":
      return buildSequenceRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        steps: [
          buildSequenceStep({
            workflowId,
            stepId: "result_one",
            runKey,
            applyMode: "result",
            workspace: "new",
          }),
          buildSequenceStep({
            workflowId,
            stepId: "result_two",
            runKey,
            applyMode: "result",
            workspace: "reuse-workflow",
          }),
        ],
      });
    case "debug-apply-bundle-then-result": {
      const steps = [
        buildSequenceStep({
          workflowId,
          stepId: "bundle",
          runKey,
          applyMode: "bundle",
          workspace: "new",
        }),
      ];
      if (params.runResultStep) {
        steps.push(
          buildSequenceStep({
            workflowId,
            stepId: "result",
            runKey,
            applyMode: "result",
            workspace: "reuse-workflow",
          }),
        );
      }
      return buildSequenceRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        steps,
      });
    }
    case "debug-apply-result-then-bundle": {
      const steps = params.skipResultStep
        ? []
        : [
            buildSequenceStep({
              workflowId,
              stepId: "result",
              runKey,
              applyMode: "result",
              workspace: "new",
            }),
          ];
      steps.push(
        buildSequenceStep({
          workflowId,
          stepId: "bundle",
          runKey,
          applyMode: "bundle",
          workspace: steps.length === 0 ? "new" : "reuse-workflow",
        }),
      );
      return buildSequenceRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        steps,
      });
    }
    case "debug-interactive-then-result":
      return buildSequenceRequest({
        workflowId,
        parent,
        parentTitle: title,
        runKey,
        steps: [
          buildSequenceStep({
            workflowId,
            stepId: "interactive",
            runKey,
            applyMode: "result",
            workspace: "new",
            mode: "interactive",
            skillId: "debug-interactive-choice-probe",
            applyResult: false,
          }),
          buildSequenceStep({
            workflowId,
            stepId: "result",
            runKey,
            applyMode: "result",
            workspace: "reuse-workflow",
            mode: "auto",
          }),
        ],
      });
    default:
      throw new Error(`unsupported debug apply contract workflow: ${workflowId}`);
  }
}

export async function buildRequest(args) {
  return buildRequestImpl(args || {});
}

export const __debugApplyContractBuildRequestTestOnly = {
  resolveWorkflowParams,
};

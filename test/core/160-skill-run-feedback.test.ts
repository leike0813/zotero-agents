import { assert } from "chai";
import { setPref } from "../../src/utils/prefs";
import { executeBuildRequests } from "../../src/workflows/runtime";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  ACP_SKILL_PATCH_TEMPLATES_BY_MODULE,
  loadAcpSkillPatchTemplate,
} from "../../src/modules/acpSkillPatchTemplates";

function workflow(): LoadedWorkflow {
  return {
    manifest: {
      id: "feedback-runtime-option",
      label: "Feedback Runtime Option",
      provider: "skillrunner",
      trigger: { requiresSelection: false },
      inputs: { unit: "workflow" },
      execution: { skillrunner_mode: "interactive" },
      request: {
        kind: "skillrunner.job.v1",
        create: { skill_id: "demo-skill" },
      },
      hooks: {},
    },
    hooks: {},
    rootDir: "",
    manifestPath: "",
  } as LoadedWorkflow;
}

describe("skill run feedback runtime option", function () {
  beforeEach(function () {
    setPref("collectSkillRunFeedbackEnabled", false);
  });

  afterEach(function () {
    setPref("collectSkillRunFeedbackEnabled", false);
  });

  it("omits collect_skill_run_feedback while the preference is disabled", async function () {
    const requests = await executeBuildRequests({
      workflow: workflow(),
      selectionContext: {},
    });
    assert.isUndefined(
      (requests[0] as any).runtime_options?.collect_skill_run_feedback,
    );
  });

  it("adds collect_skill_run_feedback without replacing existing runtime options", async function () {
    setPref("collectSkillRunFeedbackEnabled", true);
    const requests = await executeBuildRequests({
      workflow: workflow(),
      selectionContext: {},
    });
    assert.equal(
      (requests[0] as any).runtime_options?.collect_skill_run_feedback,
      true,
    );
    assert.equal(
      (requests[0] as any).runtime_options?.execution_mode,
      "interactive",
    );
  });

  it("loads the feedback patch template from the ACP patch registry", async function () {
    const template = await loadAcpSkillPatchTemplate(
      ACP_SKILL_PATCH_TEMPLATES_BY_MODULE.skill_run_feedback,
    );
    assert.include(template, "{feedback_path}");
  });
});

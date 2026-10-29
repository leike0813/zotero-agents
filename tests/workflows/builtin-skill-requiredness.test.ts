import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acp/skillRun/acpSkillSchemaAssets";
import {
  assertRequiredWorkflowParameters,
  listMissingRequiredWorkflowParameters,
} from "../../src/modules/workflow/settings/workflowSettingsDomain";
import { loadWorkflowManifests } from "../../src/workflows/loader";

describe("builtin Skill request contracts", function () {
  it("requires manuscript inputs in the builtin workflow manifests", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const cases = [
      {
        id: "export-research-bundle",
        missing: ["paperTitle", "researchContent"],
        valid: {
          paperTitle: "Graph-grounded review",
          researchContent: "Citation graph evidence for a synthesis paper.",
        },
      },
      {
        id: "manuscript-literature-framing",
        missing: ["paperTitle"],
        valid: {
          paperTitle: "Graph-grounded review",
        },
      },
    ];

    for (const entry of cases) {
      const workflow = loaded.workflows.find(
        (candidate) => candidate.manifest.id === entry.id,
      );
      assert.isOk(workflow, entry.id);
      assert.deepEqual(
        listMissingRequiredWorkflowParameters(workflow!.manifest, {}),
        entry.missing,
        entry.id,
      );
      let thrown: unknown;
      try {
        assertRequiredWorkflowParameters(workflow!.manifest, {});
      } catch (error) {
        thrown = error;
      }
      const contractError = thrown as Error & {
        code?: string;
        requiredFields?: string[];
      };
      assert.instanceOf(contractError, Error, entry.id);
      assert.equal(
        contractError.code,
        "missing_required_workflow_parameter",
      );
      assert.deepEqual(contractError.requiredFields, entry.missing);
      assert.deepEqual(
        listMissingRequiredWorkflowParameters(workflow!.manifest, entry.valid),
        [],
        entry.id,
      );
      assert.doesNotThrow(
        () => assertRequiredWorkflowParameters(workflow!.manifest, entry.valid),
        entry.id,
      );
    }
  });

  it("declares Tag Bootstrapper language input as an optional string", async function () {
    const skillDir = path.resolve("skills_builtin", "tag-bootstrapper");
    const runnerJson = JSON.parse(
      await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
    );
    assert.deepEqual(runnerJson.schemas, {
      input: "assets/input.schema.json",
      parameter: "assets/parameter.schema.json",
      output: "assets/output.schema.json",
    });
    const request = (parameter: Record<string, unknown>) => ({
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "tag-bootstrapper",
      input: {
        existing_tags: [],
        protocol: { facets: [], tag_pattern: ".+", max_tag_length: 40 },
      },
      parameter,
    });
    const validate = (parameter: Record<string, unknown>) =>
      validateAcpSkillRunRequestAgainstSchemas({
        request: request(parameter),
        runnerJson,
        skillDir,
        workspaceDir: skillDir,
      });

    assert.isTrue(
      (await validate({ tag_note_language: "en-US" })).ok,
      "a string language should be accepted",
    );
    assert.isTrue(
      (await validate({})).ok,
      "an omitted language should retain the Skill default",
    );
    assert.isFalse(
      (await validate({ tag_note_language: { locale: "en-US" } })).ok,
      "a non-string language should be rejected",
    );
  });
});

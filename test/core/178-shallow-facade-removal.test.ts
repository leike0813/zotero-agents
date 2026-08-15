import { assert } from "chai";
import fs from "node:fs/promises";

async function assertFileMissing(filePath: string) {
  try {
    await fs.access(filePath);
    assert.fail(`expected file to be deleted: ${filePath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function readSource(filePath: string) {
  return fs.readFile(filePath, "utf8");
}

describe("shallow re-export facades", function () {
  it("deletes the ACP skill run dashboard facade", async function () {
    await assertFileMissing("src/modules/acpSkillRunDashboardFacade.ts");
  });

  it("deletes the workflow selection policy facade", async function () {
    await assertFileMissing("src/modules/workflowSelectionPolicy.ts");
  });

  it("host bridge dynamic imports point at acpSkillRunStore", async function () {
    const source = await readSource(
      "src/modules/hostBridgeCapabilityRegistry.ts",
    );

    assert.include(source, 'import("./acpSkillRunStore")');
    assert.include(source, "acpSkillRunStore");
    assert.notInclude(source, "acpSkillRunDashboardFacade");
    assert.notInclude(source, "acpSkillRunDashboard");
  });

  it("hooks dynamic import points at acpSkillRunStore", async function () {
    const source = await readSource("src/hooks.ts");

    assert.include(source, 'import("./modules/acpSkillRunStore")');
    assert.include(source, "acpSkillRunStore");
    assert.notInclude(source, "acpSkillRunDashboardFacade");
    assert.notInclude(source, "acpSkillRuns.listAcpSkillRunSummaries");
  });

  it("workflow selection importers point at triggerPolicy", async function () {
    const importers: Array<{ file: string; path: string }> = [
      {
        file: "src/modules/workflowExecution/applySeam.ts",
        path: "../../workflows/triggerPolicy",
      },
      {
        file: "src/modules/workflowExecution/preparationSeam.ts",
        path: "../../workflows/triggerPolicy",
      },
      {
        file: "src/modules/workflowMenu.ts",
        path: "../workflows/triggerPolicy",
      },
      {
        file: "src/modules/taskManagerDialog.ts",
        path: "../workflows/triggerPolicy",
      },
      {
        file: "src/modules/hostBridgeWorkflowControl.ts",
        path: "../workflows/triggerPolicy",
      },
      {
        file: "src/modules/skillRunnerForegroundContinuation.ts",
        path: "../workflows/triggerPolicy",
      },
    ];

    for (const importer of importers) {
      const source = await readSource(importer.file);
      assert.include(
        source,
        `from "${importer.path}"`,
        `${importer.file} should import triggerPolicy directly`,
      );
      assert.notInclude(
        source,
        "workflowSelectionPolicy",
        `${importer.file} should not use the facade`,
      );
    }
  });
});

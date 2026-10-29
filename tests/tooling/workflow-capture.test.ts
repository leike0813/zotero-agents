import { assert } from "chai";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stageWorkflowCapture } from "../../scripts/system-e2e/workflowCapture";

async function expectFailure(run: () => Promise<unknown>, expected: RegExp) {
  let code = "";
  try {
    await run();
  } catch (error) {
    code = (error as Error).message;
  }
  assert.match(code, expected);
}

describe("Workflow live capture staging", function () {
  it("copies private input into the isolated test data and rejects shared gold state", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "workflow-capture-"));
    try {
      const source = path.join(root, "private-input");
      const target = path.join(root, "test");
      await mkdir(source);
      await writeFile(path.join(source, "source.json"), "{}");
      await writeFile(path.join(source, "sample.pdf"), "synthetic bytes");
      const offlineTarget = path.join(root, "offline");
      assert.equal(
        await stageWorkflowCapture({ testRoot: offlineTarget, env: {} }),
        path.join(offlineTarget, "data", "workflow-e2e"),
      );
      const env = {
        ZOTERO_WORKFLOW_E2E_MODE: "live",
        ZOTERO_WORKFLOW_E2E_SOURCE: source,
      };
      const staged = await stageWorkflowCapture({ testRoot: target, env });
      assert.equal(staged, path.join(target, "data", "workflow-e2e"));
      await writeFile(path.join(staged!, "sample.pdf"), "changed copy");
      assert.equal(
        await readFile(path.join(source, "sample.pdf"), "utf8"),
        "synthetic bytes",
      );
      for (const conflict of [
        { ZOTERO_E2E_GOLD_DATA_DIR: source },
        { ZOTERO_E2E_GOLD_PROFILE_DIR: source },
        { ZOTERO_E2E_FIXTURE: "gold" },
        { ZOTERO_SYSTEM_E2E_RESUME_ROOT: source },
      ]) {
        let code = "";
        try {
          await stageWorkflowCapture({
            testRoot: target,
            env: { ...env, ...conflict },
          });
        } catch (error) {
          code = (error as Error).message;
        }
        assert.equal(code, "workflow_capture_requires_fresh_profile");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stages only synthetic input in default and explicit offline modes", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "workflow-offline-"));
    const fixtureSource = path.resolve(
      "tests/fixtures/workflow-happy-path/source",
    );
    const fixtureSourceJson = await readFile(
      path.join(fixtureSource, "source.json"),
      "utf8",
    );
    const manifest = JSON.parse(fixtureSourceJson) as {
      schemaVersion: string;
      items: Array<{ pdfs: Array<{ path: string }> }>;
      facts: { pdfs: number };
    };
    try {
      for (const mode of [undefined, "offline"] as const) {
        const label = mode || "default";
        const testRoot = path.join(root, label);
        await mkdir(path.join(testRoot, "data"), { recursive: true });
        await mkdir(path.join(testRoot, "profile"), { recursive: true });
        await writeFile(path.join(testRoot, "data", "keep.txt"), label);
        await writeFile(path.join(testRoot, "profile", "prefs.js"), label);
        const staged = await stageWorkflowCapture({
          testRoot,
          env: {
            ...(mode ? { ZOTERO_WORKFLOW_E2E_MODE: mode } : {}),
            ZOTERO_WORKFLOW_E2E_SOURCE: path.join(root, "private-source"),
            ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: path.join(
              root,
              "private-continue",
            ),
          },
        });
        assert.deepEqual(
          JSON.parse(
            await readFile(path.join(staged!, "fixture.json"), "utf8"),
          ),
          JSON.parse(
            await readFile(path.join(fixtureSource, "fixture.json"), "utf8"),
          ),
        );
        assert.equal(staged, path.join(testRoot, "data", "workflow-e2e"));
        assert.equal(
          await readFile(path.join(staged!, "source.json"), "utf8"),
          fixtureSourceJson,
        );
        assert.equal(manifest.schemaVersion, "workflow-e2e-private-source.v1");
        assert.lengthOf(manifest.items, 20);
        assert.equal(manifest.facts.pdfs, 20);
        const pdfs = await readdir(path.join(staged!, "pdfs"));
        assert.deepEqual(
          new Set(pdfs),
          new Set(
            manifest.items.flatMap((item) =>
              item.pdfs.map((pdf) => path.basename(pdf.path)),
            ),
          ),
        );
        const fixturePdf = await readFile(
          path.join(fixtureSource, "pdfs", "SYNPDF01.pdf"),
        );
        const stagedPdf = path.join(staged!, "pdfs", "SYNPDF01.pdf");
        assert.deepEqual(await readFile(stagedPdf), fixturePdf);
        await writeFile(stagedPdf, "changed copy");
        assert.deepEqual(
          await readFile(path.join(fixtureSource, "pdfs", "SYNPDF01.pdf")),
          fixturePdf,
        );
        assert.equal(
          await readFile(path.join(testRoot, "data", "keep.txt"), "utf8"),
          label,
        );
        assert.equal(
          await readFile(path.join(testRoot, "profile", "prefs.js"), "utf8"),
          label,
        );
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("restores a stopped private capture as independent continuation evidence", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "workflow-continue-"));
    try {
      const prior = path.join(root, "prior");
      const target = path.join(root, "test");
      await mkdir(path.join(prior, "stopped-data", "workflow-e2e"), {
        recursive: true,
      });
      await mkdir(path.join(prior, "stopped-profile"), { recursive: true });
      await writeFile(
        path.join(prior, "stopped-data", "workflow-e2e", "source.json"),
        JSON.stringify({ schemaVersion: "workflow-e2e-private-source.v1" }),
      );
      await writeFile(
        path.join(prior, "stopped-data", "workflow-e2e", "sample.pdf"),
        "synthetic bytes",
      );
      await writeFile(path.join(prior, "stopped-data", "keep.txt"), "restored");
      await writeFile(
        path.join(prior, "stopped-profile", "prefs.js"),
        "// restored prefs",
      );
      await writeFile(
        path.join(prior, "stopped-profile", "parent.lock"),
        "locked",
      );
      await writeFile(
        path.join(prior, "capture-state.json"),
        JSON.stringify({
          stage: "tag-bootstrapper",
          status: "stopped",
          fixtureAdmitted: false,
        }),
      );
      await writeFile(
        path.join(prior, "checkpoint.json"),
        JSON.stringify({
          stage: "tag-bootstrapper",
          status: "awaiting_business_flow_review",
          completed: ["tag-bootstrapper"],
          nextStep: 2,
        }),
      );
      const importDocument = {
        imported: [{ sourceKey: "KEY1", id: 11, pdfIds: [12] }],
        collections: [3],
        facts: { items: 1, pdfs: 1, missingPdfs: 0, collections: 1 },
      };
      await writeFile(
        path.join(prior, "import.json"),
        JSON.stringify(importDocument),
      );

      const staged = await stageWorkflowCapture({
        testRoot: target,
        env: {
          ZOTERO_WORKFLOW_E2E_MODE: "live",
          ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: prior,
        },
      });
      assert.equal(staged, path.join(target, "data", "workflow-e2e"));
      assert.equal(
        await readFile(
          path.join(target, "data", "workflow-e2e", "source.json"),
          "utf8",
        ),
        JSON.stringify({ schemaVersion: "workflow-e2e-private-source.v1" }),
      );
      assert.equal(
        await readFile(path.join(target, "data", "keep.txt"), "utf8"),
        "restored",
      );
      assert.equal(
        await readFile(path.join(target, "profile", "prefs.js"), "utf8"),
        "// restored prefs",
      );
      // Lock files never survive the restore, and the source stays untouched.
      for (const name of ["parent.lock", ".parentlock", "lock"])
        await expectFailure(
          () => readFile(path.join(target, "profile", name), "utf8"),
          /ENOENT/,
        );
      assert.equal(
        await readFile(
          path.join(prior, "stopped-profile", "parent.lock"),
          "utf8",
        ),
        "locked",
      );
      // The restored copy is independent from the prior evidence.
      await writeFile(path.join(target, "data", "keep.txt"), "changed copy");
      assert.equal(
        await readFile(path.join(prior, "stopped-data", "keep.txt"), "utf8"),
        "restored",
      );

      const metadata = JSON.parse(
        await readFile(
          path.join(target, "data", "workflow-e2e", "continuation.json"),
          "utf8",
        ),
      );
      assert.equal(metadata.priorEvidenceRoot, path.resolve(prior));
      assert.deepEqual(metadata.imported, importDocument);
      assert.deepEqual(metadata.completed, ["tag-bootstrapper"]);

      for (const conflict of [
        { ZOTERO_E2E_GOLD_DATA_DIR: prior },
        { ZOTERO_E2E_GOLD_PROFILE_DIR: prior },
        { ZOTERO_E2E_FIXTURE: "gold" },
        { ZOTERO_SYSTEM_E2E_RESUME_ROOT: prior },
      ]) {
        const conflicted = path.join(
          root,
          `conflicted-${Object.keys(conflict)[0]}`,
        );
        let code = "";
        try {
          await stageWorkflowCapture({
            testRoot: conflicted,
            env: {
              ZOTERO_WORKFLOW_E2E_MODE: "live",
              ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: prior,
              ...conflict,
            },
          });
        } catch (error) {
          code = (error as Error).message;
        }
        assert.equal(code, "workflow_capture_requires_fresh_profile");
        await expectFailure(
          () => readFile(path.join(conflicted, "any"), "utf8"),
          /ENOENT/,
        );
      }

      const brokenState = path.join(root, "broken-state");
      await mkdir(brokenState, { recursive: true });
      await writeFile(
        path.join(brokenState, "capture-state.json"),
        JSON.stringify({ status: "running", fixtureAdmitted: true }),
      );
      await expectFailure(
        () =>
          stageWorkflowCapture({
            testRoot: path.join(root, "broken-target"),
            env: {
              ZOTERO_WORKFLOW_E2E_MODE: "live",
              ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: brokenState,
            },
          }),
        /workflow_capture_continue_state_invalid/,
      );

      await expectFailure(
        () =>
          stageWorkflowCapture({
            testRoot: path.join(prior, "nested", "test"),
            env: {
              ZOTERO_WORKFLOW_E2E_MODE: "live",
              ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: prior,
            },
          }),
        /workflow_capture_continue_overlap/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

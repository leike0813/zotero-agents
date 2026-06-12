import { assert } from "chai";
import {
  inferDomainFromFilePath,
  isZoteroRoutineAllowedFile,
  isZoteroRoutineAllowedTitle,
} from "../zotero/domainFilter";

describe("domain filter path inference", function () {
  it("infers core domain from relative path", function () {
    const domain = inferDomainFromFilePath("test/core/00-startup.test.ts");
    assert.equal(domain, "core");
  });

  it("infers ui domain from relative path", function () {
    const domain = inferDomainFromFilePath(
      "test/ui/01-startup-workflow-menu-init.test.ts",
    );
    assert.equal(domain, "ui");
  });

  it("infers workflow domain from relative path", function () {
    const domain = inferDomainFromFilePath(
      "test/workflow-literature-digest/21-workflow-literature-digest.test.ts",
    );
    assert.equal(domain, "workflow");
  });

  it("infers domain from absolute path", function () {
    const domain = inferDomainFromFilePath(
      "D:/Workspace/Code/JavaScript/Zotero-Skills/test/core/00-startup.test.ts",
    );
    assert.equal(domain, "core");
  });

  it("infers domain from windows backslash path", function () {
    const domain = inferDomainFromFilePath(
      "D:\\Workspace\\Code\\JavaScript\\Zotero-Skills\\test\\ui\\40-gui-preferences-menu-scan.test.ts",
    );
    assert.equal(domain, "ui");
  });

  it("returns all for unknown path", function () {
    const domain = inferDomainFromFilePath("test/misc/unknown.test.ts");
    assert.equal(domain, "all");
  });

  it("allows retained Zotero core smoke files", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/core/41-workflow-scan-registration.test.ts",
        "lite",
      ),
      true,
    );
  });

  it("prunes non-retained Zotero core files from routine suite", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/core/73a-skillrunner-deploy-lifecycle.test.ts",
        "lite",
      ),
      false,
    );
  });

  it("allows thickened Zotero lite core parity files", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/core/11-selection-context-rebuild.test.ts",
        "lite",
      ),
      true,
    );
  });

  it("allows full-only core parity files only in Zotero full", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/core/63-job-queue-progress.test.ts",
        "lite",
      ),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/core/63-job-queue-progress.test.ts",
        "full",
      ),
      true,
    );
  });

  it("allows stable Zotero full coverage-gate core files only in full", function () {
    assert.equal(
      isZoteroRoutineAllowedFile("test/core/42-task-runtime.test.ts", "lite"),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedFile("test/core/42-task-runtime.test.ts", "full"),
      true,
    );
  });

  it("allows retained Zotero workflow smoke files", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/workflow-literature-digest/21-workflow-literature-digest.test.ts",
        "lite",
      ),
      true,
    );
  });

  it("prunes non-retained workflow files from Zotero routine suite", function () {
    assert.equal(
      isZoteroRoutineAllowedFile(
        "test/workflow-custom-legacy/63-custom-import-protocol.test.ts",
        "lite",
      ),
      false,
    );
  });

  it("allows retained Zotero workflow smoke titles", function () {
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: mineru materializes full.md/images, rewrites image paths, and attaches markdown to parent",
        mode: "lite",
      }),
      true,
    );
  });

  it("allows thickened Zotero lite workflow parity titles", function () {
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: literature-digest skips build for core idempotent note shapes",
        mode: "lite",
      }),
      true,
    );
  });

  it("allows full-only parity titles only in Zotero full", function () {
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: literature-workbench import/export notes exports conversation notes through the unified markdown-backed note codec",
        mode: "lite",
      }),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: literature-workbench import/export notes exports conversation notes through the unified markdown-backed note codec",
        mode: "full",
      }),
      true,
    );
  });

  it("allows stable suite-wide full coverage titles only in Zotero full", function () {
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "core",
        testDomain: "all",
        fullTitle:
          "task runtime captures provider requestId from job execution result",
        mode: "lite",
      }),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "core",
        testDomain: "all",
        fullTitle:
          "task runtime captures provider requestId from job execution result",
        mode: "full",
      }),
      true,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: literature-digest upserts existing generated notes and keeps each kind unique",
        mode: "lite",
      }),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: literature-digest upserts existing generated notes and keeps each kind unique",
        mode: "full",
      }),
      true,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "ui",
        testDomain: "all",
        fullTitle:
          "gui: preference scripts renders inline progressmeter from runtime snapshot actionProgress",
        mode: "lite",
      }),
      false,
    );
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "ui",
        testDomain: "all",
        fullTitle:
          "gui: preference scripts renders inline progressmeter from runtime snapshot actionProgress",
        mode: "full",
      }),
      true,
    );
  });

  it("prunes non-retained Zotero workflow titles", function () {
    assert.equal(
      isZoteroRoutineAllowedTitle({
        selectedDomain: "workflow",
        testDomain: "all",
        fullTitle:
          "workflow: custom legacy panel builds deterministic export text",
        mode: "full",
      }),
      false,
    );
  });
});

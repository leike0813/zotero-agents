import { assert } from "chai";
import * as fs from "fs/promises";
import * as path from "path";

const PROFILE_SOURCE = path.join(
  process.cwd(),
  "profiles_src/hermes/zotero-librarian",
);

const REQUIRED_FILES = [
  "README.md",
  "SOUL.md",
  "config.yaml",
  "assets/agent-helper-surface.json",
  "scripts/install_zotero_bridge_cli.py",
  "scripts/zotero_librarian_service.py",
  "skills/zotero-librarian/SKILL.md",
  "skills/zotero-librarian/references/resident-operations.md",
  "skills/zotero-librarian/references/automation-policy.md",
  "skills/zotero-librarian/references/state-and-recovery.md",
  "cron/index-refresh.yaml",
  "cron/workflow-catalog-refresh.yaml",
  "cron/run-monitor.yaml",
  "cron/notification-sync.yaml",
  "cron/workflow-status-triage.yaml",
  "cron/library-hygiene.yaml",
  "cron/attention-queue.yaml",
];

async function read(relativePath: string) {
  return fs.readFile(path.join(PROFILE_SOURCE, relativePath), "utf8");
}

describe("zotero-librarian hosted source profile", function () {
  this.timeout(15_000);

  it("has one resident service and no legacy runner or fragmented manuals", async function () {
    for (const relativePath of REQUIRED_FILES) {
      assert.isTrue(
        (await fs.stat(path.join(PROFILE_SOURCE, relativePath))).isFile(),
        relativePath,
      );
    }
    for (const removed of [
      "scripts/zotero_librarian_index_service.py",
      "scripts/zotero_librarian_workflow_service.py",
      "scripts/zotero_librarian_notification_service.py",
      "skills/zotero-workflow-agent-runner/SKILL.md",
      "skills/zotero-librarian/references/common-tasks.md",
    ]) {
      let exists = true;
      try {
        await fs.access(path.join(PROFILE_SOURCE, removed));
      } catch {
        exists = false;
      }
      assert.isFalse(exists, removed);
    }
  });

  it("makes SKILL.md the minimal executable contract and links every reference", async function () {
    const skill = await read("skills/zotero-librarian/SKILL.md");
    assert.match(skill, /^---\nname: zotero-librarian\ndescription: .+\n---/);
    assert.notInclude(skill, "license:");
    for (const heading of [
      "## Goal",
      "## Inputs",
      "## Workflow",
      "## Hard constraints",
      "## Completion",
      "## Failure handling",
      "## References",
    ]) {
      assert.include(skill, heading);
    }
    for (const reference of [
      "resident-operations.md",
      "automation-policy.md",
      "state-and-recovery.md",
    ]) {
      assert.include(skill, `references/${reference}`);
    }
    const refs = await fs.readdir(
      path.join(PROFILE_SOURCE, "skills/zotero-librarian/references"),
    );
    assert.sameMembers(refs, [
      "automation-policy.md",
      "resident-operations.md",
      "state-and-recovery.md",
    ]);
    assert.include(skill, "## Natural-language intake");
    assert.include(skill, "## Receipt contract");
    assert.include(skill, "cron");
    assert.isAtLeast(skill.split(/\r?\n/).length, 200);
  });

  it("keeps each resident reference comprehensive and domain-owned", async function () {
    const expected: Record<string, string[]> = {
      "resident-operations.md": [
        "Operation contract matrix",
        "Index and library questions",
        "Workflow catalog and run supervision",
        "Notifications",
        "Scheduled passes",
        "Completion evidence and failures",
      ],
      "automation-policy.md": [
        "Authority matrix",
        "Workflow mode and delegation",
        "Plan and submit",
        "Provider profiles and concurrency",
        "Cron and maintenance",
        "Interaction and reporting",
      ],
      "state-and-recovery.md": [
        "State ownership and schema",
        "Freshness and atomic updates",
        "Recovery sequence",
        "Handle and uncertain outcomes",
        "Installation and profile recovery",
      ],
    };
    for (const [file, sections] of Object.entries(expected)) {
      const reference = await read(
        `skills/zotero-librarian/references/${file}`,
      );
      for (const section of sections) {
        assert.include(reference, `## ${section}`, `${file}: ${section}`);
      }
      assert.isAtLeast(
        reference.split(/\r?\n/).length,
        350,
        `${file} is too shallow for a context-free resident agent`,
      );
    }
  });

  it("keeps resident automation one-pass, receipt-based, and unable to submit from cron", async function () {
    const service = await read("scripts/zotero_librarian_service.py");
    assert.include(
      service,
      'RECEIPT_SCHEMA = "zotero-librarian.operation-receipt.v1"',
    );
    assert.include(service, 'STATE_SCHEMA = "zotero-librarian.state.v2"');
    assert.include(service, '"state.sqlite"');
    assert.include(service, '"--allow-submit"');
    assert.include(service, "workflow_plans");
    assert.include(service, "workflow_plan_entries");
    assert.notInclude(service, "notification wait");

    for (const relativePath of REQUIRED_FILES.filter((name) =>
      name.startsWith("cron/"),
    )) {
      const cron = await read(relativePath);
      assert.include(cron, "scripts/zotero_librarian_service.py", relativePath);
      assert.include(cron, "--quiet", relativePath);
      assert.include(cron, "mutation: never", relativePath);
      assert.notInclude(cron, "submit", relativePath);
      assert.notInclude(cron, "wait", relativePath);
    }
  });

  it("describes hosted installation and exposes only the consolidated helper", async function () {
    const readme = await read("README.md");
    const soul = await read("SOUL.md");
    const config = await read("config.yaml");
    const helpers = JSON.parse(await read("assets/agent-helper-surface.json"));
    assert.include(readme, "install_zotero_bridge_cli.py");
    assert.include(readme, "without changing `HOME`");
    assert.notInclude(soul, "zotero-bridge");
    assert.include(config, "scripts/zotero_librarian_service.py");
    assert.strictEqual(helpers.schema, "agent-helper-surface.v2");
    assert.deepEqual(
      helpers.helpers.map((helper: { id: string }) => helper.id),
      ["install-zotero-bridge-cli", "zotero-librarian-service"],
    );
  });
});

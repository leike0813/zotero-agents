import { assert } from "chai";
import * as fs from "fs/promises";
import * as path from "path";

const PROFILE_ROOT = path.join(
  process.cwd(),
  "profiles/hermes/zotero-librarian",
);

const REQUIRED_PROFILE_FILES = [
  "distribution.yaml",
  ".gitignore",
  "SOUL.md",
  "config.yaml",
  "README.md",
  "skills/zotero-librarian/SKILL.md",
  "skills/zotero-librarian/references/host-bridge.md",
  "skills/zotero-librarian/references/workflows.md",
  "skills/zotero-librarian/references/library-maintenance.md",
  "scripts/zotero_librarian_index_service.py",
  "scripts/install_zotero_bridge_cli.py",
  "cron/index-refresh.yaml",
  "cron/workflow-catalog-refresh.yaml",
  "cron/run-monitor.yaml",
  "cron/inbox-triage.yaml",
  "cron/library-hygiene.yaml",
  "cron/attention-queue.yaml",
  "assets/host-bridge/profile.example.json",
];

const EXPECTED_PLATFORMS = [
  "win32-x64",
  "darwin-x64",
  "darwin-arm64",
  "linux-x86",
  "linux-x64",
  "linux-arm",
  "linux-arm64",
];

async function readProfile(relativePath: string) {
  return fs.readFile(path.join(PROFILE_ROOT, relativePath), "utf8");
}

describe("zotero-librarian Hermes profile distribution", function () {
  it("contains the complete profile source layout without runtime state", async function () {
    for (const relativePath of REQUIRED_PROFILE_FILES) {
      const stat = await fs.stat(path.join(PROFILE_ROOT, relativePath));
      assert.isTrue(stat.isFile(), relativePath);
    }

    const gitignore = await readProfile(".gitignore");
    for (const runtimePath of [
      "index.sqlite",
      "*.sqlite",
      "runs/",
      "logs/",
      ".zotero-bridge/",
    ]) {
      assert.include(gitignore, runtimePath);
    }

    const allText = await Promise.all(
      REQUIRED_PROFILE_FILES.map((relativePath) => readProfile(relativePath)),
    );
    const combined = allText.join("\n");
    assert.notMatch(combined, /bearer\s+[A-Za-z0-9._~+/-]{16,}/i);
    assert.notMatch(combined, /"token"\s*:/i);
    assert.notMatch(combined, /C:\\Users\\|\/Users\/|\/home\//);
  });

  it("ships a tokenEnv based Host Bridge profile example", async function () {
    const sourceTemplate = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "skills_builtin/zotero-bridge-cli/assets/profile.template.json",
        ),
        "utf8",
      ),
    );
    const profileExample = JSON.parse(
      await readProfile("assets/host-bridge/profile.example.json"),
    );

    assert.strictEqual(profileExample.schema, "zotero-bridge.profile.v1");
    assert.strictEqual(profileExample.protocol, "host-bridge.v1");
    assert.strictEqual(profileExample.auth?.type, "bearer");
    assert.strictEqual(profileExample.auth?.tokenEnv, "ZOTERO_BRIDGE_TOKEN");
    assert.isUndefined(profileExample.auth?.token);
    assert.deepEqual(profileExample, sourceTemplate);
  });

  it("renders Host Bridge and workflow references from generated sections", async function () {
    const hostBridgeReference = await readProfile(
      "skills/zotero-librarian/references/host-bridge.md",
    );
    const workflowReference = await readProfile(
      "skills/zotero-librarian/references/workflows.md",
    );

    assert.include(
      hostBridgeReference,
      "<!-- zotero-librarian:host-bridge:start -->",
    );
    assert.include(
      hostBridgeReference,
      "<!-- zotero-librarian:host-bridge:end -->",
    );
    assert.include(hostBridgeReference, "library.sync_snapshot");
    assert.include(hostBridgeReference, "`zotero-bridge library snapshot`");
    assert.include(hostBridgeReference, "`zotero-bridge library list`");

    assert.include(
      workflowReference,
      "<!-- zotero-librarian:workflow-catalog:start -->",
    );
    assert.include(
      workflowReference,
      "<!-- zotero-librarian:workflow-catalog:end -->",
    );
    assert.include(workflowReference, "workflow-refresh");
    assert.notInclude(workflowReference, "debug_only");
  });

  it("defines concrete cron templates for index, workflow, run, and hygiene jobs", async function () {
    const cronExpectations: Array<[string, string[]]> = [
      [
        "cron/index-refresh.yaml",
        ["every: 6h", "zotero_librarian_index_service.py refresh"],
      ],
      [
        "cron/workflow-catalog-refresh.yaml",
        ["time: \"03:00\"", "workflow-refresh"],
      ],
      ["cron/run-monitor.yaml", ["every: 5m", "run-watch"]],
      [
        "cron/inbox-triage.yaml",
        ["time: \"09:00\"", "status:0-inbox", "no tag"],
      ],
      [
        "cron/library-hygiene.yaml",
        ["weekly: monday", "duplicate DOI", "empty collection"],
      ],
      [
        "cron/attention-queue.yaml",
        ["time: \"18:00\"", "insights attention-queue"],
      ],
    ];

    for (const [relativePath, snippets] of cronExpectations) {
      const source = await readProfile(relativePath);
      for (const snippet of snippets) {
        assert.include(source, snippet, relativePath);
      }
      assert.include(source, "[SILENT]", relativePath);
    }
  });

  it("packages profile distribution checks, rendering, and release scripts", async function () {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
    assert.strictEqual(
      packageJson.scripts["check:zotero-librarian-profile"],
      "tsx scripts/check-zotero-librarian-profile.ts",
    );
    assert.include(
      packageJson.scripts["render:host-bridge-surface"],
      "render-zotero-librarian-profile",
    );

    const renderScript = await fs.readFile(
      "scripts/render-zotero-librarian-profile.ts",
      "utf8",
    );
    assert.include(renderScript, "buildHostBridgeSurfaceCatalog");
    assert.include(renderScript, "workflows_builtin");
    assert.include(renderScript, "zotero-librarian:host-bridge:start");

    const checkScript = await fs.readFile(
      "scripts/check-zotero-librarian-profile.ts",
      "utf8",
    );
    assert.include(checkScript, "library.sync_snapshot");
    assert.include(checkScript, "ZOTERO_LIBRARIAN_STATE_DIR");
    assert.include(checkScript, "tokenEnv");

    const publishScript = await fs.readFile(
      "scripts/publish-zotero-librarian-profile.ps1",
      "utf8",
    );
    assert.include(publishScript, "host-bridge/zotero-librarian-profile");
    assert.include(publishScript, "addon/bin");
    assert.include(publishScript, "assets/zotero-bridge/bin");
    assert.include(publishScript, "manifest.json");
    for (const platform of EXPECTED_PLATFORMS) {
      assert.include(publishScript, platform);
      const stat = await fs.stat(path.join("addon", "bin", platform));
      assert.isTrue(stat.isDirectory(), platform);
    }
  });

  it("implements the local index, workflow catalog, and run monitor commands", async function () {
    const indexService = await readProfile(
      "scripts/zotero_librarian_index_service.py",
    );
    for (const command of [
      "refresh",
      "search",
      "item",
      "stats",
      "workflow-refresh",
      "workflow-show",
      "run-register",
      "run-watch",
    ]) {
      assert.include(indexService, `"${command}"`);
    }
    assert.include(indexService, "ZOTERO_LIBRARIAN_STATE_DIR");
    assert.include(indexService, "HERMES_HOME");
    assert.include(indexService, "index.sqlite");
    assert.include(indexService, "library snapshot");
    assert.include(indexService, "workflow describe");
  });
});

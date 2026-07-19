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
  "skills/zotero-librarian/references/terminology.md",
  "skills/zotero-librarian/references/library-maintenance.md",
  "skills/zotero-librarian/references/workflow-execution-policy.md",
  "skills/zotero-librarian/references/common-tasks.md",
  "skills/zotero-workflow-agent-runner/SKILL.md",
  "skills/zotero-workflow-agent-runner/references/agent-run-playbook.md",
  "scripts/zotero_librarian_index_service.py",
  "scripts/zotero_librarian_workflow_service.py",
  "scripts/zotero_librarian_notification_service.py",
  "scripts/install_zotero_bridge_cli.py",
  "cron/index-refresh.yaml",
  "cron/workflow-catalog-refresh.yaml",
  "cron/run-monitor.yaml",
  "cron/notification-sync.yaml",
  "cron/workflow-status-triage.yaml",
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

    const terminologySource = await fs.readFile(
      path.join(process.cwd(), "skills_src/host-bridge-shared/terminology.md"),
      "utf8",
    );
    const terminologyReference = await readProfile(
      "skills/zotero-librarian/references/terminology.md",
    );
    assert.equal(terminologyReference, terminologySource);
    for (const term of [
      "citation graph",
      "三件套",
      "digest",
      "references",
      "citation-analysis",
      "workflowRunId",
      "skillRunId",
      "fileId",
    ]) {
      assert.include(terminologyReference, term);
    }
  });

  it("documents the standalone repository install path", async function () {
    const readme = await readProfile("README.md");
    const sourceReadme = await fs.readFile(
      path.join(
        process.cwd(),
        "profiles_src/hermes/zotero-librarian/README.md",
      ),
      "utf8",
    );
    const distribution = await readProfile("distribution.yaml");

    assert.strictEqual(readme, sourceReadme);
    assert.include(readme, "https://github.com/leike0813/zotero-agents");
    assert.include(
      readme,
      "hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>",
    );
    assert.include(
      distribution,
      "repository: https://github.com/leike0813/zotero-librarian-profile",
    );
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

  it("bootstraps the Host Bridge well-known profile without changing HOME", async function () {
    const installer = await readProfile("scripts/install_zotero_bridge_cli.py");
    const soul = await readProfile("SOUL.md");
    const readme = await readProfile("README.md");
    const config = await readProfile("config.yaml");

    for (const snippet of [
      "link_well_known_profile",
      "current_well_known_profile",
      "infer_host_home_from_hermes_home",
      "ZOTERO_BRIDGE_HOST_PROFILE",
      "ZOTERO_BRIDGE_HOST_HOME",
      "bridge-profile.json",
      ".hermes",
      "symlink_to",
      "--no-link-well-known-profile",
      "--force-profile-link",
    ]) {
      assert.include(installer, snippet);
    }

    assert.include(config, "wellKnownProfileLink:");
    assert.include(config, "hostProfileEnv: ZOTERO_BRIDGE_HOST_PROFILE");
    assert.include(soul, "scripts/install_zotero_bridge_cli.py");
    assert.include(soul, "do not change `HOME`");
    assert.include(readme, "without changing `HOME`");
    assert.include(readme, "ZOTERO_BRIDGE_HOST_PROFILE");
  });

  it("renders Host Bridge and workflow references from generated sections", async function () {
    const hostBridgeReference = await readProfile(
      "skills/zotero-librarian/references/host-bridge.md",
    );
    const workflowReference = await readProfile(
      "skills/zotero-librarian/references/workflows.md",
    );
    const release = JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), "cli/zotero-bridge/release.json"),
        "utf8",
      ),
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
    assert.include(hostBridgeReference, "library.readiness_audit");
    assert.include(hostBridgeReference, "`zotero-bridge library snapshot`");
    assert.include(hostBridgeReference, "`zotero-bridge library items list`");
    assert.include(
      hostBridgeReference,
      "`zotero-bridge library readiness missing-analysis`",
    );
    assert.include(hostBridgeReference, release.version);
    assert.include(hostBridgeReference, "zotero-bridge --version");
    assert.include(hostBridgeReference, "--help");
    assert.include(
      hostBridgeReference,
      "Version mismatch alone is not a blocker",
    );
    assert.include(hostBridgeReference, "surface identity --json");

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

    const skill = await readProfile("skills/zotero-librarian/SKILL.md");
    assert.include(skill, "references/terminology.md");
    assert.include(skill, "references/workflow-execution-policy.md");
    assert.include(skill, "references/common-tasks.md");
    assert.include(skill, "$zotero-workflow-agent-runner");
    assert.include(skill, "expected CLI version");
    assert.include(skill, "--help");

    const agentRunner = await readProfile(
      "skills/zotero-workflow-agent-runner/SKILL.md",
    );
    assert.include(agentRunner, "workflow agent-run");
    assert.include(agentRunner, "agentRunId");
    assert.include(agentRunner, "workflow agent-apply");
  });

  it("defines concrete cron templates for index, workflow, run, and hygiene jobs", async function () {
    const cronExpectations: Array<[string, string[]]> = [
      [
        "cron/index-refresh.yaml",
        ["every: 6h", "zotero_librarian_index_service.py refresh"],
      ],
      [
        "cron/workflow-catalog-refresh.yaml",
        ['time: "03:00"', "workflow-refresh"],
      ],
      ["cron/run-monitor.yaml", ["every: 5m", "run-watch"]],
      [
        "cron/notification-sync.yaml",
        ["every: 5m", "zotero_librarian_notification_service.py", "sync"],
      ],
      [
        "cron/workflow-status-triage.yaml",
        ['time: "09:00"', "status:need-", "workflow-pending"],
      ],
      [
        "cron/library-hygiene.yaml",
        ["weekly: monday", "duplicate DOI", "empty collection"],
      ],
      [
        "cron/attention-queue.yaml",
        ['time: "18:00"', "synthesis insight attention-queue"],
      ],
    ];

    for (const [relativePath, snippets] of cronExpectations) {
      const source = await readProfile(relativePath);
      for (const snippet of snippets) {
        assert.include(source, snippet, relativePath);
      }
      assert.include(source, "[SILENT]", relativePath);
      assert.notInclude(source, "run notification wait", relativePath);
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
    assert.strictEqual(
      packageJson.scripts["check:host-bridge-surface"],
      "npm run check:host-bridge-content && tsx scripts/render-zotero-library-agent-bundle.ts --check && tsx scripts/render-zotero-librarian-profile.ts --check && tsx scripts/render-host-bridge-release-set.ts --check",
    );
    assert.include(
      packageJson.scripts["check:host-bridge-content"],
      "--content-only",
    );
    assert.include(
      packageJson.scripts["inspect:zotero-librarian-profile-version"],
      "zotero-librarian-profile-version",
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
    assert.include(checkScript, "library.readiness_audit");
    assert.include(checkScript, "ZOTERO_LIBRARIAN_STATE_DIR");
    assert.include(checkScript, "tokenEnv");

    const publishScript = await fs.readFile(
      "scripts/publish-zotero-librarian-profile.ps1",
      "utf8",
    );
    assert.include(
      publishScript,
      "https://github.com/leike0813/zotero-librarian-profile.git",
    );
    assert.include(publishScript, "releaseRepository");
    assert.include(publishScript, "installCommand");
    assert.include(publishScript, "addon/bin");
    assert.include(publishScript, "assets/zotero-bridge/bin");
    assert.include(publishScript, "manifest.json");
    const materializer = await fs.readFile(
      "scripts/materialize-host-bridge-surfaces.ts",
      "utf8",
    );
    assert.include(materializer, "releaseSet.cli.binaries");
    for (const platform of EXPECTED_PLATFORMS) {
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

    const workflowService = await readProfile(
      "scripts/zotero_librarian_workflow_service.py",
    );
    for (const command of [
      "parent-selection",
      "readiness-plan",
      "plan",
      "submit",
    ]) {
      assert.include(workflowService, `"${command}"`);
    }
    assert.include(workflowService, "confirm_concurrency");
    assert.include(workflowService, "agent-run");
    assert.notInclude(workflowService, "run notification wait");

    const notificationService = await readProfile(
      "scripts/zotero_librarian_notification_service.py",
    );
    for (const command of ["sync", "inbox", "summary", "ack"]) {
      assert.include(notificationService, `"${command}"`);
    }
    assert.include(notificationService, '"run", "notification", "list"');
    assert.include(notificationService, '"run", "notification", "ack"');
    assert.notInclude(notificationService, "run notification wait");
  });
});

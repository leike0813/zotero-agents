import { assert } from "chai";
import {
  approvePiFixtureEndpoint,
  configureInstalledPiBackend,
  openInstalledPiUi,
} from "../../../helpers/piInstalledPluginDriver";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../../../src/modules/piTranscriptStore";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
} from "../../../../src/modules/runtimePersistence";
import { joinNativePath } from "../../../../src/platform/path";
import { PI_RUNTIME_BUILD_IDENTITY_ENTRY } from "../../../../src/config/piRuntimeBuild";
import {
  readDiagnosticsEnv,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";
import { emitZoteroTestDebug } from "../../diagnosticBridge";

const TOOL = "zotero_paper_artifacts_export_filtered";
const MANIFEST = "runtime/payloads/paper-artifacts-manifest.json";

async function until<T>(read: () => Promise<T | undefined>) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("pi_synthesis_export_timeout");
}

/**
 * The real sidecar's reverse Host export registers its file in the installed
 * plugin graph. Executing an imported test-bundle catalog would resolve a
 * different registry, so this canary drives only the installed public UI.
 * Imports read durable facts and paths; they never execute a Pi owner.
 */
describe("Installed Pi Synthesis directory export", function () {
  this.timeout(180_000);

  it("exports a synthetic paper through the installed owner and preserves its canonical manifest", async function () {
    // Settings are configured with a deterministic fixture connection. Opt in
    // only on an isolated test profile, like the synthetic cleanup canary.
    if (readDiagnosticsEnv("ZOTERO_PI_SYNTHESIS_TOOLS") !== "1") this.skip();
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE")) this.skip();
    await emitZoteroTestDebug({
      kind: "zotero-compatibility-host-facts",
      version: String(Zotero.version),
      appBuildId: String(Services.appinfo.appBuildID),
    });
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT");
    assert.isNotEmpty(endpoint, "deterministic provider endpoint required");
    const root = joinNativePath(
      getRuntimePersistencePaths().tmpDir,
      `pi-synthesis-export-${Date.now()}`,
    );
    await ensureRuntimeDirectoryStrict(root);
    const approval = approvePiFixtureEndpoint(endpoint);
    const parent = new Zotero.Item("journalArticle");
    parent.libraryID = Zotero.Libraries.userLibraryID;
    parent.setField("title", "Synthetic Pi Synthesis export canary");
    await parent.saveTx();
    const paperRef = `${parent.libraryID}:${parent.key}`;
    let ui: Awaited<ReturnType<typeof openInstalledPiUi>> | undefined;
    let owner: { ownerKey: string; conversationId: string } | undefined;
    let completed = false;
    try {
      await until(async () =>
        (
          Zotero as unknown as {
            ZoteroSkills?: { data?: { initialized?: boolean } };
          }
        ).ZoteroSkills?.data?.initialized
          ? true
          : undefined,
      );
      await configureInstalledPiBackend(endpoint, root);
      ui = await openInstalledPiUi();
      const tab = ui
        .shellWindow()
        .document.querySelector(
          '[data-tab="pi-conversations"]',
        ) as HTMLElement | null;
      assert.exists(tab, "installed Pi tab required");
      tab!.click();
      await ui.action(
        "new-conversation",
        { groupId: "pi-conversations" },
        null,
      );
      owner = await until(async () => {
        const selected = ui!.selectedOwner() as typeof owner;
        return selected?.conversationId ? selected : undefined;
      });
      const ref = {
        kind: "conversation" as const,
        ownerId: owner.conversationId,
      };
      // Missing artifacts still produce the real canonical manifest. No
      // artificial delivery file or sidecar result is supplied by the test.
      const input = encodeURIComponent(
        JSON.stringify({ paper_refs: [paperRef], artifact_types: ["digest"] }),
      );
      await ui.action(
        "send-prompt",
        {
          message: `[system-e2e:tool:${TOOL}] [system-e2e:tool-input:${input}]`,
        },
        owner,
      );
      const approved = new Set<string>();
      const observed = await until(async () => {
        const history = await inspectPiOwner(ref);
        const status = ui!.observation(
          owner!.ownerKey || owner!.conversationId,
        )?.status;
        if (status === "waiting_permission") {
          const request = history.entries
            .filter((entry) => entry.kind === "permission_pending")
            .map(
              (entry) =>
                entry.payload as unknown as {
                  id: string;
                  pending: { call: { name: string } };
                },
            )
            .find(
              (entry) =>
                entry.pending.call.name === TOOL && !approved.has(entry.id),
            );
          if (request) {
            approved.add(request.id);
            await ui!.action(
              "resolve-permission",
              {
                permissionRequestId: request.id,
                outcome: "selected",
                optionId: "approve",
              },
              owner,
            );
          }
        }
        if (["failed", "recovery_required"].includes(status || ""))
          throw new Error("pi_synthesis_export_owner_failed");
        return history.entries.some(
          (entry) => entry.kind === "turn_terminal",
        ) && status === "idle"
          ? history
          : undefined;
      });
      const tools = observed.entries
        .filter((entry) => entry.kind === "tool_result")
        .map(
          (entry) => entry.payload as unknown as { name: string; text: string },
        );
      const exportResults = tools.filter((entry) => entry.name === TOOL);
      assert.lengthOf(exportResults, 1, "one real export submission required");
      const result = JSON.parse(exportResults[0]!.text);
      assert.equal(result.status, "completed");
      assert.equal(result.effectCertainty, "confirmed_complete");
      const value = result.value;
      assert.equal(value.manifest_file, MANIFEST);
      assert.include(value.paper_refs, paperRef);
      assert.isAtLeast(value.entryCount, 1);
      const workspace = joinNativePath(piOwnerPaths(ref).dir, "workspace");
      const normalized = String(value.rootPath).replace(/\\/g, "/");
      const prefix = workspace.replace(/\\/g, "/") + "/exports/";
      assert.isTrue(
        normalized.startsWith(prefix),
        "export must belong to this owner workspace",
      );
      assert.notInclude(normalized.slice(prefix.length), "/");
      const manifest = JSON.parse(
        await IOUtils.readUTF8(joinNativePath(value.rootPath, MANIFEST)),
      );
      assert.equal(
        manifest.schema_id,
        "synthesis.filtered_paper_artifacts_manifest",
      );
      assert.include(manifest.paper_refs, paperRef);
      assert.lengthOf(manifest.papers, 1);
      for (const artifact of manifest.papers[0].artifacts) {
        if (!artifact.content_file) continue;
        assert.isFalse(/^(?:[A-Za-z]:|[\\/])/.test(artifact.content_file));
        assert.isFalse(
          artifact.content_file
            .split(/[\\/]/)
            .some((part: string) => !part || part === "." || part === ".."),
        );
        assert.isTrue(
          await IOUtils.exists(
            joinNativePath(value.rootPath, artifact.content_file),
          ),
        );
      }
      const { AddonManager } = (globalThis as any).ChromeUtils.importESModule(
        "resource://gre/modules/AddonManager.sys.mjs",
      );
      const installed = await AddonManager.getAddonByID(
        "zotero-skills@leike0813@gmail.com",
      );
      assert.isTrue(installed?.isActive, "installed plugin required");
      const identity = JSON.parse(
        (await Zotero.File.getResourceAsync(
          installed.getResourceURI(PI_RUNTIME_BUILD_IDENTITY_ENTRY).spec,
        )) as string,
      );
      // Local paths belong only to this run's diagnostic artifact. No source
      // library data or machine path is embedded in a committed fixture.
      await writeDiagnosticsText(
        readDiagnosticsEnv("ZOTERO_PI_SYNTHESIS_OBSERVATION_PATH") ||
          joinNativePath(root, "pi-synthesis-export.json"),
        JSON.stringify({
          schema: "zotero-agents.pi-synthesis-export-canary.v1",
          hostVersion: String(Zotero.version),
          platform: Zotero.isWin ? "win32" : Zotero.isMac ? "darwin" : "linux",
          source: identity.source,
          artifactIdentity: identity,
          sidecarBuildIdentity: readDiagnosticsEnv(
            "ZOTERO_SYNTHESIS_SIDECAR_BUILD_IDENTITY",
          ),
          installedOwner: true,
          status: result.status,
          effectCertainty: result.effectCertainty,
          manifest: MANIFEST,
          rootPath: value.rootPath,
          relativeEntries: [
            MANIFEST,
            ...manifest.papers.flatMap(
              (paper: { artifacts: Array<{ content_file?: string }> }) =>
                paper.artifacts.flatMap((artifact) =>
                  artifact.content_file ? [artifact.content_file] : [],
                ),
            ),
          ],
          entryCount: value.entryCount,
          totalBytes: value.totalBytes,
          manifestPaperCount: manifest.papers.length,
        }),
      );
      completed = true;
    } finally {
      approval();
      try {
        if (completed && ui && owner) {
          await ui.action("archive-conversation", {}, owner);
          await ui.action("delete-conversation", {}, owner);
        }
      } finally {
        ui?.close();
        await Zotero.Items.trashTx([parent.id]);
      }
    }
  });
});

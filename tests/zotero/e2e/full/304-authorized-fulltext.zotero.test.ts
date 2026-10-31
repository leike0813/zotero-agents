import { assert } from "chai";
import { SYNTHETIC_AUTHORIZED_FULLTEXT } from "../../../mock-skillrunner/authorizedFulltextFixture";
import {
  ensureHostBridgeServer,
  handleHostBridgeHttpRequestForTests,
} from "../../../../src/modules/hostBridge/server/hostBridgeServer";
import { getHostBridgeToken } from "../../../../src/modules/hostBridge/server/hostBridgeAuth";
import {
  getSkillRunnerHostBridgePermissionRequest,
  resolveSkillRunnerHostBridgePermissionRequest,
} from "../../../../src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry";
import { applySkillRunnerRunEvent } from "../../../../src/modules/skillRunner/run/skillRunnerRunStore";
import { deletePluginRunStoreEntry } from "../../../../src/modules/pluginStateStore";
import {
  issueAcquisitionGrantForTask,
  revokeAcquisitionGrant,
} from "../../../../src/modules/zoteroHost/zoteroHostAcquisitionAuthority";
import { resolveHostBridgeFileDownload } from "../../../../src/modules/runtimeFileRegistry";
import { runFamilyLifecycle } from "../../../../scripts/system-e2e/familyLifecycle";
import { observeSystemE2EHealth } from "../../../../scripts/system-e2e/healthGate";
import { emitZoteroTestDebug, isSystemE2ERun } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import { systemE2ECase } from "../../systemE2ECases";
import { createWorkflowHostApi } from "../../../../src/workflows/hostApi";
import { applyResult } from "../../../../workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs";

type BridgeScope = {
  kind: "skillrunner-run";
  frontendScopeId: string;
  requestId: string;
  acquisitionGrantId: string;
};
type BridgeResponse = {
  status: number;
  body: string;
  json: any;
};
type Task = {
  runKey: string;
  requestId: string;
  grantId: string;
  scope: BridgeScope;
};

function parseBridgeResponse(raw: string): BridgeResponse {
  const split = raw.indexOf("\r\n\r\n");
  const head = split < 0 ? raw : raw.slice(0, split);
  const body = split < 0 ? "" : raw.slice(split + 4);
  return {
    status: Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0),
    body,
    json: body.trim().startsWith("{") ? JSON.parse(body) : null,
  };
}

async function bridgeCall(
  token: string,
  scope: BridgeScope,
  capability: string,
  input: Record<string, unknown>,
) {
  const operationId = String(input.operationId || "");
  return parseBridgeResponse(
    await handleHostBridgeHttpRequestForTests({
      method: "POST",
      path: "/bridge/v2/call",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-zotero-bridge-scope": JSON.stringify(scope),
        ...(operationId ? { "x-zotero-bridge-operation-id": operationId } : {}),
      },
      body: JSON.stringify({ capability, input }),
      disableAutomaticOperationId: true,
    }),
  );
}

async function callWithTaskApproval(
  token: string,
  task: Task,
  capability: string,
  input: Record<string, unknown>,
) {
  const pending = bridgeCall(token, task.scope, capability, input);
  for (let attempt = 0; attempt < 1_200; attempt += 1) {
    const permission = getSkillRunnerHostBridgePermissionRequest(
      task.requestId,
    );
    if (permission) {
      resolveSkillRunnerHostBridgePermissionRequest({
        runRequestId: task.requestId,
        permissionRequestId: permission.requestId,
        outcome: "selected",
        optionId: "approve_once",
      });
      return pending;
    }
    if (
      await Promise.race([
        pending.then(() => true),
        Zotero.Promise.delay(25).then(() => false),
      ])
    ) {
      return pending;
    }
  }
  throw new Error("authorized_fulltext_approval_not_requested");
}

function startTask(label: string): Task {
  const runKey = `system-e2e-af-${label}-${Date.now()}`;
  const requestId = `${runKey}-request`;
  const backendId = "system-e2e-authorized-fulltext";
  applySkillRunnerRunEvent({
    type: "submit.local_created",
    init: {
      runKey,
      backendId,
      workflowId: "synthetic-authorized-fulltext",
      workflowRunId: `${runKey}-workflow`,
      jobId: `${runKey}-job`,
      taskName: "Synthetic authorized fulltext",
    },
  });
  applySkillRunnerRunEvent({
    type: "request.created",
    runKey,
    backendId,
    requestId,
  });
  const grantId = issueAcquisitionGrantForTask("skillrunner-run", runKey);
  return {
    runKey,
    requestId,
    grantId,
    scope: {
      kind: "skillrunner-run",
      frontendScopeId: runKey,
      requestId,
      acquisitionGrantId: grantId,
    },
  };
}

function acquisitionBrowserWindow(url: string) {
  const windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    const win = windows.getNext() as any;
    try {
      if (win.document?.querySelector?.("browser")?.currentURI?.spec === url) {
        return win;
      }
    } catch {
      // Ignore transient or inaccessible chrome windows.
    }
  }
  return null;
}

async function closeSyntheticAcquisitionPages(endpoint: string) {
  const prefix = `${endpoint.replace(/\/$/, "")}/__test/acquisition/`;
  const windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    const win = windows.getNext() as any;
    try {
      const url = String(
        win.document?.querySelector?.("browser")?.currentURI?.spec || "",
      );
      if (url.startsWith(prefix)) win.close();
    } catch {
      // Ignore transient or inaccessible chrome windows.
    }
  }
}

async function waitForDownload(token: string, task: Task, downloadRef: string) {
  for (let attempt = 0; attempt < 480; attempt += 1) {
    const response = await bridgeCall(
      token,
      task.scope,
      "acquisition.get_download",
      {
        downloadRef,
      },
    );
    assert.equal(response.status, 200, response.body);
    const download = response.json.result.data;
    if (
      download.state === "ready" ||
      download.state === "failed" ||
      download.state === "canceled"
    ) {
      return download;
    }
    await Zotero.Promise.delay(250);
  }
  throw new Error("authorized_fulltext_download_not_terminal");
}

async function assertFileHandleMissing(fileId: string) {
  try {
    await resolveHostBridgeFileDownload(fileId);
  } catch (error) {
    assert.equal((error as { code?: string }).code, "file_not_found");
    return;
  }
  assert.fail("expected consumed acquisition file handle to be unavailable");
}

describe("System E2E authorized fulltext", function () {
  this.timeout(600_000);

  before(function () {
    assert.isTrue(isSystemE2ERun());
  });

  // prettier-ignore
  systemE2ECase("AF-01", "AF", "AF-01 acquires a synthetic PDF through a live task grant and imports it once", async function () {
    const familyId = "AF";
    const caseId = "AF-01";
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT").replace(/\/$/, "");
    let task: Task | undefined;
    let otherTask: Task | undefined;
    let collection: Zotero.Collection | undefined;
    let parent: Zotero.Item | undefined;
    let attachmentOperationId = "";
    let attachedRef: { libraryId: number; key: string } | undefined;
    let caseError = "";
    let token = "";
    const sessions: string[] = [];

    const result = await runFamilyLifecycle({
      declaration: {
        familyId,
        owner: "authorized-fulltext-acquisition",
        namespace: ["system-e2e:af:01", "system-e2e-af-"],
        ownedState: [
          "skillrunner-run",
          "acquisition-grant",
          "synthetic-parent",
          "authorized-fulltext-attachment",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(endpoint, "mock peer endpoint");
          await ensureHostBridgeServer();
          token = getHostBridgeToken();
          task = startTask("primary");
          collection = new Zotero.Collection();
          collection.name = `System E2E authorized fulltext ${Date.now()}`;
          collection.libraryID = Zotero.Libraries.userLibraryID;
          await collection.saveTx();
          const collectionRef = { libraryId: collection.libraryID, key: collection.key };
          const articleUrl = `${endpoint}${SYNTHETIC_AUTHORIZED_FULLTEXT.articlePath}`;
          const ingest = await callWithTaskApproval(token, task, "literature.ingest", {
            operationId: `system-e2e-af-ingest-${Date.now()}`,
            collectionRef,
            paper: {
              itemType: "journalArticle",
              fields: { title: SYNTHETIC_AUTHORIZED_FULLTEXT.title },
              creators: [],
              identifiers: {},
              landingUrl: articleUrl,
              attachLandingUrlOnMissingPdf: false,
            },
          });
          assert.equal(ingest.status, 200, ingest.body);
          assert.equal(ingest.json.result.data.outcome, "committed");
          const parentRef = ingest.json.result.data.result.item.ref as {
            libraryId: number;
            key: string;
          };
          parent = Zotero.Items.getByLibraryAndKey(parentRef.libraryId, parentRef.key) || undefined;
          assert.isOk(parent);
          assert.equal(parent!.getField("title"), SYNTHETIC_AUTHORIZED_FULLTEXT.title);
          const hostApi = createWorkflowHostApi({ ownerId: `system-e2e-af:${task.runKey}` });
          await hostApi.statusTags.transition({
            operationId: `system-e2e-af-missing:${task.runKey}`,
            itemRef: parentRef,
            add: ["need-fulltext"],
            remove: [],
          });
          assert.isTrue(parent!.hasTag("status:need-fulltext"));

          const opened = await bridgeCall(token, task.scope, "acquisition.open", { parentRef });
          assert.equal(opened.status, 200, opened.body);
          const pageRef = String(opened.json.result.data.pageRef);
          const sessionRef = String(opened.json.result.data.sessionRef);
          sessions.push(sessionRef);
          let observed: any;
          for (let attempt = 0; attempt < 200; attempt += 1) {
            const response = await bridgeCall(token, task.scope, "acquisition.observe", { pageRef });
            assert.equal(response.status, 200, response.body);
            observed = response.json.result.data;
            if (observed.state === "ready") break;
            if (["failed", "closed", "timed_out", "released"].includes(observed.state)) {
              assert.fail(`acquisition page ended before ready: ${JSON.stringify(observed)}`);
            }
            await Zotero.Promise.delay(100);
          }
          assert.equal(observed.state, "ready", JSON.stringify(observed));
          assert.equal(observed.title, SYNTHETIC_AUTHORIZED_FULLTEXT.title);
          const target = observed.targets.find((entry: any) => entry.label === "Synthetic fulltext PDF");
          assert.isOk(target, JSON.stringify(observed.targets));
          const protectedTarget = observed.targets.find((entry: any) => entry.label === "Protected fulltext PDF");
          assert.isOk(protectedTarget);
          const protectedStart = await bridgeCall(token, task.scope, "acquisition.download", {
            pageRef,
            revision: observed.revision,
            targetRef: protectedTarget.targetRef,
            idempotencyKey: "system-e2e-authorized-fulltext-html",
          });
          assert.equal(protectedStart.status, 200, protectedStart.body);
          const protectedResult = await waitForDownload(token, task, String(protectedStart.json.result.data.downloadRef));
          assert.equal(protectedResult.state, "failed");
          assert.equal(protectedResult.reason, "non_pdf");
          assert.isNull(protectedResult.file);

          const downloadInput = {
            pageRef,
            revision: observed.revision,
            targetRef: target.targetRef,
            idempotencyKey: "system-e2e-authorized-fulltext-primary",
          };
          const started = await bridgeCall(token, task.scope, "acquisition.download", downloadInput);
          assert.equal(started.status, 200, started.body);
          const downloadRef = String(started.json.result.data.downloadRef);
          const download = await waitForDownload(token, task, downloadRef);
          assert.equal(download.state, "ready", JSON.stringify(download));
          assert.equal(download.file.contentType, "application/pdf");
          assert.equal(download.file.pages, 1);
          assert.isTrue(download.file.readable);
          assert.isTrue(download.file.identityMatched);
          assert.equal(download.file.title, SYNTHETIC_AUTHORIZED_FULLTEXT.title);
          const fileId = String(download.file.fileId);

          const remote = parseBridgeResponse(await handleHostBridgeHttpRequestForTests({
            method: "GET",
            path: `/bridge/v2/files/${fileId}`,
            headers: { authorization: `Bearer ${token}` },
            disableAutomaticOperationId: true,
          }));
          assert.equal(remote.status, 403, remote.body);
          assert.equal(remote.json.error.code, "file_download_forbidden");
          assert.notInclude(remote.body, "%PDF-");

          otherTask = startTask("other");
          const crossTask = await bridgeCall(token, otherTask.scope, "acquisition.observe", { pageRef });
          assert.equal(crossTask.status, 403, crossTask.body);
          assert.equal(crossTask.json.error.code, "permission_denied");

          attachmentOperationId = `system-e2e-af-attachment-${Date.now()}`;
          const attachmentInput = {
            operationId: attachmentOperationId,
            placement: { kind: "child", parentRef },
            source: { kind: "stored_file", fileId, targetFilename: "fulltext.pdf" },
            metadata: { title: SYNTHETIC_AUTHORIZED_FULLTEXT.title, contentType: "application/pdf" },
          };
          const attached = await callWithTaskApproval(token, task, "attachments.create", attachmentInput);
          assert.equal(attached.status, 200, attached.body);
          const execution = attached.json.result.data;
          assert.equal(execution.outcome, "committed", attached.body);
          assert.equal(execution.receipt.operationId, attachmentOperationId);
          assert.equal(execution.receipt.operation, "attachments.create");
          attachedRef = execution.result.attachment.ref;
          assert.lengthOf(parent!.getAttachments(), 1);
          const child = Zotero.Items.getByLibraryAndKey(attachedRef!.libraryId, attachedRef!.key);
          assert.equal(child?.parentItemID, parent!.id);

          await assertFileHandleMissing(fileId);
          assert.isNull(getSkillRunnerHostBridgePermissionRequest(task.requestId));
          const replay = await bridgeCall(token, task.scope, "attachments.create", attachmentInput);
          assert.equal(replay.status, 200, replay.body);
          assert.equal(replay.json.result.data.outcome, "committed");
          assert.deepEqual(replay.json.result.data.result.attachment.ref, attachedRef);
          assert.lengthOf(parent!.getAttachments(), 1);
          assert.isNull(getSkillRunnerHostBridgePermissionRequest(task.requestId));

          const cleanupDownload = await bridgeCall(token, task.scope, "acquisition.download", {
            ...downloadInput,
            idempotencyKey: "system-e2e-authorized-fulltext-cleanup",
          });
          assert.equal(cleanupDownload.status, 200, cleanupDownload.body);
          const cleanupFile = await waitForDownload(token, task, String(cleanupDownload.json.result.data.downloadRef));
          assert.equal(cleanupFile.state, "ready", JSON.stringify(cleanupFile));
          const cleanupFileId = String(cleanupFile.file.fileId);
          const released = await bridgeCall(token, task.scope, "acquisition.release", { sessionRef });
          assert.equal(released.status, 200, released.body);
          assert.equal(released.json.result.data.state, "released");
          await assertFileHandleMissing(cleanupFileId);
          const releasedDownload = await bridgeCall(token, task.scope, "acquisition.get_download", {
            downloadRef: String(cleanupDownload.json.result.data.downloadRef),
          });
          assert.equal(releasedDownload.json.result.data.reason, "released");
          assert.isNull(releasedDownload.json.result.data.file);

          const loginUrl = `${endpoint}${SYNTHETIC_AUTHORIZED_FULLTEXT.loginPath}`;
          const loginPage = await bridgeCall(token, task.scope, "acquisition.open", { parentRef });
          assert.equal(loginPage.status, 200, loginPage.body);
          const loginPageRef = String(loginPage.json.result.data.pageRef);
          sessions.push(String(loginPage.json.result.data.sessionRef));
          let loginState: any;
          for (let attempt = 0; attempt < 200; attempt += 1) {
            const response = await bridgeCall(token, task.scope, "acquisition.observe", { pageRef: loginPageRef });
            assert.equal(response.status, 200, response.body);
            loginState = response.json.result.data;
            if (loginState.state === "ready") break;
            if (loginState.state !== "loading") assert.fail(`unexpected page state: ${JSON.stringify(loginState)}`);
            await Zotero.Promise.delay(100);
          }
          assert.equal(loginState.state, "ready", JSON.stringify(loginState));
          const navigated = await bridgeCall(token, task.scope, "acquisition.navigate", { pageRef: loginPageRef, url: loginUrl });
          assert.equal(navigated.status, 200, navigated.body);
          for (let attempt = 0; attempt < 200; attempt += 1) {
            const response = await bridgeCall(token, task.scope, "acquisition.observe", { pageRef: loginPageRef });
            assert.equal(response.status, 200, response.body);
            loginState = response.json.result.data;
            if (loginState.state === "awaiting_user") break;
            await Zotero.Promise.delay(100);
          }
          assert.equal(loginState.state, "awaiting_user", JSON.stringify(loginState));
          assert.isNumber(loginState.authDeadline);
          const loginWindow = acquisitionBrowserWindow(loginUrl);
          assert.isOk(loginWindow, "synthetic login page window");
          loginWindow.close();
          for (let attempt = 0; attempt < 200; attempt += 1) {
            const response = await bridgeCall(token, task.scope, "acquisition.observe", { pageRef: loginPageRef });
            loginState = response.json.result.data;
            if (loginState.reason === "window_closed") break;
            await Zotero.Promise.delay(100);
          }
          assert.equal(loginState.reason, "window_closed", JSON.stringify(loginState));
          const suppressed = await bridgeCall(token, task.scope, "acquisition.open", { parentRef });
          assert.equal(suppressed.status, 503, suppressed.body);
          assert.match(String(suppressed.json.error.message), /authentication_suppressed/);
          const projected = await applyResult({
            runtime: { hostApiVersion: 12, hostApi },
            runResult: {
              requestId: task.requestId,
              resultJson: {
                __SKILL_DONE__: true,
                kind: "literature_search_ingest_canceled",
                status: "canceled",
                reason: "user_cancelled",
                message: "Synthetic batch canceled after partial success",
                summary: { discovered: 2, selected: 2, created: 1, existing: 0, failed: 0, notAttempted: 1 },
                outcomes: [
                  { title: SYNTHETIC_AUTHORIZED_FULLTEXT.title, ingestStatus: "created", pdfStatus: "missing", needsCuration: false, itemRef: parentRef },
                  { title: "Unattempted synthetic paper", ingestStatus: "not_attempted", pdfStatus: "skipped", needsCuration: false },
                ],
                searchLedgerPath: "result/search-ledger.json",
              },
            },
          });
          assert.isTrue(projected.applied);
          assert.isFalse(projected.partial, JSON.stringify(projected.statusWarnings));
          assert.isFalse(parent!.hasTag("status:need-fulltext"));
          assert.isTrue(parent!.hasTag("status:need-analysis"));
          assert.lengthOf(parent!.getAttachments(), 1);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          const actorErrors = Services.console.getMessageArray()
            .map((message: any) => String(message.message || ""))
            .filter((message: string) => /AcquisitionPage|ZoteroAgentsAcquisition|PdfValidationWorker/.test(message))
            .slice(-5);
          if (actorErrors.length) caseError += `; native actor: ${actorErrors.join("; ")}`;
          throw error;
        }
      },
      cleanup: async () => {
        for (const sessionRef of sessions) {
          try {
            if (task) await bridgeCall(token, task.scope, "acquisition.release", { sessionRef });
          } catch {
            // Revoking the grant below owns any remaining page cleanup.
          }
        }
        if (task) revokeAcquisitionGrant(task.grantId);
        if (otherTask) revokeAcquisitionGrant(otherTask.grantId);
        await closeSyntheticAcquisitionPages(endpoint);
        if (task) deletePluginRunStoreEntry("skillrunner", task.runKey);
        if (otherTask) deletePluginRunStoreEntry("skillrunner", otherTask.runKey);
        if (parent) await parent.eraseTx();
        if (collection) await collection.eraseTx();
        return task && otherTask && parent && collection && attachedRef
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId,
        caseId,
        result: result.result,
        publicOutcome: result.result === "passed" ? "authorized_fulltext_attached" : undefined,
        failureCode: result.abortCode,
        typedEvidence: result.result === "passed"
          ? [
              {
                kind: "authorized-fulltext-download",
                schemaVersion: "zotero-agents.acquisition-file.v1",
                terminalStatus: "ready",
              },
              {
                kind: "canonical-mutation-receipt",
                schemaVersion: "zotero-agents.mutation-receipt.v1",
                terminalStatus: "committed",
                operationId: attachmentOperationId,
              },
            ]
          : [],
        lifecycle: result.transitions.map((checkpoint) => ({ checkpoint, outcome: "completed" })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

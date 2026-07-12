import { assert } from "chai";
import {
  hasRunDialogWaitingAuthExited,
  isRunDialogWaitingAuthActivePhase,
  mergePendingAuthWithSession,
  resolveRunDialogAuthExternalUrl,
  resolveRunDialogWaitingAuthObservation,
  validateRunDialogAuthImportFiles,
} from "../../src/modules/skillRunnerRunDialog";

describe("skillrunner run dialog waiting auth observer", function () {
  it("preserves pending auth controls across sparse auth session refreshes", function () {
    const merged = mergePendingAuthWithSession({
      pendingAuth: {
        phase: "challenge_active",
        authSessionId: "session-1",
        providerId: "provider-1",
        engine: "engine-1",
        prompt: "Complete sign-in in your browser",
        challengeKind: "auth_code_or_url",
        availableMethods: [],
        askUser: { hint: "Use the link below" },
        acceptsChatInput: false,
        inputKind: undefined,
        authUrl: "https://auth.example/device",
        userCode: "ABCDE",
        lastError: undefined,
        uiHints: { hint: "Use the link below" },
      },
      authSession: {
        request_id: "req-1",
        auth_session_id: "session-1",
        phase: "challenge_active",
        challenge_kind: "auth_code_or_url",
        last_error: "authorization pending",
      },
    });

    assert.deepInclude(merged, {
      prompt: "Complete sign-in in your browser",
      authUrl: "https://auth.example/device",
      userCode: "ABCDE",
      acceptsChatInput: false,
      lastError: "authorization pending",
    });
    assert.deepEqual(merged?.askUser, { hint: "Use the link below" });
    assert.deepEqual(merged?.uiHints, { hint: "Use the link below" });
  });

  it("treats only active auth phases as waiting-auth-active", function () {
    assert.equal(isRunDialogWaitingAuthActivePhase("method_selection"), true);
    assert.equal(isRunDialogWaitingAuthActivePhase("challenge_active"), true);
    assert.equal(isRunDialogWaitingAuthActivePhase("completed"), false);
    assert.equal(isRunDialogWaitingAuthActivePhase(""), false);
    assert.equal(isRunDialogWaitingAuthActivePhase(undefined), false);
  });

  it("detects waiting_auth exit when pending payload leaves waiting_auth", function () {
    assert.equal(
      hasRunDialogWaitingAuthExited({
        pending: {
          request_id: "req-1",
          status: "queued",
          pending_owner: "waiting_auth.challenge_active",
        },
      }),
      true,
    );
    assert.equal(
      hasRunDialogWaitingAuthExited({
        pending: {
          request_id: "req-1",
          status: "waiting_auth",
          pending_owner: "running",
        },
      }),
      true,
    );
  });

  it("detects waiting_auth exit from auth session phase/status but stays conservative otherwise", function () {
    assert.equal(
      hasRunDialogWaitingAuthExited({
        authSession: {
          request_id: "req-1",
          status: "running",
          phase: "challenge_active",
        },
      }),
      true,
    );
    assert.equal(
      hasRunDialogWaitingAuthExited({
        authSession: {
          request_id: "req-1",
          status: "waiting_auth",
          phase: "completed",
        },
      }),
      true,
    );
    assert.equal(
      hasRunDialogWaitingAuthExited({
        pending: {
          request_id: "req-1",
          status: "waiting_auth",
          pending_owner: "waiting_auth.challenge_active",
        },
        authSession: {
          request_id: "req-1",
          status: "waiting_auth",
          phase: "challenge_active",
        },
      }),
      false,
    );
    assert.equal(hasRunDialogWaitingAuthExited({}), false);
  });

  it("treats auth-session completion as a recheck hint until canonical status exits", function () {
    assert.deepEqual(
      resolveRunDialogWaitingAuthObservation({
        currentStatus: "waiting_auth",
        canonicalStatus: "waiting_auth",
        authExitHint: true,
      }),
      {
        action: "observe",
        recheckCanonical: true,
      },
    );
  });

  it("hands canonical waiting_auth exits to foreground continuation", function () {
    assert.deepEqual(
      resolveRunDialogWaitingAuthObservation({
        currentStatus: "waiting_auth",
        canonicalStatus: "queued",
      }),
      {
        action: "handoff",
        observedStatus: "queued",
        recheckCanonical: false,
      },
    );
    assert.deepEqual(
      resolveRunDialogWaitingAuthObservation({
        currentStatus: "failed",
        canonicalStatus: "failed",
      }),
      {
        action: "stop",
        recheckCanonical: false,
      },
    );
  });

  it("opens only the current owner HTTP(S) auth URL", function () {
    assert.equal(
      resolveRunDialogAuthExternalUrl({
        candidate: "https://auth.example/device",
        expected: "https://auth.example/device",
      }),
      "https://auth.example/device",
    );
    assert.equal(
      resolveRunDialogAuthExternalUrl({
        candidate: "https://stale.example/device",
        expected: "https://auth.example/device",
      }),
      "",
    );
    assert.equal(
      resolveRunDialogAuthExternalUrl({
        candidate: "javascript:alert(1)",
        expected: "javascript:alert(1)",
      }),
      "",
    );
  });

  it("validates required auth import files before backend submission", function () {
    assert.deepEqual(
      validateRunDialogAuthImportFiles({
        requiredNames: ["oauth.json"],
        files: [],
      }),
      {
        ok: false,
        reason: "missing_required",
        missingNames: ["oauth.json"],
      },
    );
    assert.deepEqual(
      validateRunDialogAuthImportFiles({
        requiredNames: ["oauth.json"],
        files: [{ name: "oauth.json", content_base64: "YWJj" }],
      }),
      {
        ok: true,
        files: [{ name: "oauth.json", content_base64: "YWJj" }],
      },
    );
  });
});

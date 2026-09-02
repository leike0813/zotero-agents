import { assert } from "chai";
import {
  dispatchRunWorkspaceAction,
  getSkillRunnerWorkspaceReadModel,
  getSkillRunnerWorkspaceSelectedOwner,
  projectSkillRunnerConversationEntriesToTranscriptItems,
  readSkillRunnerTranscriptRegion,
  refreshSkillRunnerSidebarHostSnapshot,
  type SkillRunnerConversationEntry,
} from "../../src/modules/skillRunnerRunDialog";
import {
  mapSkillRunnerChangeToPublicationKinds,
  SKILLRUNNER_WORKSPACE_ADAPTER,
  SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING,
} from "../../src/modules/skillRunnerWorkspaceSurface";
import { parseAssistantPendingInteraction } from "../../src/shared/assistantInteractionContract";
import * as AssistantPanelModel from "../../src/sidebar/assistantPanelModel.js";
import {
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
} from "../../src/modules/assistantWorkspacePublication";
import { setAssistantExecutionDisplayMode } from "../../src/modules/assistantExecutionDisplayPolicy";
import { applySkillRunnerRunEvent } from "../../src/modules/skillRunnerRunStore";
import { workflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import { markSkillRunnerBackendHealthFailure } from "../../src/modules/skillRunnerBackendHealthRegistry";
import { buildAssistantWorkspacePublicationLabels } from "../../src/modules/assistantWorkspacePublicationLabels";
import { initializeSequenceRunState } from "../../src/modules/workflowExecution/sequenceStateStore";
import { clearPref } from "../../src/utils/prefs";
import {
  startSkillRunnerWorkspaceSnapshotHarness,
  type SkillRunnerWorkspaceSnapshotHarness,
} from "../helpers/skillRunnerWorkspaceSnapshotHarness";

type SkillRunnerOwner = Extract<
  AssistantWorkspaceOwner,
  { source: "skillrunner" }
>;

const OWNER_REGION_KINDS = [
  "owner-control",
  "message-counts",
  "permission",
  "composer",
  "owner-presentation",
  "owner-details",
] as const satisfies readonly Exclude<
  AssistantWorkspacePublicationKind,
  "owner-navigation" | "service-status" | "transcript"
>[];

function conversationEntry(
  partial: Partial<SkillRunnerConversationEntry> &
    Pick<SkillRunnerConversationEntry, "seq" | "role" | "kind" | "text">,
): SkillRunnerConversationEntry {
  return { raw: {}, ...partial };
}

function selectedOwner(): SkillRunnerOwner | null {
  const selected = getSkillRunnerWorkspaceSelectedOwner();
  return selected
    ? createSkillRunnerWorkspaceOwner({
        requestId: selected.requestId || undefined,
        runKey: selected.runKey,
      })
    : null;
}

async function waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  description: string,
  timeoutMs = 8000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function transcriptPublications(publications: AssistantWorkspacePublication[]) {
  return publications.filter(
    (publication) => publication.publicationKind === "transcript",
  );
}

describe("SkillRunner workspace surface (read model + adapter)", function () {
  this.timeout(20000);

  let harness: SkillRunnerWorkspaceSnapshotHarness;

  beforeEach(async function () {
    workflowSubmissionQueue.resetForTests();
    harness = await startSkillRunnerWorkspaceSnapshotHarness();
  });

  afterEach(async function () {
    clearPref("assistantExecutionDisplayMode");
    workflowSubmissionQueue.resetForTests();
    await harness.reset();
  });

  // Attaches the run-level host and captures the production publication
  // stream (subscribe → runtime.schedule → coordinator → post, asserted per
  // publication); assertions never touch the legacy snapshot channel.
  async function attachReadModelHost(selectRunKey?: string) {
    return harness.attachPublications({ selectRunKey });
  }

  it("excludes plan and service-status from the supported kinds and maps change kinds", function () {
    assert.notInclude(SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds, "plan");
    assert.notInclude(
      SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds,
      "service-status",
    );
    assert.includeMembers(SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds, [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "permission",
      "composer",
      "owner-presentation",
      "owner-details",
    ] as const);
    assert.deepEqual(mapSkillRunnerChangeToPublicationKinds(["transcript"]), [
      "transcript",
    ]);
    assert.includeMembers(mapSkillRunnerChangeToPublicationKinds(["run"]), [
      "owner-control",
      "owner-presentation",
      "permission",
      "composer",
    ]);
    assert.deepEqual(
      SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING.selection,
      ["owner-navigation"],
    );
    assert.deepEqual(SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING.global, [
      "owner-navigation",
    ]);
  });

  it("shares the refresh-triggered and explicit activation baseline", async function () {
    const seeded = harness.seedTask({
      requestId: "req-shared-activation",
      status: "running",
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      const next = harness.seedTask({
        requestId: "req-shared-activation-next",
        status: "running",
      });
      capture.publications.length = 0;

      await refreshSkillRunnerSidebarHostSnapshot({
        forceInit: true,
        runKey: next.runKey,
      });
      await capture.runtime.initialize({
        adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
        context: undefined,
        cause: "activation",
      });

      assert.equal(
        capture.publications.filter(
          (publication) => publication.publicationKind === "owner-navigation",
        ).length,
        1,
      );
      assert.deepEqual(
        transcriptPublications(capture.publications).map(
          (publication) => (publication.payload as { status?: string }).status,
        ),
        ["loading", "ready"],
      );
    } finally {
      capture.stop();
    }
  });

  it("projects conversation entries to canonical transcript items", function () {
    const entries: SkillRunnerConversationEntry[] = [
      conversationEntry({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "calling search tool",
        processType: "tool_call",
        raw: { correlation: { tool_call_id: "tool-1" } },
      }),
      conversationEntry({
        seq: 2,
        role: "assistant",
        kind: "assistant_process",
        text: "thinking about the corpus",
        processType: "reasoning",
      }),
      conversationEntry({
        seq: 3,
        role: "assistant",
        kind: "assistant_process",
        text: "running digest command",
        raw: { correlation: { process_type: "command_execution" } },
      }),
      conversationEntry({
        seq: 4,
        role: "assistant",
        kind: "assistant_message",
        text: "intermediate draft",
        messageId: "msg-1",
        attempt: 1,
      }),
      conversationEntry({
        seq: 5,
        role: "assistant",
        kind: "assistant_final",
        text: "final answer",
        messageId: "msg-1",
        attempt: 1,
      }),
      conversationEntry({
        seq: 6,
        role: "user",
        kind: "interaction_reply",
        text: "user reply text",
      }),
      conversationEntry({
        seq: 7,
        role: "assistant",
        kind: "assistant_revision",
        text: "rejected draft",
        messageId: "msg-2",
        attempt: 2,
      }),
      conversationEntry({
        seq: 8,
        role: "assistant",
        kind: "assistant_final",
        text: "repaired answer",
        messageId: "msg-2",
        attempt: 2,
      }),
    ];
    const items = projectSkillRunnerConversationEntriesToTranscriptItems(
      entries,
      {
        pendingPermission: {
          requestId: "perm-1",
          toolTitle: "Write items",
          summary: "Allow writing 2 items?",
          options: [{ optionId: "allow", name: "Allow" }],
        },
      },
    );
    const kinds = items.map((item) => item.itemKind);
    // The same-chain intermediate (seq 4) is replaced by the final (seq 5);
    // the rejected draft (seq 7) renders as its own row ahead of the
    // repaired final (legacy revision branch).
    assert.deepEqual(kinds, [
      "tool-call",
      "thought",
      "tool-call",
      "message",
      "message",
      "message",
      "message",
      "permission",
    ]);
    const toolCall = items[0];
    assert.equal(toolCall.itemKind, "tool-call");
    if (toolCall.itemKind === "tool-call") {
      assert.equal(toolCall.toolCallId, "tool-1");
    }
    assert.equal(items[1].itemKind, "thought");
    const finalMessage = items[3];
    assert.equal(finalMessage.itemKind, "message");
    if (finalMessage.itemKind === "message") {
      assert.equal(finalMessage.role, "assistant");
      assert.equal(finalMessage.text, "final answer");
      assert.isNull(finalMessage.revision);
    }
    const userMessage = items[4];
    if (userMessage.itemKind === "message") {
      assert.equal(userMessage.role, "user");
    }
    const revisionRow = items[5];
    assert.equal(revisionRow.itemKind, "message");
    if (revisionRow.itemKind === "message") {
      assert.equal(revisionRow.role, "assistant");
      assert.equal(revisionRow.text, "rejected draft");
      assert.deepEqual(revisionRow.revision, {
        count: 1,
        status: "replaced",
        repairRound: 2,
      });
    }
    const repairedFinal = items[6];
    assert.equal(repairedFinal.itemKind, "message");
    if (repairedFinal.itemKind === "message") {
      assert.equal(repairedFinal.text, "repaired answer");
      assert.deepEqual(repairedFinal.revision, {
        count: 1,
        status: "replaced",
        repairRound: 2,
      });
    }
    const permission = items[7];
    assert.equal(permission.itemKind, "permission");
    if (permission.itemKind === "permission") {
      assert.equal(permission.permissionRequestId, "perm-1");
      assert.equal(permission.status, "pending");
    }
    // Unpaired revisions (no matching final) stay dropped, as in legacy.
    const unpaired = projectSkillRunnerConversationEntriesToTranscriptItems([
      conversationEntry({
        seq: 1,
        role: "assistant",
        kind: "assistant_revision",
        text: "orphan draft",
        messageId: "msg-orphan",
        attempt: 1,
      }),
    ]);
    assert.deepEqual(unpaired, []);
    // A revision without draft text falls back to the legacy placeholder.
    const textless = projectSkillRunnerConversationEntriesToTranscriptItems([
      conversationEntry({
        seq: 1,
        role: "assistant",
        kind: "assistant_revision",
        text: "",
        messageId: "msg-r",
        attempt: 3,
      }),
      conversationEntry({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "kept answer",
        messageId: "msg-r",
        attempt: 3,
      }),
    ]);
    assert.equal(textless[0]?.itemKind, "message");
    if (textless[0]?.itemKind === "message") {
      assert.equal(textless[0].text, "Rejected final reply");
    }
  });

  it("publishes owner navigation with backend groups, task cards, and queued entries", async function () {
    const running = harness.seedTask({
      requestId: "req-nav-running",
      status: "waiting_user",
      taskName: "Running Task",
    });
    harness.seedTask({
      requestId: "req-nav-completed",
      status: "succeeded",
      taskName: "Completed Task",
    });
    const local = harness.seedTask({ taskName: "Local Task" });
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    workflowSubmissionQueue.enqueueSubmission({
      backend: {
        backendType: "skillrunner",
        backendId: harness.backendId,
      },
      workflow: {
        workflowId: "literature-digest",
        workflowLabel: "Literature Digest",
      },
      units: ["u1", "u2"].map((unitId, order) => ({
        unit: unitId,
        display: {
          unitId,
          order,
          taskName: `Queued Task ${unitId}`,
          inputUnitIdentity: `test:${unitId}`,
        },
      })),
      maxConcurrency: 1,
      executeUnit: async (unitId) => {
        if (unitId === "u1") await firstGate;
        return { status: "succeeded" };
      },
    });
    const capture = await attachReadModelHost(running.runKey);
    try {
      const navigation =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerNavigation();
      assert.equal(
        navigation.selectedOwner?.ownerKey,
        "req-nav-running",
        "request-scoped owner key uses the assigned request id",
      );
      const labels = navigation.entries.map((entry) => entry.label);
      assert.includeMembers(labels, [
        "Running Task",
        "Completed Task",
        "Local Task",
      ]);
      const runningEntry = navigation.entries.find(
        (entry) => entry.label === "Running Task",
      );
      assert.equal(runningEntry?.status, "waiting_user");
      assert.equal(runningEntry?.attention, "waiting_user");
      const completedEntry = navigation.entries.find(
        (entry) => entry.label === "Completed Task",
      );
      assert.equal(completedEntry?.status, "succeeded");
      const localEntry = navigation.entries.find(
        (entry) => entry.label === "Local Task",
      );
      assert.equal(
        localEntry?.owner.ownerKey,
        local.runKey,
        "unassigned local runs keep the run key as owner key",
      );
      assert.isNull(localEntry?.owner.requestId);
      const groupIds = navigation.groups.map((group) => group.groupId);
      assert.include(groupIds, harness.backendId);
      assert.lengthOf(navigation.queuedEntries, 1);
      assert.equal(navigation.queuedEntries[0]?.label, "Queued Task u2");
      assert.isTrue(navigation.queuedEntries[0]?.canCancel);
      assert.isFalse(navigation.canCreateOwner);
    } finally {
      capture.stop();
      releaseFirst();
    }
  });

  it("projects the skill-aware banner subtitle with a request-id fallback", async function () {
    const skillRun = harness.seedTask({
      requestId: "req-subtitle-skill",
      status: "succeeded",
      skillId: "test-subtitle-skill",
    });
    const capture = await attachReadModelHost(skillRun.runKey);
    try {
      const readPresentation = async () =>
        (
          await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
            owner: selectedOwner()!,
            kinds: ["owner-presentation"],
            context: undefined,
          })
        )["owner-presentation"];
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === skillRun.runKey && model.terminal;
      }, "skill run read model");
      const skillPresentation = await readPresentation();
      assert.equal(
        skillPresentation?.subtitle,
        "test-subtitle-skill",
        "single skill runs surface the resolved skill name",
      );

      // Sequence step: the shared secondary label carries the step number
      // and the skill/workflow pair, matching the ACP Skills banner.
      initializeSequenceRunState({
        request: {
          kind: "skillrunner.sequence.v1",
          steps: [
            {
              id: "step-digest",
              skill_id: "test-sequence-skill",
              workspace: "new",
            },
          ],
          final_step_id: "step-digest",
        } as any,
        backend: {
          id: harness.backendId,
          type: "skillrunner",
          baseUrl: harness.baseUrl,
          auth: { kind: "none" },
        } as any,
        providerOptions: {},
        workflowId: "test-sequence-workflow",
        workflowLabel: "Test Sequence Workflow",
        workflowRunId: "seq-subtitle-flow",
        jobId: "job-1",
      });
      const sequenceRun = harness.seedTask({
        requestId: "req-subtitle-sequence",
        status: "succeeded",
        skillId: "test-sequence-skill",
        workflowId: "test-sequence-workflow",
        sequenceRunId: "seq-subtitle-flow",
        sequenceJobId: "job-1",
        sequenceStepId: "step-digest",
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: sequenceRun.runKey },
      });
      await waitForCondition(async () => {
        if (getSkillRunnerWorkspaceReadModel()?.runKey !== sequenceRun.runKey) {
          return false;
        }
        return String((await readPresentation())?.subtitle || "").startsWith(
          "1️⃣",
        );
      }, "sequence step subtitle");
      const sequenceSubtitle = String(
        (await readPresentation())?.subtitle || "",
      );
      assert.ok(
        sequenceSubtitle.startsWith("1️⃣ "),
        "sequence steps carry the step number badge",
      );
      assert.include(
        sequenceSubtitle,
        "test-sequence-skill/",
        "sequence steps pair the skill name with the workflow label",
      );

      // Runs without skill metadata keep the request-id fallback.
      const plainRun = harness.seedTask({
        requestId: "req-subtitle-plain",
        status: "succeeded",
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: plainRun.runKey },
      });
      await waitForCondition(
        () => getSkillRunnerWorkspaceReadModel()?.runKey === plainRun.runKey,
        "plain run read model",
      );
      assert.equal((await readPresentation())?.subtitle, "req-subtitle-plain");
    } finally {
      capture.stop();
    }
  });

  it("projects pending interaction and auth through the shared DTO into owner-control", async function () {
    const interaction = harness.seedTask({
      requestId: "req-interaction",
      status: "waiting_user",
      pending: {
        interaction_id: 7,
        kind: "choose_one",
        prompt: "Pick a digest mode",
        options: [
          { label: "Short", value: "short" },
          { label: "Full", value: "full" },
        ],
      },
    });
    const interactionCapture = await attachReadModelHost(interaction.runKey);
    try {
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.status === "waiting_user" && !!model.pendingInteraction;
      }, "pending interaction read model");
      const owner = selectedOwner();
      assert.ok(owner);
      const regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: owner!,
        kinds: [...OWNER_REGION_KINDS],
        context: undefined,
      });
      const control = regions["owner-control"];
      assert.ok(control);
      assert.equal(control?.status, "waiting_user");
      assert.equal(control?.hint.kind, "waiting_user");
      assert.equal(control?.interaction?.inputKind, "choose_one");
      assert.deepEqual(
        control?.interaction?.options.map((option) => option.label),
        ["Short", "Full"],
      );
      assert.isTrue(control?.execution.canCancel);
      assert.isFalse(control?.authentication.required);
      assert.equal(regions.composer?.reply.status, "enabled");
      assert.isNotNull(regions["message-counts"]?.counts);
      assert.equal(regions["owner-presentation"]?.title, "Harness Task 1");
      assert.equal(regions["owner-details"]?.status, "ready");
      assert.isNull(regions.permission?.request);

      const auth = harness.seedTask({
        requestId: "req-auth",
        status: "waiting_auth",
        pendingAuth: {
          phase: "challenge_active",
          auth_session_id: "sess-auth-1",
          provider_id: "provider-x",
          challenge_kind: "auth_code_or_url",
          accepts_chat_input: true,
          input_kind: "auth_code",
          auth_url: "https://example.com/auth",
          user_code: "UC-123",
          last_error: "code expired once",
          available_methods: ["auth_code", "auth_url"],
          ask_user: {
            prompt: "Authorize the digest backend",
            hint: "Pick a method to continue",
            options: [
              { label: "Device code", value: "auth_code" },
              { label: "Browser URL", value: "auth_url" },
            ],
            files: [
              {
                name: "token.json",
                required: true,
                hint: "Exported token",
                accept: ".json",
              },
            ],
            ui_hints: { risk_notice_required: true },
          },
        },
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: auth.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return (
          model?.runKey === auth.runKey &&
          model.authRequired &&
          !!model.pendingInteraction
        );
      }, "waiting-auth read model with projected auth interaction");
      const authModel = getSkillRunnerWorkspaceReadModel();
      assert.equal(authModel?.status, "waiting_auth");
      assert.ok(
        authModel?.pendingInteraction,
        "auth chat input projects through the shared interaction DTO",
      );
      assert.equal(authModel?.pendingInteraction?.inputKind, "open_text");
      const authRegions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control", "composer"],
        context: undefined,
      });
      assert.equal(authRegions["owner-control"]?.hint.kind, "auth");
      assert.isTrue(authRegions["owner-control"]?.authentication.required);
      assert.equal(authRegions.composer?.reply.status, "enabled");

      // The full auth suite rides the shared interaction DTO so the child hint
      // region renders the legacy waiting-auth affordances unchanged.
      const authControl = authRegions["owner-control"];
      assert.equal(
        authControl?.hint.message,
        "Authorize the digest backend",
        "auth prompt resolves ask_user first, matching the legacy panel model",
      );
      assert.isFalse(
        authControl?.authentication.canAuthenticate,
        "SkillRunner has no banner Authenticate action",
      );
      const authInteraction = authControl?.interaction;
      assert.ok(
        authInteraction,
        "waiting_auth owner-control carries the interaction DTO",
      );
      assert.deepEqual(
        parseAssistantPendingInteraction(authInteraction),
        authInteraction,
        "auth-carrying DTO survives the exact wire parse",
      );
      const authSuite = authInteraction?.auth;
      assert.ok(authSuite, "auth suite is projected onto the shared DTO");
      assert.equal(authSuite?.phase, "challenge_active");
      assert.equal(authSuite?.challengeKind, "auth_code_or_url");
      assert.equal(authSuite?.prompt, "Authorize the digest backend");
      assert.equal(authSuite?.hint, "Pick a method to continue");
      assert.equal(authSuite?.inputKind, "auth_code");
      assert.isTrue(authSuite?.acceptsChatInput);
      assert.equal(authSuite?.authUrl, "https://example.com/auth");
      assert.equal(authSuite?.userCode, "UC-123");
      assert.equal(authSuite?.lastError, "code expired once");
      assert.isFalse(authSuite?.actionPending);
      assert.deepEqual(
        authSuite?.methods.map((method) => [method.label, method.value]),
        [
          ["Device code", "auth_code"],
          ["Browser URL", "auth_url"],
        ],
        "ask_user method options win over available_methods",
      );
      assert.deepEqual(authSuite?.importFiles, [
        {
          name: "token.json",
          required: true,
          hint: "Exported token",
          accept: ".json",
        },
      ]);
      assert.isTrue(authSuite?.importRiskNoticeRequired);

      // The child panel model projects the same hint shape the legacy
      // buildSkillRunnerPendingInteraction waiting-auth branch produced:
      // method buttons send the legacy reply-run auth payload byte for byte,
      // and the diagnostic/import fields pass through untouched.
      const authPanel = AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: { owner: selectedOwner(), control: authControl },
        },
        {},
        {},
      );
      const authHint = authPanel.interaction;
      assert.equal(authHint.kind, "auth");
      assert.ok(authHint.title);
      assert.equal(authHint.message, "Authorize the digest backend");
      assert.deepEqual(
        authHint.actions.map((action: Record<string, unknown>) => [
          action.action,
          action.payload,
        ]),
        [
          [
            "reply-run",
            {
              mode: "auth",
              selection: { kind: "auth_method", value: "auth_code" },
            },
          ],
          [
            "reply-run",
            {
              mode: "auth",
              selection: { kind: "auth_method", value: "auth_url" },
            },
          ],
        ],
      );
      assert.isTrue(authHint.actions[0].enabled);
      assert.equal(authHint.auth.phase, "challenge_active");
      assert.equal(authHint.auth.challengeKind, "auth_code_or_url");
      assert.equal(authHint.auth.hint, "Pick a method to continue");
      assert.equal(authHint.auth.inputKind, "auth_code");
      assert.isTrue(authHint.auth.acceptsChatInput);
      assert.equal(authHint.auth.authUrl, "https://example.com/auth");
      assert.equal(authHint.auth.userCode, "UC-123");
      assert.equal(authHint.auth.lastError, "code expired once");
      assert.isFalse(authHint.auth.actionPending);
      assert.deepEqual(authHint.auth.importFiles, [
        {
          name: "token.json",
          required: true,
          hint: "Exported token",
          accept: ".json",
        },
      ]);
      assert.isTrue(authHint.auth.importRiskNoticeRequired);
    } finally {
      interactionCapture.stop();
    }
  });

  it("serves transcript pages from in-memory messages and publishes snapshots only", async function () {
    const seeded = harness.seedTask({
      requestId: "req-transcript",
      status: "waiting_user",
      chatEvents: [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_process",
          text: "calling search tool",
          correlation: { process_type: "tool_call", tool_call_id: "tool-9" },
        },
        {
          seq: 2,
          role: "assistant",
          kind: "assistant_message",
          text: "draft in progress",
          correlation: { message_id: "msg-9" },
        },
      ],
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      const owner = selectedOwner();
      assert.ok(owner);
      // Page-first: the region is ready immediately from the in-memory
      // mirror; the backend history items arrive through the publication
      // clock without the read ever blocking on hydration.
      const firstRead = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: owner!,
        context: undefined,
      });
      assert.equal(firstRead.status, "ready");
      let region = firstRead;
      await waitForCondition(async () => {
        region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: owner!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) => item.itemKind === "tool-call",
        );
      }, "backend history items in transcript page");
      assert.ok(region.page);
      assert.match(region.page?.pageKey || "", /\ntail:\d+$/);
      const pageTexts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" || item.itemKind === "thought"
          ? item.text
          : "",
      );
      // Local submit notices stay in the transcript ahead of backend
      // history, matching the legacy pipeline.
      assert.include(pageTexts, "Task submitted locally.");
      assert.include(pageTexts, "draft in progress");
      const toolCall = region.page?.items.find(
        (item) => item.itemKind === "tool-call",
      );
      assert.ok(toolCall);
      assert.isAbove(region.transcriptRevision, 0);

      // Cursor page reads page the same in-memory mirror.
      const firstPage = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: owner!,
        context: undefined,
        request: { cursor: 0, limit: 1 },
      });
      assert.equal(firstPage.status, "ready");
      assert.lengthOf(firstPage.page?.items || [], 1);
      assert.equal(
        firstPage.page?.totalVisibleItemCount,
        region.page?.totalVisibleItemCount,
      );
      assert.isNotNull(firstPage.page?.nextCursor);

      // Live updates land as steady-state transcript *snapshots*, never
      // incremental mutations (design Decision 2).
      const baselineRevision = region.transcriptRevision;
      const baselinePublications = capture.publications.length;
      harness.appendChatEvents("req-transcript", [
        {
          seq: 3,
          role: "assistant",
          kind: "assistant_final",
          text: "completed digest",
          correlation: { message_id: "msg-9" },
        },
      ]);
      // A waiting run holds no SSE stream, so the appended history arrives on
      // the next workspace refresh (the same channel the production sidebar
      // uses on activation/reselection); the legacy push plane used to mask
      // this with its incidental snapshot-build re-sync loop.
      await refreshSkillRunnerSidebarHostSnapshot({});
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.transcriptRevision > baselineRevision,
          ),
        "steady-state transcript snapshot",
      );
      const appended = transcriptPublications(
        capture.publications.slice(baselinePublications),
      );
      assert.isNotEmpty(appended);
      for (const publication of appended) {
        assert.equal(
          publication.publicationForm,
          "snapshot",
          "SkillRunner transcript publishes snapshots only",
        );
      }
      const latest = appended[appended.length - 1];
      assert.equal(latest.publicationForm, "snapshot");
      if (latest.publicationForm === "snapshot") {
        const messages = (latest.payload.page?.items || []).filter(
          (item) => item.itemKind === "message",
        );
        const texts = messages.map((item) =>
          item.itemKind === "message" ? item.text : "",
        );
        // The final replaces the same-chain intermediate message.
        assert.include(texts, "completed digest");
        assert.notInclude(texts, "draft in progress");
        assert.ok(
          (latest.payload.page?.items || []).some(
            (item) => item.itemKind === "tool-call",
          ),
        );
      }
    } finally {
      capture.stop();
    }
  });

  it("publishes the owner-first loading sequence on owner switch", async function () {
    const first = harness.seedTask({
      requestId: "req-switch-a",
      status: "waiting_user",
      taskName: "Switch A",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "alpha" },
      ],
    });
    const second = harness.seedTask({
      requestId: "req-switch-b",
      status: "waiting_user",
      taskName: "Switch B",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "beta" },
      ],
    });
    const capture = await attachReadModelHost(first.runKey);
    try {
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "initial transcript snapshot",
      );
      capture.publications.length = 0;
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: second.runKey },
      });
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready" &&
              publication.owner.ownerKey === "req-switch-b",
          ),
        "switched transcript snapshot",
      );
      const transcripts = transcriptPublications(capture.publications);
      const loadingIndex = transcripts.findIndex(
        (publication) =>
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "loading" &&
          publication.payload.owner?.ownerKey === "req-switch-b",
      );
      const readyIndex = transcripts.findIndex(
        (publication) =>
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "ready" &&
          publication.owner.ownerKey === "req-switch-b",
      );
      assert.isAbove(loadingIndex, -1, "owner switch publishes loading first");
      assert.isAbove(readyIndex, loadingIndex);
    } finally {
      capture.stop();
    }
  });

  it("holds live transcript updates in boundary mode and republishes once at the boundary", async function () {
    setAssistantExecutionDisplayMode("boundary");
    const seeded = harness.seedTask({
      requestId: "req-boundary",
      status: "running",
      chatEvents: [],
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === seeded.runKey && !model.loading;
      }, "selected run read model settled");
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "initial transcript snapshot",
      );
      // Let the observer's initial critical refresh settle so the baseline is
      // not racing it.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await capture.runtime.flush();
      const baseline = transcriptPublications(capture.publications).length;
      // A tool process event is not a live-publish boundary; in boundary mode
      // the SSE live frame alone must not produce a transcript publication.
      harness.appendChatEvents("req-boundary", [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_process",
          text: "calling search tool",
          correlation: { process_type: "tool_call", tool_call_id: "tool-b" },
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await capture.runtime.flush();
      assert.equal(
        transcriptPublications(capture.publications).length,
        baseline,
        "boundary mode holds back live tool process updates",
      );
      // A message-classified event is a disabled-live boundary: the held tool
      // event rides along in the single republished snapshot (the pending
      // boundary is delivered once, not dropped).
      harness.appendChatEvents("req-boundary", [
        {
          seq: 2,
          role: "assistant",
          kind: "assistant_message",
          text: "boundary draft",
        },
      ]);
      await waitForCondition(
        () => transcriptPublications(capture.publications).length > baseline,
        "boundary transcript republication",
      );
      const boundarySnapshots = transcriptPublications(
        capture.publications,
      ).slice(baseline);
      const latest = boundarySnapshots[boundarySnapshots.length - 1];
      assert.equal(latest.publicationForm, "snapshot");
      if (latest.publicationForm === "snapshot") {
        const items = latest.payload.page?.items || [];
        const texts = items.map((item) =>
          item.itemKind === "message" ? item.text : "",
        );
        assert.include(texts, "boundary draft");
        assert.ok(
          items.some((item) => item.itemKind === "tool-call"),
          "the boundary snapshot carries the held live entries",
        );
        assert.notInclude(
          texts.slice(-1),
          "calling search tool",
          "held tool process stays a tool-call item, not a message",
        );
      }
    } finally {
      capture.stop();
    }
  });

  it("keeps the transcript publication clock across host detach/reattach", async function () {
    const seeded = harness.seedTask({
      requestId: "req-detach",
      status: "waiting_user",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "stable" },
      ],
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready" &&
              (publication.payload.page?.items || []).some(
                (item) => item.itemKind === "message" && item.text === "stable",
              ),
          ),
        "initial transcript snapshot with backend history",
      );
      const revisionBeforeDetach =
        getSkillRunnerWorkspaceReadModel()?.transcriptRevision || 0;
      assert.isAbove(revisionBeforeDetach, 0);

      capture.detachHost();
      // Reattach the same host window: only host wiring is re-established;
      // the module-level transcript publication clock must survive.
      await capture.reattachHost();
      await capture.runtime.flush();

      const revisionAfterReattach =
        getSkillRunnerWorkspaceReadModel()?.transcriptRevision || 0;
      assert.isAtLeast(
        revisionAfterReattach,
        revisionBeforeDetach,
        "host detach/reattach must not regress the transcript revision",
      );
      const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      assert.isAtLeast(region.transcriptRevision, revisionBeforeDetach);
      const texts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" ? item.text : "",
      );
      assert.include(texts, "stable");
    } finally {
      capture.stop();
    }
  });

  it("graduates a local-only run to backend history with an owner switch", async function () {
    const local = harness.seedTask({ taskName: "Local Graduate" });
    const capture = await attachReadModelHost(local.runKey);
    try {
      await capture.runtime.flush();
      await waitForCondition(
        () => getSkillRunnerWorkspaceReadModel()?.runKey === local.runKey,
        "local run read model",
      );
      const localOwner = selectedOwner();
      assert.equal(localOwner?.ownerKey, local.runKey);
      const localRegion =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: localOwner!,
          context: undefined,
        });
      assert.equal(localRegion.status, "ready");

      // Late request-id assignment: the owner key flips from run key to
      // request id and the transcript qualifies against backend history
      // instead of the local placeholder (design Decisions 1 and 8).
      harness.registerRunChannel("req-graduate", {
        status: "waiting_user",
        chatEvents: [
          {
            seq: 1,
            role: "assistant",
            kind: "assistant_final",
            text: "backend history body",
          },
        ],
      });
      applySkillRunnerRunEvent({
        type: "request.created",
        runKey: local.runKey,
        requestId: "req-graduate",
        updatedAt: "2026-07-18T00:01:40.000Z",
      });
      applySkillRunnerRunEvent({
        type: "backend.snapshot",
        runKey: local.runKey,
        state: "request_ready",
        updatedAt: "2026-07-18T00:01:41.000Z",
      });
      applySkillRunnerRunEvent({
        type: "backend.snapshot",
        runKey: local.runKey,
        state: "waiting_user",
        backendStatus: "waiting_user",
        updatedAt: "2026-07-18T00:01:42.000Z",
      });
      await waitForCondition(
        () => getSkillRunnerWorkspaceReadModel()?.requestId === "req-graduate",
        "request id assignment in read model",
      );
      await waitForCondition(
        () => selectedOwner()?.ownerKey === "req-graduate",
        "owner switch to request-scoped key",
      );
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.owner.ownerKey === "req-graduate" &&
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "graduated transcript snapshot",
      );
      let region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      await waitForCondition(async () => {
        region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) =>
            item.itemKind === "message" && item.text === "backend history body",
        );
      }, "backend history replacing the local placeholder transcript");
      const texts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" ? item.text : "",
      );
      assert.include(texts, "backend history body");
    } finally {
      capture.stop();
    }
  });

  it("projects control/auto-reply badges and the legacy composer states", async function () {
    const waiting = harness.seedTask({
      requestId: "req-badge-waiting",
      status: "waiting_user",
      requestPayload: { runtime_options: { interactive_auto_reply: true } },
    });
    const capture = await attachReadModelHost(waiting.runKey);
    try {
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return (
          model?.runKey === waiting.runKey && model.status === "waiting_user"
        );
      }, "waiting read model");
      let regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control", "composer"],
        context: undefined,
      });
      assert.deepEqual(regions["owner-control"]?.badges?.control, {
        state: "input",
        tone: "warning",
        title: null,
      });
      // The seed requests interactive auto reply, so the badge is present
      // with an inactive observer.
      assert.deepEqual(regions["owner-control"]?.badges?.autoReply, {
        active: false,
        remainingSeconds: null,
        progressPercent: null,
      });
      assert.equal(regions.composer?.reply.status, "enabled");
      assert.isNull(
        regions.composer?.runtimeOptions,
        "SkillRunner projects no runtime option groups",
      );

      // Banner/reply chrome projection from the same payloads.
      let panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: {
            owner: selectedOwner(),
            control: regions["owner-control"],
            composer: regions.composer,
          },
        },
        {},
        {},
      );
      const controlIndicator = panel.context.indicators.find(
        (entry: Record<string, unknown>) => entry.id === "skillrunner-control",
      );
      assert.ok(controlIndicator, "control badge replaces the Connection LED");
      assert.equal(controlIndicator.value, "Needs input");
      assert.equal(controlIndicator.tone, "warning");
      assert.isFalse(
        panel.context.indicators.some(
          (entry: Record<string, unknown>) => entry.id === "acp-connection",
        ),
        "SkillRunner banner has no connection indicator",
      );
      const autoReplyIndicator = panel.context.indicators.find(
        (entry: Record<string, unknown>) =>
          entry.id === "skillrunner-auto-reply",
      );
      assert.ok(autoReplyIndicator);
      assert.equal(autoReplyIndicator.value, "Inactive");
      assert.equal(autoReplyIndicator.tone, "muted");
      assert.deepEqual(panel.reply.controls, []);
      assert.isFalse(panel.reply.showUsageGauge);
      assert.equal(
        panel.reply.placeholder,
        "Reply to the pending SkillRunner interaction...",
      );
      assert.equal(panel.reply.action, "reply-run");

      // Running run: badge flips to streaming and the composer primary
      // button becomes Cancel (cancel-run, danger tone).
      const running = harness.seedTask({
        requestId: "req-badge-running",
        status: "running",
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: running.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === running.runKey && model.status === "running";
      }, "running read model");
      regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control", "composer"],
        context: undefined,
      });
      assert.deepEqual(regions["owner-control"]?.badges?.control, {
        state: "streaming",
        tone: "success",
        title: null,
      });
      assert.equal(regions.composer?.reply.status, "busy");
      panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: {
            owner: selectedOwner(),
            control: regions["owner-control"],
            composer: regions.composer,
          },
        },
        {},
        {},
      );
      assert.equal(panel.reply.action, "cancel-run");
      assert.equal(panel.reply.submitLabel, "Cancel");
      assert.equal(panel.reply.tone, "danger");
      assert.isTrue(panel.reply.enabled);
      assert.isFalse(panel.reply.inputEnabled);

      // Terminal run: read-only badge, disabled composer.
      const done = harness.seedTask({
        requestId: "req-badge-done",
        status: "succeeded",
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: done.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === done.runKey && model.terminal;
      }, "terminal read model");
      regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control", "composer"],
        context: undefined,
      });
      assert.deepEqual(regions["owner-control"]?.badges?.control, {
        state: "read-only",
        tone: "muted",
        title: null,
      });
      assert.equal(regions.composer?.reply.status, "disabled");

      // Waiting-auth run: auth badge; a challenge that does not accept chat
      // input keeps the composer disabled (legacy authInputVisible gate).
      const auth = harness.seedTask({
        requestId: "req-badge-auth",
        status: "waiting_auth",
        pendingAuth: {
          phase: "challenge_active",
          challenge_kind: "api_key",
          accepts_chat_input: true,
          input_kind: "api_key",
          available_methods: ["api_key"],
        },
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: auth.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return (
          model?.runKey === auth.runKey &&
          model.authRequired &&
          !!model.pendingAuth
        );
      }, "waiting-auth read model");
      regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control", "composer"],
        context: undefined,
      });
      assert.deepEqual(regions["owner-control"]?.badges?.control, {
        state: "auth",
        tone: "warning",
        title: null,
      });
      assert.equal(regions.composer?.reply.status, "enabled");

      const authImport = harness.seedTask({
        requestId: "req-badge-auth-import",
        status: "waiting_auth",
        pendingAuth: {
          phase: "challenge_active",
          challenge_kind: "import_files",
          accepts_chat_input: true,
          input_kind: "import_files",
          available_methods: ["import_files"],
        },
      });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: authImport.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return (
          model?.runKey === authImport.runKey &&
          model.authRequired &&
          !!model.pendingAuth
        );
      }, "waiting-auth import read model");
      regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["composer"],
        context: undefined,
      });
      assert.equal(
        regions.composer?.reply.status,
        "disabled",
        "import-files challenges take no chat input",
      );

      // Local pre-request run: preparing badge.
      const local = harness.seedTask({ taskName: "Local Prepare" });
      await dispatchRunWorkspaceAction({
        action: "select-task",
        payload: { taskKey: local.runKey },
      });
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === local.runKey && !model.requestAssigned;
      }, "local read model");
      regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-control"],
        context: undefined,
      });
      assert.deepEqual(regions["owner-control"]?.badges?.control, {
        state: "preparing",
        tone: "accent",
        title: null,
      });
    } finally {
      capture.stop();
    }
  });

  it("maps all eight control badge states and the auto-reply countdown in the panel model", function () {
    const owner = {
      source: "skillrunner",
      ownerKey: "req-1",
      requestId: "req-1",
      runKey: "run-1",
    };
    const project = (badges: unknown) =>
      AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: {
            owner,
            control: {
              status: "running",
              busy: true,
              hint: { kind: "hidden", message: null },
              badges,
            },
          },
        },
        {},
        {},
      );
    const expectations: Array<[string, string, string]> = [
      ["approval", "Approval", "warning"],
      ["auth", "Auth", "warning"],
      ["input", "Needs input", "warning"],
      ["preparing", "Preparing", "accent"],
      ["submitting", "Submitting", "accent"],
      ["read-only", "Read-only", "muted"],
      ["streaming", "Streaming", "success"],
      ["unavailable", "Unavailable", "muted"],
    ];
    for (const [state, value, tone] of expectations) {
      const panel = project({
        control: { state, tone, title: null },
        autoReply: null,
      });
      const indicator = panel.context.indicators.find(
        (entry: Record<string, unknown>) => entry.id === "skillrunner-control",
      );
      assert.ok(indicator, `control badge for ${state}`);
      assert.equal(indicator.value, value, `badge value for ${state}`);
      assert.equal(indicator.tone, tone, `badge tone for ${state}`);
      assert.equal(indicator.title, value, `badge tooltip for ${state}`);
    }
    // Permission approval carries the request summary as the tooltip.
    const approval = project({
      control: { state: "approval", tone: "warning", title: "Allow writes?" },
      autoReply: null,
    });
    const approvalIndicator = approval.context.indicators.find(
      (entry: Record<string, unknown>) => entry.id === "skillrunner-control",
    );
    assert.equal(approvalIndicator.title, "Allow writes?");

    const active = project({
      control: { state: "streaming", tone: "success", title: null },
      autoReply: { active: true, remainingSeconds: 42, progressPercent: 30 },
    });
    const activeIndicator = active.context.indicators.find(
      (entry: Record<string, unknown>) => entry.id === "skillrunner-auto-reply",
    );
    assert.ok(activeIndicator);
    assert.equal(activeIndicator.value, "Active");
    assert.equal(activeIndicator.tone, "success");
    assert.equal(activeIndicator.extraValue, "42s");
    assert.equal(activeIndicator.progressPercent, 30);
    assert.isTrue(activeIndicator.valueVisible);

    // Empty workspace: the unavailable badge stands in for the empty chrome
    // connection LED.
    const emptyPanel = AssistantPanelModel.projectAssistantWorkspacePanel(
      { source: "skillrunner", selection: { owner: null } },
      {},
      {},
    );
    const emptyIndicator = emptyPanel.context.indicators.find(
      (entry: Record<string, unknown>) => entry.id === "skillrunner-control",
    );
    assert.ok(emptyIndicator, "empty chrome shows the control badge");
    assert.equal(emptyIndicator.value, "Unavailable");
    assert.isFalse(
      emptyPanel.context.indicators.some(
        (entry: Record<string, unknown>) => entry.id === "acp-connection",
      ),
    );
  });

  it("restores the legacy waiting-auth composer guidance in the panel model", function () {
    const owner = {
      source: "skillrunner",
      ownerKey: "req-auth",
      requestId: "req-auth",
      runKey: "run-auth",
    };
    const project = (auth: Record<string, unknown>, status = "enabled") =>
      AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: {
            owner,
            control: {
              status: "waiting_auth",
              busy: false,
              hint: { kind: "auth", message: "Authentication required." },
              interaction: {
                inputKind: "open_text",
                prompt: null,
                hint: null,
                options: [],
                files: [],
                fileReply: { supported: false },
                auth,
              },
            },
            composer: { reply: { status }, runtimeOptions: null },
          },
        },
        {},
        {},
      );
    const baseAuth = {
      phase: "challenge_active",
      challengeKind: "api_key",
      hint: "",
      inputKind: "api_key",
      acceptsChatInput: true,
      authUrl: "",
      userCode: "",
      lastError: "",
      actionPending: false,
      actionKind: "",
      methods: [],
      importFiles: [],
      importRiskNoticeRequired: false,
    };
    let panel = project(baseAuth);
    assert.equal(panel.reply.placeholder, "Paste API key");
    assert.equal(panel.reply.submitLabel, "Submit API Key");

    panel = project({ ...baseAuth, inputKind: "auth_code" });
    assert.equal(panel.reply.placeholder, "Paste authorization code");
    assert.equal(panel.reply.submitLabel, "Submit Code");

    // The backend hint wins over the per-kind default.
    panel = project({ ...baseAuth, hint: "Paste the token from the console" });
    assert.equal(panel.reply.placeholder, "Paste the token from the console");

    // Auth action in flight: awaiting labels and the sending state.
    panel = project({ ...baseAuth, actionPending: true }, "disabled");
    assert.equal(panel.reply.placeholder, "Awaiting auth state update...");
    assert.equal(panel.reply.submitLabel, "Awaiting");
    assert.isTrue(panel.reply.sending);
  });

  it("restores the legacy five-section owner details projection", async function () {
    const seeded = harness.seedTask({
      requestId: "req-details",
      status: "waiting_user",
      pending: {
        interaction_id: 12,
        kind: "choose_one",
        prompt: "Pick a mode",
        options: [{ label: "A", value: "a" }],
      },
      chatEvents: [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_revision",
          text: "rejected draft body",
          correlation: { message_id: "msg-d", attempt: 2 },
        },
        {
          seq: 2,
          role: "assistant",
          kind: "assistant_final",
          text: "repaired digest",
          correlation: { message_id: "msg-d", attempt: 2 },
        },
      ],
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return (
          model?.runKey === seeded.runKey &&
          model.status === "waiting_user" &&
          !!model.pendingInteraction
        );
      }, "details read model settled");
      await waitForCondition(async () => {
        const details = (
          await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
            owner: selectedOwner()!,
            kinds: ["owner-details"],
            context: undefined,
          })
        )["owner-details"];
        return (
          details?.status === "ready" &&
          details.sections.some(
            (section) =>
              section.sectionId === "revision-summary" &&
              section.items.some((item) => item.fieldId === "count"),
          )
        );
      }, "owner details with revision summary");
      const regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
        owner: selectedOwner()!,
        kinds: ["owner-details"],
        context: undefined,
      });
      const details = regions["owner-details"];
      assert.ok(details);
      assert.deepEqual(
        details!.sections.map((section) => section.sectionId),
        [
          "run",
          "deferred-apply",
          "pending",
          "conversation-summary",
          "revision-summary",
        ],
      );
      assert.deepEqual(details!.actions, ["copy-id", "copy-diagnostics"]);
      const sectionItems = (sectionId: string) =>
        new Map(
          (
            details!.sections.find((section) => section.sectionId === sectionId)
              ?.items || []
          ).map((item) => [item.fieldId, item.value] as const),
        );
      const runFields = sectionItems("run");
      assert.equal(runFields.get("request-id"), "req-details");
      assert.equal(runFields.get("task-key"), seeded.runKey);
      assert.equal(runFields.get("status"), "waiting_user");
      assert.equal(runFields.get("terminal"), "false");
      assert.equal(runFields.get("waiting"), "true");
      const pendingFields = sectionItems("pending");
      assert.equal(pendingFields.get("pending-interaction"), "12");
      assert.equal(pendingFields.get("pending-kind"), "choose_one");
      assert.equal(pendingFields.get("pending-prompt"), "Pick a mode");
      assert.equal(pendingFields.get("pending-options"), "1");
      const conversationFields = sectionItems("conversation-summary");
      assert.isAtLeast(
        Number(conversationFields.get("messages") || 0),
        2,
        "conversation summary counts the session messages",
      );
      assert.equal(conversationFields.get("latest-kind"), "assistant_final");
      const revisionFields = sectionItems("revision-summary");
      assert.equal(revisionFields.get("count"), "1");
      assert.equal(revisionFields.get("latest"), "rejected draft body");

      // The sidebar projection maps the field ids onto the legacy labels.
      const panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: {
            owner: selectedOwner(),
            details,
          },
        },
        {},
        {},
      );
      const sectionTitles = panel.drawers.details.map(
        (section: Record<string, unknown>) => section.title,
      );
      assert.deepEqual(sectionTitles, [
        "Run",
        "Deferred apply",
        "Pending",
        "Conversation Summary",
        "Revision Summary",
      ]);
      const runSection = panel.drawers.details[0];
      const runLabels = runSection.entries.map(
        (entry: Record<string, unknown>) => entry.label,
      );
      assert.includeMembers(runLabels, [
        "Title",
        "Request ID",
        "Task key",
        "Status",
        "Backend",
      ]);
    } finally {
      capture.stop();
    }
  });

  it("keeps unreachable backend groups in navigation and the drawer", async function () {
    const seeded = harness.seedTask({
      requestId: "req-unreachable",
      status: "waiting_user",
      taskName: "Unreachable Task",
    });
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await capture.runtime.flush();
      markSkillRunnerBackendHealthFailure({
        backendId: harness.backendId,
        error: new Error("connection refused"),
      });
      markSkillRunnerBackendHealthFailure({
        backendId: harness.backendId,
        error: new Error("connection refused"),
      });
      await refreshSkillRunnerSidebarHostSnapshot({});
      let navigation =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerNavigation();
      await waitForCondition(async () => {
        navigation = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerNavigation();
        return navigation.groups.some(
          (entry) =>
            entry.groupId === harness.backendId &&
            entry.status === "unavailable",
        );
      }, "unreachable backend group in navigation");
      const group = navigation.groups.find(
        (entry) => entry.groupId === harness.backendId,
      );
      assert.ok(group, "unreachable backend keeps its navigation group");
      assert.equal(group?.status, "unavailable");
      assert.match(
        group?.disabledReason || "",
        /temporarily unreachable/,
        "group carries the localized unreachable reason",
      );
      assert.isEmpty(
        navigation.entries,
        "task rows are withheld while the backend is unreachable",
      );

      // The drawer projection re-attaches the group as disabled, with the
      // reason text, inside a dedicated unavailable section placed after
      // completed — never inside the running section.
      const panel = AssistantPanelModel.projectAssistantWorkspacePanel(
        {
          source: "skillrunner",
          selection: { owner: null },
          navigation,
        },
        {},
        {},
      );
      const running = panel.drawers.sections.find(
        (section: Record<string, unknown>) => section.id === "running",
      );
      assert.isFalse(
        (running?.groups || []).some(
          (entry: Record<string, unknown>) =>
            entry.groupKey === harness.backendId,
        ),
        "unreachable group no longer lives in the running section",
      );
      const unavailable = panel.drawers.sections.find(
        (section: Record<string, unknown>) => section.id === "unavailable",
      );
      assert.ok(unavailable, "drawer has a dedicated unavailable section");
      const drawerGroup = unavailable.groups.find(
        (entry: Record<string, unknown>) =>
          entry.groupKey === harness.backendId,
      );
      assert.ok(drawerGroup, "unavailable section keeps the unreachable group");
      assert.isTrue(drawerGroup.disabled);
      assert.match(drawerGroup.disabledReason, /temporarily unreachable/);
      assert.isTrue(drawerGroup.collapsed);
      assert.equal(
        panel.drawers.sections[panel.drawers.sections.length - 1]?.id,
        "unavailable",
        "unavailable section trails the completed section",
      );
    } finally {
      capture.stop();
    }
  });

  it("localizes waiting attention tokens in drawer task tooltips", function () {
    const owner = {
      source: "skillrunner",
      ownerKey: "req-att",
      requestId: "req-att",
      runKey: "run-att",
    };
    const panel = AssistantPanelModel.projectAssistantWorkspacePanel(
      {
        source: "skillrunner",
        selection: { owner },
        navigation: {
          selectedOwner: owner,
          selectedGroupId: "backend-1",
          groups: [
            {
              groupId: "backend-1",
              label: "Backend One",
              status: "idle",
              disabledReason: null,
            },
          ],
          entries: [
            {
              owner,
              groupId: "backend-1",
              label: "Waiting Task",
              subtitle: null,
              description: null,
              groupLabel: "Backend One",
              status: "waiting_user",
              backendStatus: "waiting_user",
              applyState: null,
              attention: "waiting_user",
              updatedAt: null,
              messageCount: 0,
            },
            {
              owner: {
                ...owner,
                ownerKey: "req-auth-2",
                requestId: "req-auth-2",
              },
              groupId: "backend-1",
              label: "Auth Task",
              subtitle: null,
              description: null,
              groupLabel: "Backend One",
              status: "waiting_auth",
              backendStatus: "waiting_auth",
              applyState: null,
              attention: "waiting_auth",
              updatedAt: null,
              messageCount: 0,
            },
          ],
          queuedEntries: [],
          canCreateOwner: false,
          notice: null,
        },
      },
      {},
      {},
    );
    const tasks = panel.drawers.sections.flatMap(
      (section: Record<string, unknown>) =>
        (section.groups as Array<Record<string, unknown>>).flatMap((group) => [
          ...(group.activeTasks as Array<Record<string, unknown>>),
          ...(group.finishedTasks as Array<Record<string, unknown>>),
        ]),
    );
    assert.lengthOf(tasks, 2);
    for (const task of tasks) {
      assert.equal(task.attention, "warning");
      assert.equal(
        task.attentionLabel,
        "Needs user interaction",
        "raw waiting tokens never leak into the tooltip",
      );
    }
  });

  it("appends the loading-conversation system message during same-owner history hydration", async function () {
    let releaseHistory!: () => void;
    const historyGate = new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });
    const seeded = harness.seedTask({
      requestId: "req-hydrate",
      status: "succeeded",
      chatEvents: [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_final",
          text: "hydrated digest",
        },
      ],
    });
    harness.setHistoryGate("req-hydrate", historyGate);
    const capture = await attachReadModelHost(seeded.runKey);
    try {
      await waitForCondition(async () => {
        const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) => item.itemId === "skillrunner-history-loading",
        );
      }, "loading-conversation system message on the tail page");
      const loadingRegion =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
      const items = loadingRegion.page?.items || [];
      const loadingRow = items.find(
        (item) => item.itemId === "skillrunner-history-loading",
      );
      assert.ok(loadingRow);
      assert.equal(loadingRow.itemKind, "message");
      if (loadingRow.itemKind === "message") {
        assert.equal(loadingRow.role, "system");
        assert.ok(
          String(loadingRow.text || "").trim(),
          "loading system message carries text",
        );
      }
      // The loading message is the trailing row of the tail page.
      assert.equal(
        items[items.length - 1]?.itemId,
        "skillrunner-history-loading",
      );

      releaseHistory();
      harness.setHistoryGate("req-hydrate", null);
      await waitForCondition(async () => {
        const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        const items = region.page?.items || [];
        return (
          items.some(
            (item) =>
              item.itemKind === "message" && item.text === "hydrated digest",
          ) &&
          !items.some((item) => item.itemId === "skillrunner-history-loading")
        );
      }, "hydrated history replacing the loading message");
      const settled = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      assert.isFalse(
        (settled.page?.items || []).some(
          (item) => item.itemId === "skillrunner-history-loading",
        ),
        "loading message disappears once hydration completes",
      );
    } finally {
      releaseHistory();
      capture.stop();
    }
  });

  it("degrades a missing chat history (404) into a transcript system message", async function () {
    const finished = harness.seedTask({
      requestId: "req-history-missing",
      status: "succeeded",
      historyNotFound: true,
    });
    const capture = await attachReadModelHost(finished.runKey);
    try {
      await waitForCondition(async () => {
        const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) => item.itemId === "skillrunner-history-not-found",
        );
      }, "history-not-found system message on the tail page");
      const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      const items = region.page?.items || [];
      const notFoundRow = items.find(
        (item) => item.itemId === "skillrunner-history-not-found",
      );
      assert.ok(notFoundRow);
      assert.equal(notFoundRow.itemKind, "message");
      if (notFoundRow.itemKind === "message") {
        assert.equal(notFoundRow.role, "system");
        assert.ok(
          String(notFoundRow.text || "").trim(),
          "not-found system message carries text",
        );
      }
      assert.equal(
        items[items.length - 1]?.itemId,
        "skillrunner-history-not-found",
      );
      // The missing history must not flip the finished run into a failure.
      const model = getSkillRunnerWorkspaceReadModel();
      assert.equal(model?.status, "succeeded");
      assert.isTrue(model?.terminal);
      assert.isNull(model?.error);
      // The system message rides the transcript publication channel.
      await capture.waitFor(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          (publication.payload.page?.items || []).some(
            (item) => item.itemId === "skillrunner-history-not-found",
          ),
        "transcript snapshot carrying the not-found system message",
      );
    } finally {
      capture.stop();
    }
  });

  it("keeps a waiting run alive when its chat history answers 404", async function () {
    const waiting = harness.seedTask({
      requestId: "req-history-observer-404",
      status: "waiting_user",
      historyNotFound: true,
    });
    const capture = await attachReadModelHost(waiting.runKey);
    try {
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === waiting.runKey && !model.loading;
      }, "waiting run read model settled");
      // The observer's history sync hits the 404 endpoint; a terminal
      // misclassification would surface as a failed run, the degradation as
      // a history-not-found system message.
      await waitForCondition(async () => {
        const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) => item.itemId === "skillrunner-history-not-found",
        );
      }, "observer-path 404 recorded as history-not-found");
      const model = getSkillRunnerWorkspaceReadModel();
      assert.equal(model?.status, "waiting_user");
      assert.isFalse(model?.terminal);
    } finally {
      capture.stop();
    }
  });

  it("uses the legacy empty-selection transcript copy for skillrunner", function () {
    const labels = buildAssistantWorkspacePublicationLabels("skillrunner");
    assert.equal(labels.emptySelection, "No SkillRunner tasks.");
  });

  it("ships localized transcript role labels for user and system rows", function () {
    const labels = buildAssistantWorkspacePublicationLabels("skillrunner");
    const transcript = labels.assistantPanel.transcript as Record<
      string,
      unknown
    >;
    // Regression: missing entries used to fall back to the raw role literal.
    for (const role of ["user", "system"]) {
      const value = String(transcript[role] || "").trim();
      assert.ok(value, `transcript labels carry a ${role} entry`);
      assert.notEqual(value, role);
    }
  });
});

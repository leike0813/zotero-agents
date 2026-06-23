import { assert } from "chai";
import {
  buildRunDialogDisplayMessages,
  normalizeRunDialogPendingState,
  normalizeRunDialogMessageKind,
  normalizeRunDialogMessageRole,
  normalizeRunDialogChoiceOptions,
  resolveRunDialogInteractionResponse,
  shouldClearRunDialogPendingForStatus,
  shouldRefreshRunDialogLocalMessages,
  shouldRefreshRunDialogStateFromChatEvent,
  type SkillRunnerConversationEntry,
  toRunDialogConversationEntry,
} from "../../src/modules/skillRunnerRunDialog";

describe("skillrunner run dialog bubble message model", function () {
  it("normalizes unknown or empty role to system", function () {
    assert.equal(normalizeRunDialogMessageRole("assistant"), "assistant");
    assert.equal(normalizeRunDialogMessageRole("user"), "user");
    assert.equal(normalizeRunDialogMessageRole("system"), "system");
    assert.equal(normalizeRunDialogMessageRole("Agent"), "system");
    assert.equal(normalizeRunDialogMessageRole(""), "system");
    assert.equal(normalizeRunDialogMessageRole(undefined), "system");
  });

  it("builds structured conversation entry with role and text", function () {
    const entry = toRunDialogConversationEntry({
      event: {
        seq: 9,
        ts: "2026-03-10T10:20:00Z",
        role: "assistant",
        text: "final answer",
      },
      lastSeq: 0,
    });
    assert.isOk(entry);
    assert.equal(entry?.seq, 9);
    assert.equal(entry?.role, "assistant");
    assert.equal(entry?.kind, "unknown");
    assert.equal(entry?.text, "final answer");
    assert.equal(entry?.displayText, "final answer");
    assert.isNull(entry?.displayFormat);
    assert.equal(entry?.ts, "2026-03-10T10:20:00Z");
  });

  it("does not refresh local notices over backend transcript entries", function () {
    const backendMessage: SkillRunnerConversationEntry = {
      seq: 3,
      ts: "2026-06-23T10:00:00Z",
      role: "assistant",
      kind: "assistant_message",
      text: "backend transcript",
      displayText: "backend transcript",
      raw: {
        type: "message",
      },
    };

    assert.equal(
      shouldRefreshRunDialogLocalMessages({ messages: [backendMessage] }),
      false,
    );
  });

  it("refreshes local notices only while no backend transcript exists", function () {
    const localNotice: SkillRunnerConversationEntry = {
      seq: -5,
      role: "system",
      kind: "orchestration_notice",
      text: "Task submitted locally.",
      displayText: "Task submitted locally.",
      raw: {
        type: "local_submit_notice",
      },
    };

    assert.equal(shouldRefreshRunDialogLocalMessages({ messages: [] }), true);
    assert.equal(
      shouldRefreshRunDialogLocalMessages({ messages: [localNotice] }),
      true,
    );
  });

  it("prefers projected display_text over raw text for assistant_final display", function () {
    const entry = toRunDialogConversationEntry({
      event: {
        seq: 10,
        ts: "2026-04-15T09:00:00Z",
        role: "assistant",
        kind: "assistant_final",
        text: '{"__SKILL_DONE__":true,"report":"raw"}',
        display_text: "Rendered final answer",
        display_format: "markdown",
      },
      lastSeq: 0,
    });
    assert.isOk(entry);
    assert.equal(entry?.text, '{"__SKILL_DONE__":true,"report":"raw"}');
    assert.equal(entry?.displayText, "Rendered final answer");
    assert.equal(entry?.displayFormat, "markdown");
  });

  it("drops duplicated seq and falls back unknown role to system", function () {
    const seen = new Set<string>();
    const duplicated = toRunDialogConversationEntry({
      event: {
        seq: 3,
        role: "user",
        text: "duplicate",
      },
      lastSeq: 3,
      seenKeys: seen,
    });
    assert.isOk(duplicated);
    const duplicatedAgain = toRunDialogConversationEntry({
      event: {
        seq: 3,
        role: "user",
        text: "duplicate",
      },
      lastSeq: 3,
      seenKeys: seen,
    });
    assert.isNull(duplicatedAgain);

    const normalized = toRunDialogConversationEntry({
      event: {
        seq: 4,
        role: "agent",
        summary: "hello",
      },
      lastSeq: 3,
      seenKeys: seen,
    });
    assert.isOk(normalized);
    assert.equal(normalized?.role, "system");
    assert.equal(normalized?.text, "hello");
  });

  it("normalizes known message kind and defaults unknown to unknown", function () {
    assert.equal(normalizeRunDialogMessageKind("assistant_process"), "assistant_process");
    assert.equal(normalizeRunDialogMessageKind("assistant_message"), "assistant_message");
    assert.equal(normalizeRunDialogMessageKind("assistant_final"), "assistant_final");
    assert.equal(normalizeRunDialogMessageKind("assistant_revision"), "assistant_revision");
    assert.equal(normalizeRunDialogMessageKind("weird_kind"), "unknown");
  });

  it("keeps assistant_revision rows even when display text is empty", function () {
    const entry = toRunDialogConversationEntry({
      event: {
        seq: 11,
        role: "assistant",
        kind: "assistant_revision",
        text: "",
        display_text: "",
        correlation: {
          message_id: "f-1",
          message_family_id: "family-1",
        },
      },
      lastSeq: 0,
    });
    assert.isOk(entry);
    assert.equal(entry?.kind, "assistant_revision");
    assert.equal(entry?.messageId, "f-1");
    assert.equal(entry?.messageFamilyId, "family-1");
  });

  it("normalizes choice options from object and string forms", function () {
    const options = normalizeRunDialogChoiceOptions([
      { label: "Continue Q&A", value: "qa_analysis" },
      { label: "Generate note", value: "generate_note" },
      "End task",
      { label: "", value: "invalid" },
      12,
      null,
    ]);
    assert.deepEqual(options, [
      { label: "Continue Q&A", value: "qa_analysis" },
      { label: "Generate note", value: "generate_note" },
      { label: "End task", value: "End task" },
    ]);
  });

  it("accepts same seq when text differs, then deduplicates exact same payload", function () {
    const seen = new Set<string>();
    const first = toRunDialogConversationEntry({
      event: {
        seq: 7,
        role: "assistant",
        text: "draft",
      },
      lastSeq: 7,
      seenKeys: seen,
    });
    const second = toRunDialogConversationEntry({
      event: {
        seq: 7,
        role: "assistant",
        text: "final",
      },
      lastSeq: 7,
      seenKeys: seen,
    });
    const secondDuplicate = toRunDialogConversationEntry({
      event: {
        seq: 7,
        role: "assistant",
        text: "final",
      },
      lastSeq: 7,
      seenKeys: seen,
    });
    assert.isOk(first);
    assert.isOk(second);
    assert.equal(second?.text, "final");
    assert.isNull(secondDuplicate);
  });

  function entry(args: {
    seq: number;
    role: "assistant" | "user" | "system";
    kind: Parameters<typeof normalizeRunDialogMessageKind>[0];
    text: string;
    attempt?: number;
    messageId?: string;
    messageFamilyId?: string;
    replacesMessageId?: string;
  }): SkillRunnerConversationEntry {
    return {
      seq: args.seq,
      role: args.role,
      kind: normalizeRunDialogMessageKind(args.kind),
      text: args.text,
      messageFamilyId: args.messageFamilyId,
      raw: {
        seq: args.seq,
        role: args.role,
        kind: args.kind,
        text: args.text,
        attempt: args.attempt ?? 1,
        correlation: args.messageId
          ? {
              message_id: args.messageId,
              ...(args.messageFamilyId
                ? {
                    message_family_id: args.messageFamilyId,
                  }
                : {}),
              ...(args.replacesMessageId
                ? {
                    replaces_message_id: args.replacesMessageId,
                  }
                : {}),
            }
          : args.replacesMessageId
            ? {
                replaces_message_id: args.replacesMessageId,
              }
            : {},
      },
    };
  }

  it("removes matched assistant_message by replaces_message_id before inserting assistant_final", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_message",
        text: "draft-1",
        attempt: 1,
        messageId: "m-1",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "final-1",
        attempt: 1,
        messageId: "f-1",
        replacesMessageId: "m-1",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 1);
    assert.equal(output[0].kind, "assistant_final");
    assert.equal(output[0].text, "final-1");
  });

  it("removes the last matched assistant_process by message_id when assistant_final arrives", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "draft-1",
        messageId: "m-1",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_process",
        text: "draft-2",
        messageId: "m-2",
      }),
      entry({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "final-2",
        messageId: "m-2",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 2);
    assert.equal(output[0].kind, "assistant_process");
    assert.equal(output[0].text, "draft-1");
    assert.equal(output[1].kind, "assistant_final");
    assert.equal(output[1].text, "final-2");
  });

  it("falls back to same message_id when replaces_message_id is absent", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_message",
        text: "draft-1",
        attempt: 1,
        messageId: "m-1",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "final-1",
        attempt: 1,
        messageId: "m-1",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 1);
    assert.equal(output[0].kind, "assistant_final");
    assert.equal(output[0].text, "final-1");
  });

  it("falls back to normalized text matching when final has no message_id", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_message",
        text: "  same   final text ",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "same final text",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 1);
    assert.equal(output[0].kind, "assistant_final");
    assert.equal(output[0].text, "same final text");
  });

  it("only deduplicates assistant_process in the same attempt", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_message",
        text: "attempt-1-draft",
        attempt: 1,
        messageId: "same-id",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_message",
        text: "attempt-2-draft",
        attempt: 2,
        messageId: "same-id",
      }),
      entry({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "attempt-2-final",
        attempt: 2,
        messageId: "same-id",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 2);
    assert.equal(output[0].text, "attempt-1-draft");
    assert.equal(output[0].kind, "assistant_message");
    assert.equal(output[1].text, "attempt-2-final");
    assert.equal(output[1].kind, "assistant_final");
  });

  it("keeps process entries when assistant_final has no valid match", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "draft",
        attempt: 1,
        messageId: "m-1",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "final",
        attempt: 1,
        messageId: "m-2",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.lengthOf(output, 2);
    assert.equal(output[0].kind, "assistant_process");
    assert.equal(output[1].kind, "assistant_final");
  });

  it("keeps assistant_revision rows in display ordering without converting them into visible winners", function () {
    const messages: SkillRunnerConversationEntry[] = [
      entry({
        seq: 1,
        role: "assistant",
        kind: "assistant_final",
        text: "Rejected final",
        attempt: 1,
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
      entry({
        seq: 2,
        role: "assistant",
        kind: "assistant_revision",
        text: "",
        attempt: 1,
        messageId: "f-1",
        messageFamilyId: "family-1",
      }),
      entry({
        seq: 3,
        role: "assistant",
        kind: "assistant_final",
        text: "Winning final",
        attempt: 1,
        messageId: "f-2",
        messageFamilyId: "family-1",
      }),
    ];
    const output = buildRunDialogDisplayMessages(messages);
    assert.deepEqual(
      output.map((entry) => entry.kind),
      ["assistant_final", "assistant_revision", "assistant_final"],
    );
  });

  it("prefers explicit responseValue for option-based interactions", function () {
    const resolved = resolveRunDialogInteractionResponse({
      responseValue: "qa_analysis",
      responseObject: {
        selected_option: "legacy",
      },
      option: "legacy-option",
      replyText: "ignored",
    });
    assert.deepEqual(resolved, {
      hasResponse: true,
      response: "qa_analysis",
    });
  });

  it("supports boolean and object option values without stringifying", function () {
    const boolResolved = resolveRunDialogInteractionResponse({
      responseValue: true,
    });
    assert.deepEqual(boolResolved, {
      hasResponse: true,
      response: true,
    });

    const objectResolved = resolveRunDialogInteractionResponse({
      responseValue: {
        decision: "proceed",
      },
    });
    assert.deepEqual(objectResolved, {
      hasResponse: true,
      response: {
        decision: "proceed",
      },
    });
  });

  it("keeps backward compatibility for legacy option and responseObject payloads", function () {
    const legacyOption = resolveRunDialogInteractionResponse({
      option: "generate_note",
    });
    assert.deepEqual(legacyOption, {
      hasResponse: true,
      response: "generate_note",
    });

    const legacyObject = resolveRunDialogInteractionResponse({
      responseObject: {
        confirm: true,
      },
    });
    assert.deepEqual(legacyObject, {
      hasResponse: true,
      response: {
        confirm: true,
      },
    });
  });

  it("falls back to text reply payload when no explicit option response exists", function () {
    const resolved = resolveRunDialogInteractionResponse({
      replyText: "继续执行",
    });
    assert.deepEqual(resolved, {
      hasResponse: false,
      response: {
        text: "继续执行",
      },
    });
  });

  it("normalizes waiting_user and keeps ask_user payload", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_user",
      pending_owner: "waiting_user",
      pending: {
        interaction_id: 18,
        kind: "open_text",
        prompt: "reply please",
        required_fields: ["intent"],
        ui_hints: {
          hint: "say in one sentence",
        },
        ask_user: {
          kind: "open_text",
          prompt: "reply please",
          hint: "say in one sentence",
        },
      },
    });
    assert.equal(normalized.pendingOwner, "waiting_user");
    assert.equal(normalized.pendingInteraction?.interactionId, 18);
    assert.equal(normalized.pendingInteraction?.kind, "open_text");
    assert.equal(normalized.pendingInteraction?.prompt, "reply please");
    assert.deepEqual(normalized.pendingInteraction?.requiredFields, ["intent"]);
    assert.deepEqual(normalized.pendingInteraction?.uiHints, {
      hint: "say in one sentence",
    });
    assert.deepEqual(normalized.pendingInteraction?.askUser, {
      kind: "open_text",
      prompt: "reply please",
      hint: "say in one sentence",
    });
  });

  it("normalizes choose_one string options from pending ui_hints", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_user",
      pending_owner: "waiting_user",
      pending: {
        interaction_id: 19,
        kind: "choose_one",
        prompt: "choose one",
        ui_hints: {
          kind: "choose_one",
          prompt: "choose any option",
          options: ["Alpha", "Beta", "Gamma"],
        },
      },
    });
    assert.equal(normalized.pendingInteraction?.kind, "choose_one");
    assert.deepEqual(normalized.pendingInteraction?.options, [
      { label: "Alpha", value: "Alpha" },
      { label: "Beta", value: "Beta" },
      { label: "Gamma", value: "Gamma" },
    ]);
    assert.deepEqual(normalized.pendingInteraction?.uiHints, {
      kind: "choose_one",
      prompt: "choose any option",
      options: ["Alpha", "Beta", "Gamma"],
    });
  });

  it("normalizes object choice options from ask_user with stable response values", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-object-options",
      status: "waiting_user",
      pending_owner: "waiting_user",
      pending: {
        interaction_id: 20,
        kind: "choose_one",
        prompt: "choose by value",
        ask_user: {
          kind: "choose_one",
          prompt: "choose by value",
          options: [
            { label: "Continue", value: "continue_value" },
            { label: "Stop", value: "stop_value" },
          ],
        },
      },
    });
    assert.deepEqual(normalized.pendingInteraction?.options, [
      { label: "Continue", value: "continue_value" },
      { label: "Stop", value: "stop_value" },
    ]);
    assert.deepEqual(
      resolveRunDialogInteractionResponse({
        responseValue: normalized.pendingInteraction?.options?.[0]?.value,
        replyText: normalized.pendingInteraction?.options?.[0]?.label,
      }),
      {
        hasResponse: true,
        response: "continue_value",
      },
    );
  });

  it("normalizes raw pending branch message and ui_hints", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_user",
      pending_owner: "waiting_user",
      pending: {
        __SKILL_DONE__: false,
        message: "Debug interactive probe: choose any option to continue.",
        ui_hints: {
          kind: "choose_one",
          prompt: "Choose any option.",
          options: ["Alpha", "Beta"],
        },
      },
    });
    assert.equal(normalized.pendingInteraction?.kind, "choose_one");
    assert.equal(
      normalized.pendingInteraction?.prompt,
      "Debug interactive probe: choose any option to continue.",
    );
    assert.deepEqual(normalized.pendingInteraction?.options, [
      { label: "Alpha", value: "Alpha" },
      { label: "Beta", value: "Beta" },
    ]);
  });

  it("normalizes waiting_auth method selection fields for e2e parity", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_auth",
      pending_owner: "waiting_auth.method_selection",
      pending_auth_method_selection: {
        phase: "method_selection",
        engine: "opencode",
        provider_id: "openai",
        prompt: "choose auth method",
        available_methods: ["auth_code_or_url", "api_key"],
        ask_user: {
          kind: "choose_one",
          options: [
            { label: "Code", value: "auth_code_or_url" },
            { label: "API Key", value: "api_key" },
          ],
        },
      },
    });
    assert.equal(normalized.pendingOwner, "waiting_auth.method_selection");
    assert.equal(normalized.pendingAuth?.phase, "method_selection");
    assert.equal(normalized.pendingAuth?.engine, "opencode");
    assert.equal(normalized.pendingAuth?.providerId, "openai");
    assert.equal(normalized.pendingAuth?.prompt, "choose auth method");
    assert.deepEqual(normalized.pendingAuth?.availableMethods, [
      "auth_code_or_url",
      "api_key",
    ]);
    assert.deepEqual(normalized.pendingAuth?.askUser, {
      kind: "choose_one",
      options: [
        { label: "Code", value: "auth_code_or_url" },
        { label: "API Key", value: "api_key" },
      ],
    });
  });

  it("normalizes waiting_auth challenge fields for import/chat input branches", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_auth",
      pending_owner: "waiting_auth.challenge_active",
      pending_auth: {
        phase: "challenge_active",
        auth_session_id: "sess-1",
        engine: "opencode",
        provider_id: "openai",
        prompt: "provide code",
        challenge_kind: "auth_code_or_url",
        accepts_chat_input: true,
        input_kind: "auth_code_or_url",
        auth_url: "https://auth.example",
        user_code: "ABCDE",
        last_error: "expired code",
        ask_user: {
          kind: "upload_files",
          files: [{ name: "oauth.json", required: true }],
        },
      },
    });
    assert.equal(normalized.pendingOwner, "waiting_auth.challenge_active");
    assert.equal(normalized.pendingAuth?.phase, "challenge_active");
    assert.equal(normalized.pendingAuth?.authSessionId, "sess-1");
    assert.equal(normalized.pendingAuth?.challengeKind, "auth_code_or_url");
    assert.equal(normalized.pendingAuth?.acceptsChatInput, true);
    assert.equal(normalized.pendingAuth?.inputKind, "auth_code_or_url");
    assert.equal(normalized.pendingAuth?.authUrl, "https://auth.example");
    assert.equal(normalized.pendingAuth?.userCode, "ABCDE");
    assert.equal(normalized.pendingAuth?.lastError, "expired code");
    assert.deepEqual(normalized.pendingAuth?.askUser, {
      kind: "upload_files",
      files: [{ name: "oauth.json", required: true }],
    });
  });

  it("keeps auto-poll auth challenge read-only when chat input is not accepted", function () {
    const normalized = normalizeRunDialogPendingState({
      request_id: "req-1",
      status: "waiting_auth",
      pending_owner: "waiting_auth.challenge_active",
      pending_auth: {
        phase: "challenge_active",
        auth_session_id: "sess-2",
        engine: "qwen",
        provider_id: "dashscope",
        prompt: "continue auth in browser",
        challenge_kind: "auth_code_or_url",
        accepts_chat_input: false,
        input_kind: null,
        auth_url: "https://auth.example/device",
        user_code: "FGHIJ",
      },
    });
    assert.equal(normalized.pendingAuth?.acceptsChatInput, false);
    assert.isUndefined(normalized.pendingAuth?.inputKind);
    assert.equal(normalized.pendingAuth?.authUrl, "https://auth.example/device");
    assert.equal(normalized.pendingAuth?.userCode, "FGHIJ");
  });

  it("marks interaction/auth control events for state refresh", function () {
    assert.equal(
      shouldRefreshRunDialogStateFromChatEvent({
        type: "interaction.reply.accepted",
      }),
      true,
    );
    assert.equal(
      shouldRefreshRunDialogStateFromChatEvent({
        type: "interaction.pending.created",
      }),
      true,
    );
    assert.equal(
      shouldRefreshRunDialogStateFromChatEvent({
        type: "auth.challenge.updated",
      }),
      true,
    );
    assert.equal(
      shouldRefreshRunDialogStateFromChatEvent({
        type: "assistant.message.promoted",
      }),
      false,
    );
  });

  it("clears pending cards when status leaves waiting states", function () {
    assert.equal(shouldClearRunDialogPendingForStatus("waiting_user"), false);
    assert.equal(shouldClearRunDialogPendingForStatus("waiting_auth"), false);
    assert.equal(shouldClearRunDialogPendingForStatus("queued"), true);
    assert.equal(shouldClearRunDialogPendingForStatus("running"), true);
    assert.equal(shouldClearRunDialogPendingForStatus("succeeded"), true);
  });
});

// 临时探针 2：真快照 → projectSkillRunnerPanelSnapshot，检查 transcript 投影是否为空。
import { captureSkillRunnerWorkspaceEnvelope } from "./test/helpers/skillRunnerWorkspaceSnapshotHarness";
import * as model from "./src/sidebar/assistantPanelModel";

const CHAT_EVENTS = [
  {
    seq: 1,
    ts: "2026-07-19T00:00:10.000Z",
    role: "assistant",
    kind: "assistant_process",
    text: "Reading papers/a.md",
    correlation: { process_type: "tool_call", tool_name: "read_file" },
  },
  {
    seq: 2,
    ts: "2026-07-19T00:00:11.000Z",
    role: "user",
    kind: "user_message",
    text: "Analyze this paper.",
  },
  {
    seq: 3,
    ts: "2026-07-19T00:00:12.000Z",
    role: "assistant",
    kind: "assistant_final",
    text: "Final answer with **markdown**.",
    correlation: { message_id: "m-3", message_family_id: "f-3" },
  },
];

async function main() {
  const envelope = await captureSkillRunnerWorkspaceEnvelope({
    tasks: [
      {
        taskName: "Probe Task",
        requestId: "req-probe-render-1",
        status: "waiting_user",
        chatEvents: CHAT_EVENTS,
      },
    ],
    waitFor: (entry) =>
      !!entry.session &&
      entry.session.loading === false &&
      entry.session.messages.length >= 2,
  });
  const session = envelope.session as { messages: unknown[] };
  console.log("session.messages.length:", session.messages.length);
  const panel = model.projectSkillRunnerPanelSnapshot(
    envelope as Parameters<typeof model.projectSkillRunnerPanelSnapshot>[0],
  );
  const panelRecord = panel as Record<string, unknown>;
  console.log("panel top keys:", JSON.stringify(Object.keys(panelRecord)));
  const transcript = panelRecord.transcript as
    | { items?: unknown[]; status?: string }
    | undefined;
  console.log(
    "transcript status/items:",
    transcript?.status,
    Array.isArray(transcript?.items) ? transcript.items.length : "n/a",
  );
  const conversation = panelRecord.conversation as
    | { items?: unknown[] }
    | undefined;
  console.log(
    "conversation items:",
    Array.isArray(conversation?.items) ? conversation.items.length : "n/a",
  );
}

void main();

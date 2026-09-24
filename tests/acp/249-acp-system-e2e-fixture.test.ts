import { assert } from "chai";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyAcpTranscriptSessionUpdate } from "../../src/modules/acp/transport/acpTranscriptBoundary";

const fixture = path.resolve("tests/fixtures/acp/acp-composer-reply-agent.mjs");

async function runFixture(
  mode: string,
  requests: object[],
  waitMs = 50,
  manifest?: object,
  modeFileContent?: string,
) {
  const root = await mkdtemp(path.join(os.tmpdir(), "acp-e2e-peer-"));
  const evidencePath = path.join(root, "evidence.ndjson");
  const manifestPath = path.join(root, "input_manifest.json");
  if (manifest) await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
  const modeFile = path.join(root, "mode.txt");
  if (modeFileContent) await writeFile(modeFile, modeFileContent, "utf8");
  const child = spawn(process.execPath, [fixture], {
    env: {
      ...process.env,
      ZOTERO_ACP_COMPOSER_E2E_MODE: mode,
      ...(modeFileContent
        ? { ZOTERO_ACP_COMPOSER_E2E_MODE_FILE: modeFile }
        : {}),
      ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const exited = new Promise<number | null>((resolve) =>
    child.on("exit", resolve),
  );
  let stdout = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  try {
    for (const request of requests) {
      child.stdin.write(
        `${JSON.stringify(request).replace("__E2E_MANIFEST__", manifestPath)}\n`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    child.stdin.end();
    const code = await Promise.race([
      exited,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("fixture did not exit")), 2_000),
      ),
    ]);
    const messages = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const evidence =
      mode === "typo"
        ? null
        : JSON.parse(
            (await readFile(evidencePath, "utf8")).trim().split("\n")[0],
          );
    return { code, messages, evidence };
  } finally {
    child.kill();
    await rm(root, { recursive: true, force: true });
  }
}

describe("ACP System E2E peer modes", function () {
  this.timeout(5_000);

  it("records normal mode and answers initialize", async function () {
    const result = await runFixture("normal", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    ]);
    assert.equal(result.code, 0);
    assert.equal(result.evidence.mode, "normal");
    assert.equal(result.messages[0].id, 1);
  });

  it("keeps the startup phase unanswered", async function () {
    const result = await runFixture("startup-stall", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    ]);
    assert.equal(result.evidence.mode, "startup-stall");
    assert.isEmpty(result.messages);
  });

  it("loads the mode from a file at child start", async function () {
    const result = await runFixture(
      "normal",
      [{ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }],
      50,
      undefined,
      "startup-stall",
    );
    assert.equal(result.evidence.mode, "startup-stall");
    assert.isEmpty(result.messages);
  });

  it("exits during a turn without a prompt result", async function () {
    const result = await runFixture("exit-during-turn", [
      { jsonrpc: "2.0", id: 2, method: "session/prompt", params: {} },
    ]);
    assert.equal(result.evidence.mode, "exit-during-turn");
    assert.isFalse(result.messages.some((message) => message.id === 2));
  });

  it("emits trailing updates before a non-cancelled prompt result", async function () {
    const result = await runFixture(
      "cancel-result-race",
      [
        { jsonrpc: "2.0", id: 3, method: "session/prompt", params: {} },
        { jsonrpc: "2.0", method: "session/cancel", params: {} },
      ],
      150,
    );
    assert.equal(result.evidence.mode, "cancel-result-race");
    const updateIndex = result.messages.findIndex(
      (message) => message.method === "session/update",
    );
    const resultIndex = result.messages.findIndex(
      (message) => message.id === 3,
    );
    assert.isAtLeast(updateIndex, 0);
    assert.isAbove(resultIndex, updateIndex);
    assert.equal(result.messages[resultIndex].result.stopReason, "end_turn");
  });

  it("keeps a raced debug result valid across trailing text chunks", async function () {
    const result = await runFixture(
      "cancel-result-race",
      [
        {
          jsonrpc: "2.0",
          id: 4,
          method: "session/prompt",
          params: {
            prompt: [
              {
                type: "text",
                text: "debug-apply-result-probe\n- Input manifest: __E2E_MANIFEST__",
              },
            ],
          },
        },
        { jsonrpc: "2.0", method: "session/cancel", params: {} },
      ],
      150,
      {
        skill_id: "debug-apply-result-probe",
        parameter: {
          workflow_id: "debug-apply-single-result",
          step_id: "result",
          run_key: "race-1",
        },
      },
    );
    const chunks = result.messages
      .filter((message) => message.method === "session/update")
      .map((message) => message.params.update.content.text);
    assert.lengthOf(chunks, 2);
    assert.deepInclude(JSON.parse(chunks.join("")), {
      __SKILL_DONE__: true,
      kind: "debug_apply_contract_result",
      run_key: "race-1",
    });
  });

  it("rejects unknown modes", async function () {
    const result = await runFixture("typo", [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    ]);
    assert.notEqual(result.code, 0);
    assert.isEmpty(result.messages);
  });

  it("keeps fixture side channels inside one assistant segment until a hard boundary", async function () {
    const result = await runFixture("normal", [
      {
        jsonrpc: "2.0",
        id: 4,
        method: "session/prompt",
        params: {
          prompt: [{ type: "text", text: "system-e2e:transcript-interleave" }],
        },
      },
    ]);
    const kinds = result.messages
      .filter((message) => message.method === "session/update")
      .map((message) => message.params.update.sessionUpdate);
    assert.deepEqual(kinds, [
      "agent_message_chunk",
      "tool_call_update",
      "usage_update",
      "status_update",
      "workspace_activity",
      "agent_message_chunk",
      "tool_call",
    ]);
    assert.deepEqual(kinds.map(classifyAcpTranscriptSessionUpdate), [
      "text-continuation",
      "soft-side-channel",
      "soft-side-channel",
      "soft-side-channel",
      "soft-side-channel",
      "text-continuation",
      "hard-boundary",
    ]);
  });

  it("interleaves a valid ACP Skills result when its run key requests transcript coverage", async function () {
    const result = await runFixture(
      "normal",
      [
        {
          jsonrpc: "2.0",
          id: 6,
          method: "session/prompt",
          params: {
            prompt: [
              {
                type: "text",
                text: "debug-apply-result-probe\n- Input manifest: __E2E_MANIFEST__",
              },
            ],
          },
        },
      ],
      50,
      {
        skill_id: "debug-apply-result-probe",
        parameter: {
          workflow_id: "debug-apply-single-result",
          step_id: "result",
          run_key: "system-e2e:transcript-interleave",
        },
      },
    );
    const updates = result.messages.filter(
      (entry) => entry.method === "session/update",
    );
    assert.deepEqual(
      updates.map((entry) => entry.params.update.sessionUpdate),
      [
        "agent_message_chunk",
        "tool_call_update",
        "usage_update",
        "status_update",
        "workspace_activity",
        "agent_message_chunk",
        "tool_call",
      ],
    );
    const joined = updates
      .filter(
        (entry) => entry.params.update.sessionUpdate === "agent_message_chunk",
      )
      .map((entry) => entry.params.update.content.text)
      .join("");
    assert.equal(JSON.parse(joined).parameter, undefined);
    assert.equal(
      JSON.parse(joined).run_key,
      "system-e2e:transcript-interleave",
    );
  });

  it("returns a validated debug workflow result from the input manifest", async function () {
    const result = await runFixture(
      "normal",
      [
        {
          jsonrpc: "2.0",
          id: 5,
          method: "session/prompt",
          params: {
            prompt: [
              {
                type: "text",
                text: "debug-apply-result-probe\n- Input manifest: __E2E_MANIFEST__",
              },
            ],
          },
        },
      ],
      50,
      {
        skill_id: "debug-apply-result-probe",
        parameter: {
          workflow_id: "debug-apply-single-result",
          step_id: "result",
          run_key: "fixture-1",
        },
      },
    );
    const update = result.messages.find(
      (message) => message.method === "session/update",
    );
    assert.deepInclude(JSON.parse(update.params.update.content.text), {
      __SKILL_DONE__: true,
      kind: "debug_apply_contract_result",
      workflow_id: "debug-apply-single-result",
      step_id: "result",
      run_key: "fixture-1",
      apply_mode: "result",
      tag: "debug-result:fixture-1",
    });
  });
});

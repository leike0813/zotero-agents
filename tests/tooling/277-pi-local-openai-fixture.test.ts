import { assert } from "chai";
import {
  literatureDigestBundlePath,
  startMockSkillRunnerServer,
} from "../mock-skillrunner/server";

const bundlePath = literatureDigestBundlePath(process.cwd());

function readStreamText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

describe("Deterministic local OpenAI-compatible Pi fixture", function () {
  this.timeout(10_000);

  async function withServer<T>(run: (baseUrl: string) => Promise<T>) {
    const server = await startMockSkillRunnerServer({ bundlePath });
    try {
      return await run(server.baseUrl);
    } finally {
      await server.close();
    }
  }

  it("streams an OpenAI completion chunk sequence end to end", async function () {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "system-e2e-local",
          stream: true,
          messages: [{ role: "user", content: "hello" }],
        }),
      });
      assert.equal(response.status, 200);
      assert.match(
        String(response.headers.get("content-type")),
        /event-stream/,
      );
      const text = await readStreamText(response.body!);
      assert.include(text, "chat.completion.chunk");
      assert.include(text, "streaming reply");
      assert.include(text, "data: [DONE]");
    });
  });

  it("emits a tool call and then acknowledges its result", async function () {
    await withServer(async (baseUrl) => {
      const request = (messages: unknown[]) =>
        fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: "system-e2e-local", messages }),
        }).then((response) => readStreamText(response.body!));
      const first = await request([
        { role: "user", content: "[system-e2e:tool:submit_skill_result]" },
      ]);
      assert.include(first, "tool_calls");
      assert.include(first, "submit_skill_result");
      // The Auto Skill Run seal requires a protocol-valid payload, not `{}`.
      assert.include(first, "protocolVersion");
      const second = await request([
        { role: "user", content: "[system-e2e:tool:submit_skill_result]" },
        { role: "tool", content: "ok" },
      ]);
      assert.include(second, "tool result acknowledged");
    });
  });

  it("serves the bounded PI-04 permission, interaction, and seal sequence", async function () {
    await withServer(async (baseUrl) => {
      const request = (messages: Array<Record<string, unknown>>) =>
        fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: "system-e2e-local",
            messages: [
              { role: "user", content: "[system-e2e:pi04-sequence:v1:1:PI04]" },
              ...messages,
            ],
          }),
        }).then((response) => readStreamText(response.body!));
      assert.include(await request([]), "zotero_custom_note_write");
      const permissionResult = [
        {
          role: "assistant",
          tool_calls: [
            {
              id: "note-call",
              type: "function",
              function: { name: "zotero_custom_note_write" },
            },
          ],
        },
        { role: "tool", tool_call_id: "note-call", content: "ok" },
      ];
      assert.include(await request(permissionResult), "ask_user");
      const answers = [
        ...permissionResult,
        {
          role: "assistant",
          tool_calls: [
            {
              id: "ask-call",
              type: "function",
              function: { name: "ask_user" },
            },
          ],
        },
        { role: "tool", tool_call_id: "ask-call", content: "answer" },
      ];
      const inProgress = await request([...answers]);
      assert.include(inProgress, '"finish_reason":"stop"');
      const seal = await request([
        ...answers,
        { role: "user", content: "Continue PI-04" },
      ]);
      assert.include(seal, "submit_skill_result");
      assert.include(seal, "protocolVersion");
    });
  });

  for (const shell of ["bash", "powershell"]) {
    it(`emits schema-valid ${shell} arguments for the restart probe`, async function () {
      await withServer(async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `[system-e2e:tool:${shell}]` }],
          }),
        });
        const chunks = (await response.text())
          .split("\n")
          .filter((line) => line.startsWith("data: {"))
          .map((line) => JSON.parse(line.slice(6)));
        const call = chunks.flatMap(
          (chunk) => chunk.choices[0].delta.tool_calls || [],
        )[0];
        assert.equal(call.function.name, shell);
        const args = JSON.parse(call.function.arguments);
        assert.hasAllKeys(args, ["command"]);
        assert.isNotEmpty(args.command);
      });
    });
  }

  it("paces capacity-marked responses, including tool calls", async function () {
    await withServer(async (baseUrl) => {
      const timed = async (content: string) => {
        const started = Date.now();
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: "system-e2e-local",
            messages: [{ role: "user", content }],
          }),
        });
        const text = await readStreamText(response.body!);
        return { elapsed: Date.now() - started, text };
      };
      const plain = await timed("plain reply");
      assert.isBelow(plain.elapsed, 800, "plain replies stay unpaced");
      const paced = await timed("[system-e2e:capacity] paced reply");
      assert.isAtLeast(paced.elapsed, 950, "capacity prompts are paced");
      const pacedTool = await timed(
        "[system-e2e:capacity] [system-e2e:tool:submit_skill_result]",
      );
      assert.isAtLeast(pacedTool.elapsed, 950);
      assert.include(pacedTool.text, "tool_calls");
      assert.include(pacedTool.text, "protocolVersion");
    });
  });

  it("serves a model list without disturbing the SkillRunner job route", async function () {
    await withServer(async (baseUrl) => {
      const models = await fetch(`${baseUrl}/v1/models`).then((response) =>
        response.json(),
      );
      assert.deepEqual((models as unknown as { data: unknown }).data, [
        { id: "system-e2e-local", object: "model" },
      ]);
      // The pre-existing job route must stay reachable and keep its validation.
      const job = await fetch(`${baseUrl}/v1/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(job.status, 400);
    });
  });
});

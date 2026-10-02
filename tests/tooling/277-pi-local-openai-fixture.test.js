import { assert } from "chai";
import { literatureDigestBundlePath, startMockSkillRunnerServer, } from "../mock-skillrunner/server";
const bundlePath = literatureDigestBundlePath(process.cwd());
function readStreamText(stream) {
    return new Response(stream).text();
}
describe("Deterministic local OpenAI-compatible Pi fixture", function () {
    this.timeout(10_000);
    async function withServer(run) {
        const server = await startMockSkillRunnerServer({ bundlePath });
        try {
            return await run(server.baseUrl);
        }
        finally {
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
            assert.match(String(response.headers.get("content-type")), /event-stream/);
            const text = await readStreamText(response.body);
            assert.include(text, "chat.completion.chunk");
            assert.include(text, "streaming reply");
            assert.include(text, "data: [DONE]");
        });
    });
    it("emits a tool call and then acknowledges its result", async function () {
        await withServer(async (baseUrl) => {
            const request = (messages) => fetch(`${baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ model: "system-e2e-local", messages }),
            }).then((response) => readStreamText(response.body));
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
    it("paces capacity-marked responses, including tool calls", async function () {
        await withServer(async (baseUrl) => {
            const timed = async (content) => {
                const started = Date.now();
                const response = await fetch(`${baseUrl}/v1/chat/completions`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        model: "system-e2e-local",
                        messages: [{ role: "user", content }],
                    }),
                });
                const text = await readStreamText(response.body);
                return { elapsed: Date.now() - started, text };
            };
            const plain = await timed("plain reply");
            assert.isBelow(plain.elapsed, 800, "plain replies stay unpaced");
            const paced = await timed("[system-e2e:capacity] paced reply");
            assert.isAtLeast(paced.elapsed, 950, "capacity prompts are paced");
            const pacedTool = await timed("[system-e2e:capacity] [system-e2e:tool:submit_skill_result]");
            assert.isAtLeast(pacedTool.elapsed, 950);
            assert.include(pacedTool.text, "tool_calls");
            assert.include(pacedTool.text, "protocolVersion");
        });
    });
    it("serves a model list without disturbing the SkillRunner job route", async function () {
        await withServer(async (baseUrl) => {
            const models = await fetch(`${baseUrl}/v1/models`).then((response) => response.json());
            assert.deepEqual(models.data, [
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

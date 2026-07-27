import { assert } from "chai";
import {
  SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
  SynthesisClientError,
} from "../../packages/synthesis-contracts/src";
import {
  SYNTHESIS_REVERSE_HOST_PATH,
  handleSynthesisReverseHostHttpRequest,
} from "../../src/modules/synthesisReverseHostEndpoint";

describe("Synthesis reverse Host endpoint", function () {
  it("accepts only the scoped POST route and bearer token", async function () {
    const calls: unknown[] = [];
    const broker = {
      async dispatch(input: unknown) {
        calls.push(input);
        return { accepted: true };
      },
    };
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: { authorization: "Bearer scoped-token" },
        body: {
          schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA,
        },
      },
      broker,
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      ok: true,
      result: { accepted: true },
    });
    assert.deepEqual(calls, [
      {
        authorizationToken: "scoped-token",
        call: { schema: SYNTHESIS_REVERSE_HOST_CALL_SCHEMA },
      },
    ]);
    assert.equal(
      (
        await handleSynthesisReverseHostHttpRequest(
          {
            method: "GET",
            path: SYNTHESIS_REVERSE_HOST_PATH,
            headers: {},
            body: {},
          },
          broker,
        )
      ).status,
      404,
    );
  });

  it("returns stable status and structured details without leaking messages", async function () {
    const result = await handleSynthesisReverseHostHttpRequest(
      {
        method: "POST",
        path: SYNTHESIS_REVERSE_HOST_PATH,
        headers: {},
        body: {},
      },
      {
        async dispatch() {
          throw new SynthesisClientError(
            "conflict",
            "sensitive internal message",
            { reason: "operation_conflict" },
          );
        },
      },
    );
    assert.equal(result.status, 409);
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "conflict",
        details: { reason: "operation_conflict" },
      },
    });
    assert.notInclude(JSON.stringify(result.body), "sensitive");
  });
});

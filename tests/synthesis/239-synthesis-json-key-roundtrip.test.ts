import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalizeSynthesisContractJson,
  toSynthesisJsonObject,
} from "../../packages/synthesis-contracts/src";
import { startSynthesisProductionRouteHarness } from "../helpers/synthesisProductionRouteHarness";

describe("Synthesis JSON key round-trip", function () {
  it("keeps a JSON __proto__ key as an own data property", function () {
    const source = JSON.parse('{"__proto__":"topic:alias","tag":"topic:a"}');
    const normalized = toSynthesisJsonObject(source);
    assert.equal(Object.getPrototypeOf(normalized), Object.prototype);
    assert.equal(Object.hasOwn(normalized, "__proto__"), true);
    assert.equal(
      Object.getOwnPropertyDescriptor(normalized, "__proto__")?.value,
      "topic:alias",
    );
    assert.equal(
      JSON.stringify(normalized),
      '{"__proto__":"topic:alias","tag":"topic:a"}',
    );
  });

  it("keeps a JSON __proto__ key when canonicalizing contract JSON", function () {
    const source = JSON.parse(
      '{"__proto__":"topic:alias","a":{"__proto__":1}}',
    );
    assert.equal(
      canonicalizeSynthesisContractJson(source),
      '{"__proto__":"topic:alias","a":{"__proto__":1}}',
    );
  });

  it("round-trips a __proto__ tag vocabulary alias through save, read and restart", async function () {
    this.timeout(120000);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-json-key-"));
    const assertAlias = (aliases: unknown) => {
      const map = aliases as Record<string, unknown>;
      assert.equal(Object.getPrototypeOf(map), Object.prototype);
      assert.equal(Object.hasOwn(map, "__proto__"), true);
      assert.equal(map.__proto__, "topic:json-key");
    };
    let harness = await startSynthesisProductionRouteHarness({
      id: "json-key-initial",
      root,
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          { tag: "topic:json-key", facet: "topic" },
        ],
        aliases: JSON.parse(
          '{"__proto__":"topic:json-key","topic:json-key-alias":"topic:json-key"}',
        ),
        abbrev: initial.abbrev,
        protocol: initial.protocol,
      });
      assertAlias((await harness.client.tags.loadTagVocabulary()).aliases);
    } finally {
      await harness.stop();
    }
    harness = await startSynthesisProductionRouteHarness({
      id: "json-key-restart",
      root,
    });
    try {
      assertAlias((await harness.client.tags.loadTagVocabulary()).aliases);
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

import { assert } from "chai";
import { readFileSync } from "node:fs";
import {
  buildHostBridgeAgentSurfaceDescriptor,
  createHostBridgeSurfaceIdentity,
  searchHostBridgeAgentSurface,
} from "../../scripts/host-bridge-agent-surface";
import { buildHostBridgeSurfaceCatalog } from "../../scripts/host-bridge-surface-catalog";

describe("Host Bridge agent surface contract", function () {
  it("describes canonical commands with control and recovery metadata", function () {
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );

    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v1");
    const commands = new Map(
      descriptor.commands.map((entry) => [entry.command, entry]),
    );
    for (const command of [
      "surface identity",
      "surface describe",
      "surface search",
      "context current",
      "product list",
      "workflow submit",
      "workflow agent-run",
      "workflow agent-apply",
      "mutation apply",
    ]) {
      assert.isTrue(commands.has(command), command);
    }
    assert.deepInclude(commands.get("workflow agent-run")!, {
      category: "write",
      approval: "none",
      retryable: true,
      stateChanged: true,
    });
    assert.include(
      commands.get("workflow agent-apply")!.consumes,
      "agentRunId",
    );
    assert.include(
      commands.get("workflow agent-apply")!.safeNextActions,
      "workflow agent-apply-status",
    );
    assert.strictEqual(
      commands.get("library items list")!.pagination,
      "cursor",
    );
  });

  it("creates and searches an offline identity-bound descriptor", function () {
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );
    const identity = createHostBridgeSurfaceIdentity({
      version: "0.2.2",
      buildFingerprint: "f".repeat(64),
      descriptor,
    });
    assert.strictEqual(identity.schema, "host-bridge.surface-identity.v1");
    assert.strictEqual(identity.version, "0.2.2");
    assert.match(identity.commandCatalogChecksum, /^[a-f0-9]{64}$/);

    const matches = searchHostBridgeAgentSurface(descriptor, "selected items");
    assert.strictEqual(matches[0]?.command, "context selection get");
  });

  it("binds the generated descriptor to the prepared release set", function () {
    const descriptor = JSON.parse(
      readFileSync("cli/zotero-bridge/src/agent-surface.json", "utf8"),
    );
    const release = JSON.parse(
      readFileSync("cli/zotero-bridge/release.json", "utf8"),
    );
    const releaseSet = JSON.parse(
      readFileSync("host-bridge/release-set.json", "utf8"),
    );
    const identity = createHostBridgeSurfaceIdentity({
      version: release.version,
      buildFingerprint: release.buildFingerprint,
      descriptor,
    });
    assert.deepEqual(releaseSet.cli.identity, identity);
    for (const surface of Object.values(releaseSet.surfaces) as any[]) {
      assert.deepEqual(surface.cliIdentity, identity);
    }
  });
});

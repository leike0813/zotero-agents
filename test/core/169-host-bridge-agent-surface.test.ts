import { assert } from "chai";
import Ajv from "ajv/dist/2020";
import fs from "node:fs";
import path from "node:path";
import {
  buildHostBridgeAgentSurfaceDescriptor,
  createHostBridgeSurfaceIdentity,
  searchHostBridgeAgentSurface,
} from "../../scripts/host-bridge-agent-surface";
import { buildHostBridgeSurfaceCatalog } from "../../scripts/host-bridge-surface-catalog";
import {
  findAgentLanguageViolations,
  validateHostBridgeAgentLanguage,
} from "../../scripts/check-host-bridge-agent-language";
import { HOST_BRIDGE_HANDLE_KINDS } from "../../src/shared/hostBridgeAgentContract";

describe("Host Bridge agent surface contract", function () {
  this.timeout(30_000);

  it("describes canonical commands with control and recovery metadata", function () {
    const catalog = buildHostBridgeSurfaceCatalog();
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(catalog);

    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v4");
    assert.strictEqual(descriptor.cliSchema, "zotero-bridge.cli.v3");
    assert.lengthOf(catalog.commandInventory, 125);
    assert.isNotEmpty(descriptor.globalOptions);
    assert.isTrue(
      descriptor.globalOptions.every((entry) => Boolean(entry.description)),
    );
    assert.notProperty(descriptor, "workflowCatalog");
    assert.deepEqual(
      descriptor.commands.map((entry) => entry.command),
      catalog.commandInventory.map((entry) => entry.command),
    );
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
      "workflow queue list",
      "workflow queue cancel",
      "workflow submission get",
      "workflow agent-run",
      "workflow agent-bundle inspect",
      "workflow agent-result validate",
      "workflow agent-apply",
      "workflow agent-renew",
      "workflow agent-abandon",
      "operation get",
      "mutation apply",
    ]) {
      assert.isTrue(commands.has(command), command);
    }
    assert.deepInclude(commands.get("workflow agent-run")!, {
      category: "write",
    });
    assert.strictEqual(
      commands.get("workflow agent-run")!.approvalContract.kind,
      "none",
    );
    assert.include(
      commands
        .get("workflow agent-apply")!
        .handleTransitions.filter((entry) => entry.direction === "consume")
        .map((entry) => entry.handle),
      "agentRunId",
    );
    assert.deepEqual(
      commands
        .get("workflow submit")!
        .handleTransitions.filter((entry) => entry.direction === "produce")
        .map((entry) => entry.handle),
      ["workflowRunId", "submissionId"],
    );
    assert.deepEqual(
      commands
        .get("workflow queue list")!
        .handleTransitions.filter((entry) => entry.direction === "produce")
        .map((entry) => entry.handle),
      ["queueId", "submissionId"],
    );
    assert.deepInclude(
      commands
        .get("workflow queue cancel")!
        .handleTransitions.find((entry) => entry.handle === "queueId")!,
      { direction: "consume", required: true },
    );
    assert.deepInclude(
      commands
        .get("workflow submission get")!
        .handleTransitions.find((entry) => entry.handle === "submissionId")!,
      { direction: "consume", required: true },
    );
    assert.containsAllKeys(
      commands.get("workflow submit")!.resultSchema.properties as object,
      ["admission", "submissionId", "workflowRunId"],
    );
    assert.containsAllKeys(
      commands.get("run notification wait")!.resultSchema.properties as object,
      ["notifications", "returned", "hasMore", "truncated"],
    );
    assert.notProperty(
      commands.get("run notification wait")!.resultSchema.properties,
      "result",
    );
    assert.includeMembers(
      commands.get("workflow agent-apply")!.effects.map((entry) => entry.kind),
      ["workflow-control", "zotero-library"],
    );
    assert.deepInclude(commands.get("workflow agent-renew")!, {
      category: "write",
    });
    assert.deepInclude(commands.get("workflow agent-abandon")!, {
      category: "write",
    });
    assert.containsAllKeys(
      commands.get("operation get")!.resultSchema.properties as object,
      ["operationId", "state", "stateChange", "handleConsumption"],
    );
    for (const command of [
      "workflow agent-bundle inspect",
      "workflow agent-result validate",
    ]) {
      assert.strictEqual(commands.get(command)!.category, "read", command);
      assert.strictEqual(
        commands.get(command)!.approvalContract.kind,
        "none",
        command,
      );
      assert.isEmpty(commands.get(command)!.handleTransitions, command);
      assert.isTrue(
        commands
          .get(command)!
          .effects.some(
            (effect) => effect.kind === "none" && !effect.stateChanged,
          ),
        command,
      );
    }
    assert.isUndefined(
      commands.get("surface identity")!.recovery[0].nextCommand,
    );
    const workflowSubmitConstraints = commands.get("workflow submit")!
      .invocationSchema.allOf as Array<{
      not?: { required?: string[] };
      oneOf?: Array<{ required?: string[] }>;
    }>;
    assert.includeMembers(
      workflowSubmitConstraints.find((entry) => entry.not)?.not?.required || [],
      ["none", "selection"],
    );
    assert.deepInclude(workflowSubmitConstraints, {
      oneOf: [{ required: ["selection"] }, { required: ["none"] }],
    });
    assert.include(
      commands
        .get("workflow agent-apply")!
        .recovery.map((entry) => entry.nextCommand)
        .filter(Boolean),
      "workflow agent-apply-status",
    );
    for (const command of ["workflow submit", "workflow agent-run"]) {
      assert.deepInclude(
        commands
          .get(command)!
          .handleTransitions.find((entry) => entry.handle === "itemRef")!,
        {
          direction: "consume",
          required: false,
          lifetime: "caller-owned",
        },
        command,
      );
    }
    assert.deepInclude(
      commands
        .get("workflow agent-apply")!
        .handleTransitions.find((entry) => entry.handle === "agentRunId")!,
      {
        direction: "consume",
        required: true,
        lifetime: "one-shot",
      },
    );
    assert.deepInclude(
      commands
        .get("workflow agent-apply-status")!
        .handleTransitions.find((entry) => entry.handle === "agentRunId")!,
      {
        direction: "consume",
        required: true,
        lifetime: "caller-owned",
      },
    );
    assert.strictEqual(
      commands.get("library items list")!.pagination,
      "cursor",
    );
    assert.deepInclude(commands.get("run get")!.argvBindings[0], {
      property: "run_id",
      kind: "positional",
      position: 1,
      token: "RUN_ID",
    });
    assert.deepInclude(commands.get("library item search")!.argvBindings[0], {
      property: "query",
      kind: "option",
      token: "--query",
    });
    assert.containsAllKeys(
      commands.get("synthesis topic get-context")!.resultSchema
        .properties as object,
      ["delivery"],
    );
    assert.containsAllKeys(
      (
        commands.get("synthesis topic get-context")!.resultSchema.properties
          ?.delivery as { properties: object }
      ).properties,
      ["mode", "bundle", "downloadCommand", "unpackHint"],
    );
    for (const command of descriptor.commands) {
      assert.deepEqual(command.invocationSchema.additionalProperties, false);
      assert.deepEqual(command.payloadSchema.additionalProperties, false);
      assert.isBoolean(command.resultSchema.additionalProperties);
      assert.lengthOf(
        command.argvBindings,
        Object.keys(command.invocationSchema.properties || {}).length,
        command.command,
      );
      assert.isNotEmpty(command.effects, command.command);
      assert.isNotEmpty(command.recovery, command.command);
      assert.notProperty(command, "guidance", command.command);
      assert.isNotEmpty(command.operationalAliases, command.command);
      assert.notDeepEqual(
        command.resultSchema.properties?.data?.type,
        ["object", "array", "string", "number", "boolean", "null"],
        command.command,
      );
    }
    assert.containsAllKeys(
      commands.get("library items list")!.payloadSchema.properties as object,
      ["collectionKey", "tag", "itemType", "cursor", "limit"],
    );
    assert.containsAllKeys(
      commands.get("synthesis topic get-context")!.payloadSchema
        .properties as object,
      ["topicId", "view", "outputPath", "overwrite"],
    );
    assert.include(
      commands.get("library item search")!.operationalAliases,
      "query",
    );
  });

  it("validates the rendered mechanism-only Agent Surface v4 schema", function () {
    const root = process.cwd();
    const ajv = new Ajv({ strict: false });
    for (const [schemaPath, dataPath] of [
      [
        "schemas/host-bridge.agent-surface.v4.schema.json",
        "cli/zotero-bridge/src/agent-surface.json",
      ],
    ]) {
      const schema = JSON.parse(
        fs.readFileSync(path.join(root, schemaPath), "utf8"),
      );
      const data = JSON.parse(
        fs.readFileSync(path.join(root, dataPath), "utf8"),
      );
      assert.deepEqual(
        schema.properties.commands.items.properties.handleTransitions.items
          .properties.handle.enum,
        [...HOST_BRIDGE_HANDLE_KINDS],
      );
      const validate = ajv.compile(schema);
      assert.isTrue(validate(data), JSON.stringify(validate.errors));
    }
  });

  it("does not read Generic sources to build a CLI descriptor", function () {
    const catalog = buildHostBridgeSurfaceCatalog();
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      catalog,
      path.join(process.cwd(), "missing-generic-source-root"),
    );
    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v4");
    assert.match(descriptor.commandCatalogChecksum, /^[a-f0-9]{64}$/);
  });

  it("keeps human-readable Agent Surface fields task-oriented", function () {
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );
    assert.deepEqual(findAgentLanguageViolations(descriptor), []);
    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v4");
    assert.strictEqual(descriptor.cliSchema, "zotero-bridge.cli.v3");
  });

  it("rejects internal prose while allowing formal bridge identifiers", function () {
    assert.isNotEmpty(
      findAgentLanguageViolations({ description: "Use Host Bridge access." }),
    );
    assert.deepEqual(
      findAgentLanguageViolations({
        schema: "host-bridge.agent-surface.v4",
        protocol: "host-bridge.v1",
        route: "/bridge/v1/manifest",
        profile: "ZOTERO_BRIDGE_HOST_PROFILE",
      }),
      [],
    );
    assert.deepEqual(validateHostBridgeAgentLanguage(process.cwd()), []);
  });

  it("uses backend-aligned approval and state-change metadata", function () {
    const commands = new Map(
      buildHostBridgeAgentSurfaceDescriptor(
        buildHostBridgeSurfaceCatalog(),
      ).commands.map((entry) => [entry.command, entry]),
    );
    for (const [command, expected] of [
      ["mutation preview", ["none", false, "none"]],
      ["debug synthesis snapshot", ["none", false, "none"]],
      ["workflow submit", ["zotero-ui-required", true, "review"]],
      ["run cancel", ["zotero-ui-required", true, "review"]],
      ["synthesis cache invalidate", ["zotero-ui-required", true, "review"]],
      ["run notification ack", ["none", true, "review"]],
      ["run skill reply", ["none", true, "review"]],
      ["run skill connect", ["none", true, "review"]],
    ] as const) {
      const entry = commands.get(command)!;
      assert.strictEqual(entry.approvalContract.kind, expected[0], command);
      assert.strictEqual(
        entry.effects.some((effect) => effect.stateChanged),
        expected[1],
        command,
      );
      assert.strictEqual(entry.danger, expected[2], command);
    }
  });

  it("keeps recovery actions compatible with available typed handles", function () {
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );
    const byCommand = new Map(
      descriptor.commands.map((entry) => [entry.command, entry]),
    );
    for (const command of descriptor.commands) {
      const available = new Set(
        command.handleTransitions
          .filter((entry) => entry.direction === "produce")
          .map((entry) => entry.handle),
      );
      for (const recovery of command.recovery) {
        for (const handle of recovery.requiresHandles) {
          assert.isTrue(
            available.has(handle) ||
              recovery.stateCheck === "caller-held-handle",
            `${command.command} cannot recover with unavailable ${handle}`,
          );
        }
        if (recovery.nextCommand) {
          assert.isTrue(byCommand.has(recovery.nextCommand));
        }
      }
    }
    assert.notInclude(
      byCommand
        .get("workflow agent-run")!
        .recovery.map((entry) => entry.nextCommand)
        .filter(Boolean),
      "run get",
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
    assert.strictEqual(identity.schema, "host-bridge.surface-identity.v4");
    assert.strictEqual(identity.version, "0.2.2");
    assert.match(identity.commandCatalogChecksum, /^[a-f0-9]{64}$/);

    const matches = searchHostBridgeAgentSurface(descriptor, "selected items");
    assert.strictEqual(matches[0]?.command.command, "context selection get");
    assert.include(matches[0]?.matchReasons, "token:selected");
    assert.isAtMost(matches.length, 10);

    const workflow = searchHostBridgeAgentSurface(
      descriptor,
      "workflow submit",
    );
    assert.strictEqual(workflow[0]?.command.command, "workflow submit");
    assert.include(workflow[0]?.matchReasons, "phrase:workflow submit");

    const ordinary = searchHostBridgeAgentSurface(
      descriptor,
      "diagnostic snapshot",
      {
        limit: 100,
      },
    );
    assert.isFalse(
      ordinary.some((entry) => entry.command.command.startsWith("debug ")),
    );
    const diagnostic = searchHostBridgeAgentSurface(
      descriptor,
      "diagnostic snapshot",
      { limit: 100, includeDebug: true },
    );
    assert.isTrue(
      diagnostic.some(
        (entry) => entry.command.command === "debug synthesis snapshot",
      ),
    );
  });

  it("keeps raw and debug commands exactly describable", function () {
    const commands = new Map(
      buildHostBridgeAgentSurfaceDescriptor(
        buildHostBridgeSurfaceCatalog(),
      ).commands.map((entry) => [entry.command, entry]),
    );
    for (const command of [
      "call",
      "debug synthesis snapshot",
      "debug synthesis inspect-paper",
      "debug synthesis inspect-topic",
      "debug synthesis operations",
      "debug synthesis profiler",
      "debug synthesis cache",
      "debug synthesis clean-install-reset",
    ]) {
      assert.isTrue(commands.has(command), command);
      assert.isTrue(commands.get(command)!.hiddenFromIntentSearch, command);
    }
  });
});

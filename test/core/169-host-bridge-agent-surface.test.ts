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
import { loadHostBridgeCommandContracts } from "../../scripts/host-bridge-command-contracts";
import { findHostBridgeConsumerGuidanceViolations } from "../../scripts/check-host-bridge-consumer-guidance";

function schemaHasPath(schema: Record<string, any>, pathValue: string) {
  let current: Record<string, any> | undefined = schema;
  for (const part of pathValue.split(".")) {
    current = current?.properties?.[part];
    if (!current) return false;
  }
  return true;
}

describe("Host Bridge agent surface contract", function () {
  this.timeout(30_000);

  it("keeps low-level remote transport private to the contract executor", function () {
    const root = process.cwd();
    const executor = fs.readFileSync(
      path.join(root, "cli/zotero-bridge/src/client.rs"),
      "utf8",
    );
    const transport = fs.readFileSync(
      path.join(root, "cli/zotero-bridge/src/transport.rs"),
      "utf8",
    );
    const commands = fs.readFileSync(
      path.join(root, "cli/zotero-bridge/src/commands.rs"),
      "utf8",
    );

    assert.include(executor, "mod transport;");
    assert.include(executor, "contract::assert_endpoint_target");
    assert.include(executor, "contract::assert_capability_target");
    assert.include(executor, "contract::validate_capability_input");
    assert.include(executor, "contract::validate_capability_output");
    assert.notInclude(commands, "transport::");
    assert.notMatch(
      transport,
      /\npub fn (?:health|call|get|post|upload|download)\b/,
    );
  });

  it("keeps built-in Host Bridge consumers on live semantic CLI contracts", function () {
    assert.deepEqual(findHostBridgeConsumerGuidanceViolations(), []);
  });

  it("governs every command result and every structured input from one registry", function () {
    const root = process.cwd();
    const registrySchema = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          "schemas/host-bridge-cli-command-contracts.v2.schema.json",
        ),
        "utf8",
      ),
    );
    const registry = JSON.parse(
      fs.readFileSync(
        path.join(root, "host-bridge/contracts/cli-commands.v2.json"),
        "utf8",
      ),
    );
    const capabilities = JSON.parse(
      fs.readFileSync(
        path.join(root, "host-bridge/contracts/capabilities.v2.json"),
        "utf8",
      ),
    ).capabilities;
    const validate = new Ajv({ strict: false }).compile(registrySchema);
    assert.isTrue(validate(registry), JSON.stringify(validate.errors));
    const executableRegistry = loadHostBridgeCommandContracts();
    const catalog = buildHostBridgeSurfaceCatalog();
    assert.deepEqual(
      Object.keys(registry.commands).sort(),
      catalog.commandInventory.map((entry) => entry.command).sort(),
    );
    assert.lengthOf(Object.keys(registry.commands), 125);
    assert.notInclude(
      Object.values<any>(registry.commands).map(
        (entry) => entry.outputBoundary.strategy,
      ),
      "none",
    );
    for (const inventory of catalog.commandInventory) {
      const rawContract = registry.commands[inventory.command];
      const contract = executableRegistry.commands[inventory.command];
      assert.include(
        ["inline", "target-capability-envelope"],
        rawContract.resultSchemaSource,
        inventory.command,
      );
      if (rawContract.resultSchemaSource === "target-capability-envelope") {
        assert.strictEqual(rawContract.target.kind, "capability");
        assert.notProperty(rawContract, "resultSchema");
      }
      assert.include(
        ["inline", "target-capability"],
        rawContract.payloadSchemaSource,
        inventory.command,
      );
      if (rawContract.target.kind === "capability") {
        assert.strictEqual(
          rawContract.payloadSchemaSource,
          "target-capability",
          inventory.command,
        );
        assert.notProperty(rawContract, "payloadSchema", inventory.command);
      } else {
        assert.strictEqual(
          rawContract.payloadSchemaSource,
          "inline",
          inventory.command,
        );
        assert.isObject(rawContract.payloadSchema, inventory.command);
      }
      assert.isObject(contract.target, inventory.command);
      assert.isString(contract.target.kind, inventory.command);
      assert.include(
        ["passthrough", "overlay", "object", "none", "raw"],
        contract.binding,
        inventory.command,
      );
      assert.isObject(contract.resultSchema, inventory.command);
      assert.strictEqual(
        contract.resultSchema.type,
        "object",
        inventory.command,
      );
      assert.isObject(contract.resultSchema.properties, inventory.command);
      assert.isAbove(
        Object.keys(contract.resultSchema.properties).length,
        0,
        inventory.command,
      );
      assert.isTrue(
        contract.resultSchema.additionalProperties === false ||
          typeof contract.resultSchema["x-openPropertiesReason"] === "string",
        inventory.command,
      );
      for (const [argumentId, input] of Object.entries<any>(
        contract.inputs || {},
      )) {
        const rawInput = rawContract.inputs[argumentId];
        assert.isTrue(
          inventory.arguments.some((argument) => argument.id === argumentId),
          `${inventory.command}:${argumentId}`,
        );
        const inputSchema =
          input.schemaSource === "target-capability"
            ? capabilities[contract.target.capability]?.inputSchema
            : input.schema;
        assert.include(
          ["inline", "target-capability", "composition"],
          input.schemaSource,
          `${inventory.command}:${argumentId}`,
        );
        if (input.schemaSource === "target-capability") {
          assert.strictEqual(
            contract.target.kind,
            "capability",
            `${inventory.command}:${argumentId}`,
          );
          assert.notProperty(
            rawInput,
            "schema",
            `${inventory.command}:${argumentId}`,
          );
        }
        if (input.schemaSource === "composition") {
          assert.strictEqual(
            contract.target.kind,
            "capability",
            `${inventory.command}:${argumentId}`,
          );
          assert.notProperty(
            rawInput,
            "schema",
            `${inventory.command}:${argumentId}`,
          );
        }
        assert.isObject(inputSchema, `${inventory.command}:${argumentId}`);
        assert.isNotEmpty(input.examples, `${inventory.command}:${argumentId}`);
        for (const example of input.examples) {
          assert.include(
            ["shape-only", "executable"],
            example.kind,
            `${inventory.command}:${argumentId}`,
          );
          const validateExample = new Ajv({ strict: false }).compile(
            inputSchema,
          );
          assert.isTrue(
            validateExample(example.value),
            `${inventory.command}:${argumentId}:${JSON.stringify(
              validateExample.errors,
            )}`,
          );
        }
      }
    }
    assert.strictEqual(
      registry.commands["library item search"].binding,
      "passthrough",
    );
    assert.strictEqual(registry.commands.call.binding, "raw");
  });

  it("governs fixed capability payload composition with real Clap argument ids", function () {
    const registry = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "host-bridge/contracts/cli-commands.v2.json"),
        "utf8",
      ),
    );
    const inventory = new Map(
      buildHostBridgeSurfaceCatalog().commandInventory.map((entry) => [
        entry.command,
        entry,
      ]),
    );
    const fixedCapabilityCommands = Object.entries<any>(
      registry.commands,
    ).filter(([, entry]) => entry.target.kind === "capability");

    assert.isNotEmpty(fixedCapabilityCommands);
    for (const [command, entry] of fixedCapabilityCommands) {
      const argumentIds = new Set(
        inventory
          .get(command)!
          .arguments.map((argument: { id: string }) => argument.id),
      );
      if (entry.binding === "passthrough") {
        assert.lengthOf(Object.keys(entry.inputs), 1, command);
        assert.notProperty(entry, "composition", command);
        continue;
      }
      assert.include(["overlay", "object"], entry.binding, command);
      assert.isObject(entry.composition, command);
      for (const argumentId of [
        entry.composition.base?.argument,
        ...(entry.composition.mappings || []).map(
          (mapping: { argument: string }) => mapping.argument,
        ),
      ].filter(Boolean)) {
        assert.isTrue(
          argumentIds.has(argumentId),
          `${command}: composition references missing Clap argument ${argumentId}`,
        );
      }
    }

    const expectedSpecializations: Record<string, Record<string, unknown>> = {
      "library readiness missing-analysis": {
        checks: ["analysis"],
        missingOnly: true,
      },
      "library readiness missing-markdown": {
        checks: ["markdown"],
        missingOnly: true,
      },
      "library readiness missing-pdf": {
        checks: ["pdf"],
        missingOnly: true,
      },
      "mutation collection add-items": {
        operation: "collection.addItems",
      },
      "mutation collection create": { operation: "collection.create" },
      "mutation collection remove-items": {
        operation: "collection.removeItems",
      },
      "mutation item attach-file": { operation: "item.attachFile" },
      "mutation item update": { operation: "item.updateFields" },
      "mutation literature-ingest": { operation: "literature.ingest" },
      "mutation note create": { operation: "note.createChild" },
      "mutation note update": { operation: "note.update" },
      "mutation note upsert-payload": { operation: "note.upsertPayload" },
      "mutation tag add": { operation: "item.addTags" },
      "mutation tag remove": { operation: "item.removeTags" },
    };
    for (const [command, constants] of Object.entries(
      expectedSpecializations,
    )) {
      assert.deepEqual(
        registry.commands[command].composition.constants,
        constants,
        command,
      );
    }
  });

  it("keeps all 125 output boundaries executable and continuation-complete", function () {
    const registry = loadHostBridgeCommandContracts();
    const catalog = buildHostBridgeSurfaceCatalog();
    const inventory = new Map(
      catalog.commandInventory.map((entry) => [entry.command, entry]),
    );
    assert.lengthOf(Object.keys(registry.commands), 125);

    for (const [command, contract] of Object.entries(registry.commands)) {
      const boundary = contract.outputBoundary;
      const commandInventory = inventory.get(command)!;
      assert.isOk(commandInventory, command);
      const resultProperties = contract.resultSchema.properties as
        | Record<string, unknown>
        | undefined;
      if (
        resultProperties &&
        ["capability", "approval", "data"].every((field) =>
          Object.prototype.hasOwnProperty.call(resultProperties, field),
        )
      ) {
        assert.sameMembers(
          Object.keys(resultProperties),
          ["capability", "approval", "data"],
          `${command}: capability result schema must use only the canonical envelope`,
        );
      }
      if (boundary.strategy === "cursor" || boundary.strategy === "offset") {
        const argumentIds = new Set(
          commandInventory.arguments.map((argument) => argument.id),
        );
        assert.isTrue(
          argumentIds.has(boundary.cursorInput || "") ||
            argumentIds.has("query") ||
            argumentIds.has("input"),
          `${command}: missing ${boundary.cursorInput} input`,
        );
        assert.isAtMost(
          boundary.defaultLimit || Number.POSITIVE_INFINITY,
          boundary.maxLimit || 0,
          command,
        );
        for (const field of boundary.continuation || []) {
          assert.isTrue(
            schemaHasPath(contract.resultSchema, field),
            `${command}: missing continuation ${field}`,
          );
        }
      } else if (boundary.strategy === "limit") {
        assert.isAtMost(
          boundary.defaultLimit || Infinity,
          boundary.maxLimit || 0,
        );
        assert.isTrue(
          schemaHasPath(contract.resultSchema, boundary.truncatedField || ""),
          `${command}: missing truncated field`,
        );
      } else if (boundary.strategy === "file") {
        assert.isTrue(
          schemaHasPath(contract.resultSchema, boundary.fileField || ""),
          `${command}: missing file handle`,
        );
      } else if (boundary.strategy === "raw") {
        assert.strictEqual(command, "call");
      }
    }

    for (const command of [
      "library item notes",
      "library annotation export",
      "product get",
      "synthesis artifact read",
      "synthesis topic get-report",
      "synthesis topic list",
    ]) {
      const contract = registry.commands[command];
      const boundary = contract.outputBoundary;
      const governedPaths = [
        boundary.section,
        boundary.fileField,
        boundary.truncatedField,
        ...(boundary.continuation || []),
      ].filter(Boolean) as string[];
      assert.isNotEmpty(governedPaths, command);
      assert.isTrue(
        governedPaths.every((field) => field.startsWith("data.")),
        `${command}: capability output boundaries must govern the data envelope`,
      );
      for (const field of governedPaths) {
        const unscopedRoot = field.split(".")[1];
        assert.notProperty(
          contract.resultSchema.properties,
          unscopedRoot,
          `${command}: stale unscoped boundary field ${unscopedRoot}`,
        );
      }
    }

    const highCardinalityCommands = [
      "bridge manifest",
      "context current",
      "context selection get",
      "library item notes",
      "library item attachments",
      "library note payloads",
      "library annotation list",
      "product get",
      "product list",
      "run get",
      "run list",
      "run skill events",
      "synthesis artifact manifest",
      "workflow queue list",
      "workflow submission get",
    ];
    for (const command of highCardinalityCommands) {
      assert.notEqual(
        registry.commands[command].outputBoundary.strategy,
        "fixed",
        command,
      );
    }
  });

  it("describes canonical commands with control and recovery metadata", function () {
    const catalog = buildHostBridgeSurfaceCatalog();
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(catalog);

    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v6");
    assert.strictEqual(descriptor.cliSchema, "zotero-bridge.cli.v5");
    assert.lengthOf(catalog.commandInventory, 125);
    assert.isNotEmpty(descriptor.globalOptions);
    assert.isTrue(
      descriptor.globalOptions.every((entry) => Boolean(entry.help)),
    );
    assert.notProperty(descriptor, "workflowCatalog");
    assert.deepEqual(
      descriptor.commands.map((entry) => entry.command),
      catalog.commandInventory.map((entry) => entry.command),
    );
    assert.deepInclude(
      descriptor.globalOptions.find((entry) => entry.id === "endpoint")!,
      {
        token: "--endpoint",
        env: "ZOTERO_BRIDGE_ENDPOINT",
        global: true,
      },
    );
    assert.deepInclude(
      descriptor.globalOptions.find((entry) => entry.id === "schema")!,
      {
        token: "--schema",
        takesValue: false,
        global: true,
      },
    );
    const commands = new Map(
      descriptor.commands.map((entry) => [entry.command, entry]),
    );
    assert.strictEqual(commands.size, 125);
    assert.deepInclude(commands.get("run list")!.outputBoundary, {
      strategy: "cursor",
      section: "items",
      defaultLimit: 25,
      maxLimit: 100,
    });
    assert.deepInclude(
      commands.get("synthesis topic get-report")!.outputBoundary,
      {
        strategy: "offset",
        defaultLimit: 8000,
        maxLimit: 16000,
      },
    );
    assert.deepInclude(
      commands.get("synthesis artifact read")!.outputBoundary,
      {
        strategy: "file",
        fileField: "data.delivery.file",
      },
    );
    assert.strictEqual(commands.get("call")!.outputBoundary.strategy, "raw");
    const submit = commands.get("workflow submit")!;
    assert.deepInclude(
      submit.arguments.find((entry) => entry.id === "max_concurrency")!,
      {
        token: "--max-concurrency",
        takesValue: true,
        repeatable: false,
      },
    );
    assert.containsAllKeys(submit.inputSchemas, [
      "selection",
      "workflow_options",
      "provider_profile",
    ]);
    assert.isNotEmpty(submit.inputSchemas.selection.examples);
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
    assert.deepInclude(commands.get("workflow agent-run")!.targets, {
      kind: "endpoint",
      target: "GET /bridge/v2/files/{fileId}",
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
    const topicContextData = commands.get("synthesis topic get-context")!
      .resultSchema.properties?.data as { properties: object };
    assert.containsAllKeys(topicContextData.properties, ["delivery"]);
    assert.containsAllKeys(
      (topicContextData.properties.delivery as { properties: object })
        .properties,
      ["mode", "bundle", "downloadCommand", "unpackHint"],
    );
    for (const command of descriptor.commands) {
      assert.deepEqual(command.invocationSchema.additionalProperties, false);
      assert.isTrue(
        command.payloadSchema.additionalProperties === false ||
          (command.payloadSchema.additionalProperties === true &&
            typeof command.payloadSchema["x-openPropertiesReason"] ===
              "string") ||
          Array.isArray(command.payloadSchema.oneOf),
        command.command,
      );
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

  it("validates the runtime-derived mechanism-only Agent Surface v6 schema", function () {
    const root = process.cwd();
    const ajv = new Ajv({ strict: false });
    const schema = JSON.parse(
      fs.readFileSync(
        path.join(root, "schemas/host-bridge.agent-surface.v6.schema.json"),
        "utf8",
      ),
    );
    const data = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );
    assert.deepEqual(
      schema.properties.commands.items.properties.handleTransitions.items
        .properties.handle.enum,
      [...HOST_BRIDGE_HANDLE_KINDS],
    );
    const validate = ajv.compile(schema);
    assert.isTrue(validate(data), JSON.stringify(validate.errors));
  });

  it("does not read Generic sources to build a CLI descriptor", function () {
    const catalog = buildHostBridgeSurfaceCatalog();
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(catalog);
    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v6");
    assert.match(descriptor.commandCatalogChecksum, /^[a-f0-9]{64}$/);
  });

  it("keeps human-readable Agent Surface fields task-oriented", function () {
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(
      buildHostBridgeSurfaceCatalog(),
    );
    assert.deepEqual(findAgentLanguageViolations(descriptor), []);
    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v6");
    assert.strictEqual(descriptor.cliSchema, "zotero-bridge.cli.v5");
  });

  it("rejects internal prose while allowing formal bridge identifiers", function () {
    assert.isNotEmpty(
      findAgentLanguageViolations({ description: "Use Host Bridge access." }),
    );
    assert.deepEqual(
      findAgentLanguageViolations({
        schema: "host-bridge.agent-surface.v6",
        protocol: "host-bridge.v2",
        route: "/bridge/v2/manifest",
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
      version: "0.5.0",
      buildFingerprint: "f".repeat(64),
      descriptor,
    });
    assert.strictEqual(identity.schema, "host-bridge.surface-identity.v6");
    assert.strictEqual(identity.version, "0.5.0");
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

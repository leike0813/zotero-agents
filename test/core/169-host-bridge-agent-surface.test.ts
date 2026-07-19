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

describe("Host Bridge agent surface contract", function () {
  this.timeout(30_000);

  it("describes canonical commands with control and recovery metadata", function () {
    const catalog = buildHostBridgeSurfaceCatalog();
    const descriptor = buildHostBridgeAgentSurfaceDescriptor(catalog);

    assert.strictEqual(descriptor.schema, "host-bridge.agent-surface.v2");
    assert.strictEqual(descriptor.cliSchema, "zotero-bridge.cli.v2");
    assert.lengthOf(catalog.commandInventory, 112);
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
      "workflow agent-run",
      "workflow agent-apply",
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
    assert.strictEqual(
      commands.get("run get")!.guidance.example,
      "zotero-bridge run get 'run-id'",
    );
    assert.strictEqual(
      commands.get("file download")!.guidance.example,
      "zotero-bridge file download 'file-id' --output './output'",
    );
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
      assert.deepEqual(command.resultSchema.additionalProperties, false);
      assert.lengthOf(
        command.argvBindings,
        Object.keys(command.invocationSchema.properties || {}).length,
        command.command,
      );
      assert.isNotEmpty(command.effects, command.command);
      assert.isNotEmpty(command.recovery, command.command);
      assert.isNotEmpty(command.guidance.operation, command.command);
      assert.isTrue(command.guidance.commandSpecific, command.command);
      assert.isNotEmpty(command.guidance.useWhen, command.command);
      assert.isNotEmpty(command.guidance.avoidWhen, command.command);
      assert.isNotEmpty(command.guidance.distinguishFrom, command.command);
      assert.isNotEmpty(command.guidance.preconditions, command.command);
      assert.isNotEmpty(command.guidance.evidence, command.command);
      assert.isNotEmpty(command.guidance.failureChecks, command.command);
      assert.isNotEmpty(command.guidance.example, command.command);
      assert.notMatch(command.guidance.example, /\s--[a-z0-9]+_[a-z0-9_-]+/i);
      for (const binding of command.argvBindings.filter(
        (entry) => entry.required && entry.kind === "option",
      )) {
        assert.include(
          command.guidance.example,
          binding.token,
          command.command,
        );
      }
      assert.notDeepEqual(
        command.resultSchema.properties?.data?.type,
        ["object", "array", "string", "number", "boolean", "null"],
        command.command,
      );
    }
    assert.strictEqual(
      new Set(descriptor.commands.map((command) => command.guidance.useWhen[0]))
        .size,
      descriptor.commands.length,
      "every leaf command needs a command-specific first selection rule",
    );
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
      commands.get("library item search")!.guidance.preconditions.join(" "),
      "maps that value to backend payload field `query`",
    );
  });

  it("validates the rendered Agent Surface and semantic manifest schemas", function () {
    const root = process.cwd();
    const ajv = new Ajv({ strict: false });
    for (const [schemaPath, dataPath] of [
      [
        "schemas/host-bridge.agent-surface.v2.schema.json",
        "cli/zotero-bridge/src/agent-surface.json",
      ],
      [
        "schemas/host-bridge.semantic-guidance.v2.schema.json",
        "skills_src/host-bridge-shared/semantic/manifest.json",
      ],
    ]) {
      const schema = JSON.parse(
        fs.readFileSync(path.join(root, schemaPath), "utf8"),
      );
      const data = JSON.parse(
        fs.readFileSync(path.join(root, dataPath), "utf8"),
      );
      const validate = ajv.compile(schema);
      assert.isTrue(validate(data), JSON.stringify(validate.errors));
    }
  });

  it("keeps additive CLI, bounded-agent, and resident-profile guidance", function () {
    const sources = {
      cli: fs.readFileSync(
        path.join(process.cwd(), "skills_src/zotero-bridge-cli/semantic/SKILL.md"),
        "utf8",
      ),
      agent: fs.readFileSync(
        path.join(
          process.cwd(),
          "skills_src/zotero-bridge-cli/semantic/references/agent-guidance.md",
        ),
        "utf8",
      ),
      library: fs.readFileSync(
        path.join(
          process.cwd(),
          "skills_src/zotero-library-agent/semantic/references/task-routing.md",
        ),
        "utf8",
      ),
      profile: fs.readFileSync(
        path.join(
          process.cwd(),
          "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md",
        ),
        "utf8",
      ),
    };

    for (const marker of [
      "Provider Runtime Profiles",
      "autoApproveAcpPermissions",
      "permission visibility as read-only",
      "currentSkillRunId",
      "Version mismatch alone is not a blocker",
    ]) {
      assert.include(`${sources.cli}\n${sources.agent}`, marker);
    }
    for (const marker of [
      "Diagnostics and Readiness",
      "Notification Inbox",
      "Annotation Reads",
      "checksum",
      "Evidence and Artifacts",
    ]) {
      assert.include(sources.agent, marker);
    }
    assert.include(sources.library, "help-first");
    assert.notMatch(sources.library, /cron|HERMES_HOME|index\.sqlite/);
    assert.include(sources.profile, "expected CLI version");
    assert.include(sources.profile, "--help");
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

  it("renders detailed command cards and direct reference routes", function () {
    const root = process.cwd();
    const cliSkill = fs.readFileSync(
      path.join(root, "skills_builtin/zotero-bridge-cli/SKILL.md"),
      "utf8",
    );
    for (const reference of [
      "identity-and-connection.md",
      "invocation-and-json-input.md",
      "commands/library-items.md",
      "commands/workflows-and-runs.md",
      "output-and-recovery.md",
    ]) {
      assert.include(cliSkill, reference);
    }
    const commandManual = fs.readFileSync(
      path.join(
        root,
        "skills_builtin/zotero-bridge-cli/references/commands/workflows-and-runs.md",
      ),
      "utf8",
    );
    for (const heading of [
      "Backend and freshness",
      "Choose this command",
      "Invocation and payload",
      "Result and evidence",
      "Approval, effects, and handles",
      "Failure and recovery",
    ]) {
      assert.include(commandManual, heading);
    }
    assert.include(commandManual, "Exact argv bindings");
    assert.include(commandManual, "`run_id` → positional 1 as `RUN_ID`");
    const libraryManual = fs.readFileSync(
      path.join(
        root,
        "skills_builtin/zotero-bridge-cli/references/commands/library-items.md",
      ),
      "utf8",
    );
    assert.include(
      libraryManual,
      "maps that value to backend payload field `query`",
    );

    const librarySkill = fs.readFileSync(
      path.join(root, "skills_builtin/zotero-library-agent/SKILL.md"),
      "utf8",
    );
    for (const reference of [
      "journeys/current-context-and-library-read.md",
      "journeys/agent-owned-handoff.md",
      "journeys/products-and-files.md",
      "helper-script-contract.md",
    ]) {
      assert.include(librarySkill, reference);
    }
    const profileSkill = fs.readFileSync(
      path.join(
        root,
        "profiles/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md",
      ),
      "utf8",
    );
    for (const reference of [
      "resident-index.md",
      "scheduled-jobs.md",
      "monitoring-and-notifications.md",
      "maintenance-and-recovery.md",
      "profile-script-contracts.md",
    ]) {
      assert.include(profileSkill, reference);
    }
    for (const skill of [cliSkill, librarySkill, profileSkill]) {
      assert.notMatch(skill, /references\/[^\s`]*\*/);
    }
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
    assert.strictEqual(identity.schema, "host-bridge.surface-identity.v2");
    assert.strictEqual(identity.version, "0.2.2");
    assert.match(identity.commandCatalogChecksum, /^[a-f0-9]{64}$/);

    const matches = searchHostBridgeAgentSurface(descriptor, "selected items");
    assert.strictEqual(matches[0]?.command.command, "context selection get");
    assert.include(matches[0]?.matchReasons, "phrase:selected items");
    assert.isAtMost(matches.length, 10);

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

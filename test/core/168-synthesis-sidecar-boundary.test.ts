import { assert } from "chai";
import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";

const ROOT_DIR = process.cwd();
const INVENTORY_FILE = path.join(
  ROOT_DIR,
  "doc/synthesis-layer/contracts/service-api-migration.yaml",
);
const CHECKER_FILE = path.join(
  ROOT_DIR,
  "scripts/check-synthesis-service-boundary.ts",
);
const FIXTURE_ROOT = path.join(
  ROOT_DIR,
  "test/fixtures/synthesis-sidecar-migration",
);
const APPROVED_RETIRED_METHODS = [
  "applySynthesisJsonImport",
  "clearGitSyncAccessToken",
  "exportConceptKbCheckpoint",
  "exportSynthesisCheckpoint",
  "exportTagVocabularyCheckpoint",
  "exportTopicGraphCheckpoint",
  "getGitSyncPrefsConfigurationStatus",
  "loadGitSyncState",
  "pauseGitSync",
  "previewSynthesisJsonImport",
  "readGitSyncDiagnostics",
  "rebuildMirrorFromCanonical",
  "recoverCanonicalFromMirror",
  "refreshMirror",
  "resolveGitSyncConflict",
  "resumeGitSync",
  "retryGitSync",
  "saveGitSyncAccessToken",
  "saveGitSyncPrefsConfiguration",
  "syncNow",
  "syncRelatedItemsNow",
  "testGitSyncPrefsConfiguration",
  "verifySynthesisCheckpoint",
].sort();

async function loadBoundaryChecker() {
  assert.isTrue(
    fs.existsSync(INVENTORY_FILE),
    "the service API migration inventory must exist",
  );
  assert.isTrue(
    fs.existsSync(CHECKER_FILE),
    "the reusable synthesis boundary checker must exist",
  );
  return import("../../scripts/check-synthesis-service-boundary");
}

describe("Synthesis sidecar migration boundary", function () {
  it("pins the executable main baseline and keeps every method in the migration inventory", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.inventory.baseline, {
      commit: "e210997a11e0054a3cb4ae0656e5cfb96102a09c",
      service_source: "src/modules/synthesis/service.ts",
      service_factory: "createSynthesisService",
      public_method_count: 131,
      canonicalization: "sorted-newline-terminated",
      fingerprint_sha256:
        "86cf1654ea210b9fc9af1d1230045e3703d666cbc84495d73a3012aa1aedfa3e",
    });
    assert.deepEqual(
      [...report.inventory.audit.deletion_authorization].sort(),
      APPROVED_RETIRED_METHODS,
    );
    assert.equal(report.inventory.audit.source_public_method_count, 113);
    assert.equal(report.inventory.audit.wire_operation_count, 95);
    assert.lengthOf(report.baselineMethods, 131);
    assert.lengthOf(report.inventory.methods, 134);
    assert.sameMembers(report.introducedAfterBaseline, [
      "deleteTagVocabularyEntry",
      "updateStagedTagSuggestion",
      "updateTagVocabularyEntry",
    ]);
    assert.deepEqual(report.baselineCountMismatch, []);
    assert.deepEqual(report.baselineFingerprintMismatch, []);
    assert.deepEqual(report.baselineMethodsMissingFromInventory, []);
    assert.deepEqual(report.currentMethodsMissingFromInventory, []);
    assert.deepEqual(report.unknownInventoryMethods, []);
  });

  it("maps the closed baseline to wire, Host ownership, or the approved retirement list", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.pendingMigrations, []);
    assert.deepEqual(report.missingProductionOperations, []);
    assert.deepEqual(report.unknownProductionOperations, []);
    assert.deepEqual(report.invalidMergedTargets, []);
    assert.deepEqual(report.invalidHostOwnedTargets, []);
    assert.deepEqual(report.unauthorizedRetirements, []);
    assert.deepEqual(report.authorizedRetirementsNotMapped, []);
    assert.deepEqual(report.retiredMethodsWithProductionConsumers, []);
    assert.deepEqual(report.retiredMigrations, APPROVED_RETIRED_METHODS);
  });

  it("keeps the service API inventory synchronized with the public return surface", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingMethods, []);
    assert.deepEqual(report.unknownMethods, []);
    assert.deepEqual(report.productionBoundaryViolations, []);
    assert.lengthOf(report.publicMethods, 113);
    assert.lengthOf(report.inventory.methods, 134);
    assert.notInclude(report.publicMethods, "warmSynthesisWorkbenchSurfaces");
    assert.include(
      report.inventory.methods.map((method) => method.name),
      "warmSynthesisWorkbenchSurfaces",
    );
    const rawInventory = parseYaml(fs.readFileSync(INVENTORY_FILE, "utf8")) as {
      method_groups: Array<{ id: string }>;
      internal_engines: Array<{
        id: string;
        implementation: string;
        production_worker: boolean;
        sidecar_worker_canary?: boolean;
        sidecar_streaming_worker_canary?: boolean;
      }>;
      isolated_repository: {
        mode: string;
        schema_version: string;
        application_schema_version: string;
        citation_graph_application_schema_version: string;
        reference_refresh_application_schema_version: string;
        reference_matching_review_application_schema_version: string;
        tag_vocabulary_application_schema_version: string;
        concept_kb_application_schema_version: string;
        topic_graph_application_schema_version: string;
        durable_import_repository_schema_version: string;
        table_families: string[];
        production_database_owner: string;
        production_canonical_file_owner: string;
        production_mutation_enabled: boolean;
        remote_capability: boolean;
      };
      isolated_topic_canonical_store: {
        mode: string;
        schema_version: string;
        root_scope: string;
        capability: string;
        production_route: boolean;
        production_canonical_file_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_topic_application: {
        mode: string;
        package: string;
        use_cases: string[];
        asset_authority: string;
        remote_capability: boolean;
        production_route: boolean;
        production_canonical_file_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_citation_graph_application: {
        mode: string;
        package: string;
        use_cases: string[];
        build_scope: string;
        compute_owner: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_reference_refresh_application: {
        mode: string;
        package: string;
        use_cases: string[];
        refresh_scope: string;
        host_materialization: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        graph_execution: boolean;
        related_items_effect: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_reference_matching_review_application: {
        mode: string;
        package: string;
        use_cases: string[];
        compute_owner: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        graph_execution: boolean;
        related_items_effect: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_tag_vocabulary_application: {
        mode: string;
        package: string;
        use_cases: string[];
        compute_owner: string;
        host_effect_default: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        checkpoint_import_export: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_concept_kb_application: {
        mode: string;
        package: string;
        use_cases: string[];
        compute_owner: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        checkpoint_import_export: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_topic_graph_application: {
        mode: string;
        package: string;
        use_cases: string[];
        compute_owner: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        checkpoint_import_export: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_knowledge_checkpoint_application: {
        mode: string;
        package: string;
        use_cases: string[];
        replacement_mode: string;
        receipt_scope: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        production_database_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_durable_bundle_export_application: {
        mode: string;
        package: string;
        use_cases: string[];
        format: string;
        legacy_read: string;
        source_port: string;
        sink_port: string;
        import_mode: string;
        tombstone_apply: string;
        receipt_scope: string;
        recovery: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        production_database_owner: string;
        production_canonical_file_owner: string;
        production_mutation_enabled: boolean;
      };
      isolated_webdav_sync_application: {
        mode: string;
        package: string;
        use_cases: string[];
        transport_port: string;
        state_store: string;
        remote_layout: string;
        unbased_update_policy: string;
        retry_schedule: string;
        remote_capability: boolean;
        production_route: boolean;
        automatic_invocation: boolean;
        credential_owner: string;
        production_database_owner: string;
        production_canonical_file_owner: string;
        production_mutation_enabled: boolean;
      };
    };
    assert.include(
      rawInventory.method_groups.map((group) => group.id),
      "workbench_warmup",
    );
    assert.deepEqual(rawInventory.isolated_repository, {
      mode: "isolated_shadow",
      schema_version: "synthesis-repository-foundation.v1",
      application_schema_version: "synthesis-topic-application-repository.v1",
      citation_graph_application_schema_version:
        "synthesis-citation-graph-application-repository.v1",
      reference_refresh_application_schema_version:
        "synthesis-reference-refresh-repository.v1",
      reference_matching_review_application_schema_version:
        "synthesis-reference-matching-review-repository.v1",
      tag_vocabulary_application_schema_version:
        "synthesis-tag-vocabulary-application-repository.v1",
      concept_kb_application_schema_version:
        "synthesis-concept-kb-application-repository.v1",
      topic_graph_application_schema_version:
        "synthesis-topic-graph-application-repository.v1",
      durable_import_repository_schema_version:
        "synthesis-durable-import-repository.v1",
      table_families: [
        "schema_meta",
        "cache_basis",
        "operation",
        "topic_application_state",
        "topic_application_projection",
        "citation_graph_application_state",
        "citation_node",
        "citation_edge",
        "citation_source_ownership",
        "citation_incoming_group",
        "citation_metrics_light",
        "citation_metrics_complex",
        "citation_layout_state",
        "reference_application_state",
        "reference_source",
        "reference_artifact",
        "reference_raw",
        "reference_canonical",
        "reference_redirect",
        "reference_binding",
        "reference_revision_review",
        "reference_match_proposal",
        "reference_matching_state",
        "reference_matching_preparation",
        "review_item",
        "tag_application_state",
        "tag_vocabulary_entry",
        "tag_alias",
        "tag_abbrev",
        "tag_protocol",
        "tag_validation_warning",
        "tag_staged_suggestion",
        "tag_audit",
        "tag_effect",
        "concept_application_state",
        "concept",
        "concept_sense",
        "concept_alias",
        "concept_relation",
        "concept_review_item",
        "topic_concept_link",
        "topic_graph_application_state",
        "topic_graph_node",
        "topic_graph_edge",
        "topic_graph_review_item",
        "topic_interest_metadata",
        "topic_discovery_hint",
        "related_items_sync_effect",
        "durable_sync_state",
        "durable_sync_entity",
        "durable_import_commit",
      ],
      production_database_owner: "plugin_composition",
      production_canonical_file_owner: "plugin_composition",
      production_mutation_enabled: false,
      remote_capability: false,
    });
    assert.deepEqual(rawInventory.isolated_concept_kb_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "inspect",
        "load",
        "replace_snapshot",
        "ingest_proposals",
        "review",
        "update_display_text",
        "delete_concepts",
        "rebuild_index",
        "read_index",
        "query",
      ],
      compute_owner: "sidecar_worker",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      checkpoint_import_export: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_topic_graph_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "inspect",
        "load",
        "replace_snapshot",
        "upsert",
        "upsert_materialized_topic",
        "ingest_proposals",
        "decide_relation",
        "review",
        "mark_topic_relations_deleted",
        "purge_deleted_topic_relations",
        "rebuild_index",
        "read_index",
      ],
      compute_owner: "sidecar_worker",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      checkpoint_import_export: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_knowledge_checkpoint_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "build_checkpoint",
        "verify_checkpoint",
        "preview_import",
        "apply_import",
        "discard_import",
      ],
      replacement_mode: "full",
      receipt_scope: "in_process_single_use",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_durable_bundle_export_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "build_export",
        "read_and_verify",
        "preview_import",
        "apply_import",
        "discard_import",
      ],
      format: "v2_only_export",
      legacy_read: "v1",
      import_mode: "incremental_compare_and_swap",
      tombstone_apply: "unsupported",
      receipt_scope: "in_process_single_use",
      recovery: "repository_receipt_and_canonical_batch",
      source_port: "environment_neutral",
      sink_port: "environment_neutral_manifest_last",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      production_database_owner: "plugin_composition",
      production_canonical_file_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_webdav_sync_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "load_state",
        "run_sync",
        "trigger_sync",
        "trigger_auto_sync",
        "pause",
        "resume",
        "retry",
        "resolve_conflict",
      ],
      transport_port: "synthesis_host_webdav_sync",
      state_store: "identity_bound_shadow_files",
      remote_layout: "immutable_snapshots_mutable_head",
      unbased_update_policy: "explicit_acknowledgement",
      retry_schedule: "bounded_four_attempts",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      credential_owner: "plugin_composition",
      production_database_owner: "plugin_composition",
      production_canonical_file_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_topic_canonical_store, {
      mode: "isolated_shadow",
      schema_version: "synthesis-topic-canonical-store.v1",
      root_scope: "profile_runtime_root",
      capability: "topics.canonical.inspect",
      production_route: false,
      production_canonical_file_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_topic_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: ["list", "detail", "apply"],
      asset_authority: "materialized_only",
      remote_capability: false,
      production_route: false,
      production_canonical_file_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_citation_graph_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "inspect",
        "read_slice",
        "read_metrics",
        "read_layout",
        "rebuild_full",
        "refresh_metrics",
        "recompute_layout",
      ],
      build_scope: "full_only",
      compute_owner: "sidecar_worker",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(rawInventory.isolated_reference_refresh_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "inspect",
        "read_sources",
        "read_references",
        "prepare_refresh",
        "apply_refresh",
        "discard_preparation",
      ],
      refresh_scope: "full_or_bounded_sources",
      host_materialization: "prepare_apply",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      graph_execution: false,
      related_items_effect: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(
      rawInventory.isolated_reference_matching_review_application,
      {
        mode: "isolated_shadow",
        package: "packages/synthesis-application",
        use_cases: [
          "inspect",
          "list_proposals",
          "prepare_matching",
          "apply_matching",
          "discard_preparation",
          "review",
        ],
        compute_owner: "in_process_engine",
        remote_capability: false,
        production_route: false,
        automatic_invocation: false,
        graph_execution: false,
        related_items_effect: false,
        production_database_owner: "plugin_composition",
        production_mutation_enabled: false,
      },
    );
    assert.deepEqual(rawInventory.isolated_tag_vocabulary_application, {
      mode: "isolated_shadow",
      package: "packages/synthesis-application",
      use_cases: [
        "load",
        "validate",
        "list_staged",
        "save",
        "stage",
        "update_staged",
        "update_entry",
        "delete_entry",
        "promote",
        "discard",
        "clear_staged",
        "rebuild_index",
        "export_regulator_tags",
        "replace_audit",
        "clear_audit",
      ],
      compute_owner: "sidecar_worker",
      host_effect_default: "unavailable",
      remote_capability: false,
      production_route: false,
      automatic_invocation: false,
      checkpoint_import_export: false,
      production_database_owner: "plugin_composition",
      production_mutation_enabled: false,
    });
    assert.deepEqual(
      rawInventory.internal_engines.map((engine) => engine.id),
      [
        "citation_graph_build",
        "citation_graph_layout",
        "citation_graph_metrics",
        "reference_matcher",
        "tag_vocabulary",
        "concept_kb_index",
        "topic_graph_index",
        "topic_structured_artifact",
      ],
    );
    const graphBuildEngine = rawInventory.internal_engines.find(
      (engine) => engine.id === "citation_graph_build",
    );
    assert.deepInclude(graphBuildEngine, {
      implementation: "in_process",
      production_worker: false,
      sidecar_worker_canary: true,
      sidecar_streaming_worker_canary: true,
    });
    const layoutEngine = rawInventory.internal_engines.find(
      (engine) => engine.id === "citation_graph_layout",
    );
    assert.deepInclude(layoutEngine, {
      implementation: "sidecar_worker",
      production_worker: true,
      sidecar_worker_canary: false,
    });
    const metricsEngine = rawInventory.internal_engines.find(
      (engine) => engine.id === "citation_graph_metrics",
    );
    assert.deepInclude(metricsEngine, {
      implementation: "sidecar_worker",
      production_worker: true,
      sidecar_worker_canary: false,
    });
    assert.isTrue(
      rawInventory.internal_engines
        .filter(
          (engine) =>
            engine.id !== "citation_graph_layout" &&
            engine.id !== "citation_graph_metrics" &&
            engine.id !== "citation_graph_build",
        )
        .every(
          (engine) =>
            engine.implementation === "in_process" &&
            engine.production_worker === false,
        ),
    );
  });

  it("assigns every public method a valid category, capability, and disposition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.invalidMethods, []);
    assert.deepEqual(report.contractViolations, []);
    assert.deepEqual(report.sidecarAppViolations, []);
    for (const method of report.inventory.methods) {
      assert.match(method.name, /^[A-Za-z][A-Za-z0-9]*$/);
      assert.match(method.category, /^(query|command|host_effect|debug)$/);
      assert.match(
        method.disposition,
        /^(client_capability|host_capability|internal)$/,
      );
      assert.match(
        method.migration,
        /^(direct|merged|host_owned|internal|pending|retired)$/,
      );
      assert.isNotEmpty(method.target_capability);
    }
  });

  it("prevents direct full-service consumer growth outside migration composition", async function () {
    const checker = await loadBoundaryChecker();
    const report = checker.inspectSynthesisServiceBoundary();

    assert.deepEqual(report.missingConsumers, []);
    assert.deepEqual(report.unknownConsumers, []);
    assert.deepEqual(report.directConsumers, [
      "src/modules/synthesisClient/legacyComposition.ts",
    ]);
    assert.deepEqual(
      report.inventory.direct_consumers.map((consumer) => consumer.path).sort(),
      report.directConsumers,
    );
    const libraryIndex = report.inventory.methods.find(
      (method) => method.name === "getLibraryIndex",
    );
    assert.equal(libraryIndex?.disposition, "client_capability");
    assert.equal(libraryIndex?.target_capability, "library_index");

    const workbench = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisWorkbenchTab.ts"),
      "utf8",
    );
    const synthesisClientContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/client.ts"),
      "utf8",
    );
    const contractIndex = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/index.ts"),
      "utf8",
    );
    const sidecarAppRoot = path.join(ROOT_DIR, "apps/synthesis-service");
    const sidecarAppSource = fs
      .readdirSync(path.join(sidecarAppRoot, "src"))
      .filter((entry) => entry.endsWith(".ts"))
      .map((entry) =>
        fs.readFileSync(path.join(sidecarAppRoot, "src", entry), "utf8"),
      )
      .join("\n");
    const sidecarServer = fs.readFileSync(
      path.join(sidecarAppRoot, "src/server.ts"),
      "utf8",
    );
    const webDavSyncApplicationSource = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "packages/synthesis-application/src/webDavSyncApplication.ts",
      ),
      "utf8",
    );
    const sidecarSystemContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/sidecarSystem.ts"),
      "utf8",
    );
    const runtimeInstaller = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisSidecarRuntimeInstaller.ts"),
      "utf8",
    );
    for (const forbidden of [
      "child_process",
      "Subprocess",
      "pathSearch",
      "resolveRuntimeCommand",
      "synthesis/repository",
      "synthesis/service",
      "canonical",
    ]) {
      assert.notInclude(
        runtimeInstaller,
        forbidden,
        `runtime installer must not depend on ${forbidden}`,
      );
    }
    const serviceSource = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/service.ts"),
      "utf8",
    );
    const representativeImageHelper = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/digestRepresentativeImage.ts"),
      "utf8",
    );
    const representativeImageAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/representativeImageReadAdapter.ts",
      ),
      "utf8",
    );
    const exportDeliveryAdapter = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/exportDeliveryAdapter.ts"),
      "utf8",
    );
    const webDavSyncSource = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/webDavSync.ts"),
      "utf8",
    );
    const webDavSyncAdapter = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/webDavSyncAdapter.ts"),
      "utf8",
    );
    const webDavSyncRuntime = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/webDavSyncRuntime.ts"),
      "utf8",
    );
    const citationGraphSource = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/citationGraph.ts"),
      "utf8",
    );
    const citationGraphLayoutAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/citationGraphLayoutEngineAdapter.ts",
      ),
      "utf8",
    );
    const sidecarCitationGraphLayoutAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/sidecarCitationGraphLayoutEngineAdapter.ts",
      ),
      "utf8",
    );
    const citationGraphMetricsAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/citationGraphMetricsEngineAdapter.ts",
      ),
      "utf8",
    );
    const sidecarCitationGraphMetricsAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/sidecarCitationGraphMetricsEngineAdapter.ts",
      ),
      "utf8",
    );
    const citationGraphBuildAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/citationGraphBuildEngineAdapter.ts",
      ),
      "utf8",
    );
    const citationGraphBuildEngine = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "packages/synthesis-engine/src/citationGraphBuild.ts",
      ),
      "utf8",
    );
    const citationGraphLayoutEngine = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-engine/src/index.ts"),
      "utf8",
    );
    const referenceMatcherEngine = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-engine/src/referenceMatcher.ts"),
      "utf8",
    );
    const referenceMatcherAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/referenceMatcherEngineAdapter.ts",
      ),
      "utf8",
    );
    const tagVocabularyEngine = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-engine/src/tagVocabulary.ts"),
      "utf8",
    );
    const tagVocabularyAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/tagVocabularyEngineAdapter.ts",
      ),
      "utf8",
    );
    const conceptKbIndexEngine = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-engine/src/conceptKbIndex.ts"),
      "utf8",
    );
    const conceptKbIndexAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/conceptKbIndexEngineAdapter.ts",
      ),
      "utf8",
    );
    const topicGraphIndexEngine = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-engine/src/topicGraphIndex.ts"),
      "utf8",
    );
    const topicGraphIndexAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/topicGraphIndexEngineAdapter.ts",
      ),
      "utf8",
    );
    const topicStructuredArtifactEngine = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "packages/synthesis-engine/src/topicStructuredArtifact.ts",
      ),
      "utf8",
    );
    const topicStructuredArtifactAdapter = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "src/modules/synthesis/topicStructuredArtifactEngineAdapter.ts",
      ),
      "utf8",
    );
    const tagEffectAdapter = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesis/tagEffectAdapter.ts"),
      "utf8",
    );
    const tagRegulatorApply = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs",
      ),
      "utf8",
    );
    const legacyComposition = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisClient/legacyComposition.ts"),
      "utf8",
    );
    const readonlyComposition = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/harness/synthesisReadonlyClient.ts"),
      "utf8",
    );
    assert.notMatch(workbench, /synthesis\/service["']/);

    const hostBridge = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/hostBridgeCapabilityRegistry.ts"),
      "utf8",
    );
    const mcpProtocol = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/zoteroMcpProtocol.ts"),
      "utf8",
    );
    assert.notMatch(hostBridge, /synthesis\/service["']/);
    assert.notMatch(hostBridge, /\bresolveSynthesisService\b/);
    assert.include(hostBridge, "getDefaultSynthesisClient");
    assert.notMatch(mcpProtocol, /synthesis\/service["']/);
    assert.notMatch(mcpProtocol, /\bTOOL_REGISTRY\b/);
    assert.notMatch(mcpProtocol, /\bcallSynthesisService\b/);
    assert.notMatch(mcpProtocol, /\bsynthesisTool\b/);
    assert.isFalse(
      fs.existsSync(path.join(ROOT_DIR, "src/modules/synthesis/mcpService.ts")),
    );
    assert.notMatch(
      workbench,
      /\b(?:getDefaultSynthesisService|invalidateDefaultSynthesisService)\b/,
    );
    assert.include(
      synthesisClientContract,
      "readonly sync: SynthesisSyncClient",
    );
    assert.include(contractIndex, 'export * from "./sync"');
    assert.include(contractIndex, 'export * from "./debug"');
    assert.include(contractIndex, 'export * from "./libraryIndex"');
    assert.include(contractIndex, 'export * from "./workflowReview"');
    assert.include(contractIndex, 'export * from "./hostRead"');
    assert.include(contractIndex, 'export * from "./exportDelivery"');
    assert.include(contractIndex, 'export * from "./representativeImageRead"');
    assert.include(contractIndex, 'export * from "./relatedItemsEffect"');
    assert.include(contractIndex, 'export * from "./itemRef"');
    assert.include(contractIndex, 'export * from "./tagEffect"');
    assert.include(contractIndex, 'export * from "./webDavSyncPort"');
    assert.include(contractIndex, 'export * from "./sidecarSystem"');
    assert.include(contractIndex, 'export * from "./sidecarLifecycle"');
    assert.include(contractIndex, 'export * from "./sidecarCanonicalStore"');
    assert.include(contractIndex, 'export * from "./topicApplication"');
    assert.include(contractIndex, 'export * from "./durableBundle"');
    assert.include(contractIndex, 'export * from "./durableBundleImport"');
    assert.include(contractIndex, 'export * from "./webDavSync"');
    assert.isTrue(fs.existsSync(path.join(sidecarAppRoot, "package.json")));
    assert.notMatch(
      sidecarAppSource,
      /(?:src\/modules\/synthesis|synthesis\/service|hostEffect|globalThis\.Zotero|zotero-plugin)/i,
    );
    const childProcessUsers = fs
      .readdirSync(path.join(sidecarAppRoot, "src"))
      .filter(
        (entry) =>
          entry.endsWith(".ts") &&
          fs
            .readFileSync(path.join(sidecarAppRoot, "src", entry), "utf8")
            .includes("node:child_process"),
      )
      .sort();
    assert.deepEqual(childProcessUsers, ["rustComputeWorkerTransport.ts"]);
    assert.include(
      sidecarServer,
      "createSynthesisSidecarDurableBundleApplication",
    );
    assert.include(
      sidecarServer,
      "createSynthesisSidecarWebDavSyncApplication",
    );
    assert.isBelow(
      sidecarServer.indexOf("createSynthesisSidecarDurableBundleApplication({"),
      sidecarServer.indexOf("server.listen("),
    );
    assert.notInclude(sidecarSystemContract, "durable_bundle");
    assert.include(sidecarServer, 'owner: "web_dav_sync_application"');
    assert.include(sidecarServer, 'owner: "durable_bundle_application"');
    assert.match(
      sidecarServer,
      /for \(const \{ owner, shutdown \} of applicationOwners\) \{\s*await attemptCleanup\(phase, owner, shutdown\);\s*\}/,
    );
    assert.isBelow(
      sidecarServer.lastIndexOf('attemptCleanup(phase, "canonical_store"'),
      sidecarServer.lastIndexOf('attemptCleanup(phase, "repository"'),
    );
    const sqliteUsers = fs
      .readdirSync(path.join(sidecarAppRoot, "src"))
      .filter(
        (entry) =>
          entry.endsWith(".ts") &&
          fs
            .readFileSync(path.join(sidecarAppRoot, "src", entry), "utf8")
            .includes("node:sqlite"),
      );
    assert.deepEqual(sqliteUsers, ["repositoryNodeSqlite.ts"]);
    const repositoryFoundation = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-repository/src/index.ts"),
      "utf8",
    );
    assert.notMatch(
      repositoryFoundation,
      /(?:node:|Zotero|child_process|worker_threads|src\/modules\/synthesis)/,
    );
    const applicationFoundation = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-application/src/index.ts"),
      "utf8",
    );
    assert.include(
      applicationFoundation,
      "readSynthesisWorkbenchOperationalChrome",
    );
    assert.notMatch(
      applicationFoundation,
      /(?:node:|globalThis\.Zotero|zotero-plugin|child_process|worker_threads|repositoryNodeSqlite|isolatedRepository|src\/modules)/,
    );
    const topicCanonicalApplication = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "packages/synthesis-application/src/topicCanonical.ts",
      ),
      "utf8",
    );
    assert.include(topicCanonicalApplication, "SynthesisTopicCanonicalStore");
    assert.notMatch(
      topicCanonicalApplication,
      /(?:node:|globalThis\.Zotero|zotero-plugin|child_process|worker_threads|src\/modules)/,
    );
    const topicApplication = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "packages/synthesis-application/src/topicApplication.ts",
      ),
      "utf8",
    );
    assert.include(topicApplication, "createSynthesisTopicApplication");
    assert.notMatch(
      topicApplication,
      /(?:node:|globalThis\.Zotero|zotero-plugin|child_process|worker_threads|src\/modules)/,
    );
    const canonicalFilesystemOwners = fs
      .readdirSync(path.join(sidecarAppRoot, "src"))
      .filter(
        (entry) =>
          entry.endsWith(".ts") &&
          fs
            .readFileSync(path.join(sidecarAppRoot, "src", entry), "utf8")
            .includes("shadow-canonical"),
      );
    assert.deepEqual(canonicalFilesystemOwners, ["topicCanonicalStoreNode.ts"]);
    const workbenchCanaryClient = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisSidecarWorkbenchClient.ts"),
      "utf8",
    );
    assert.include(
      workbenchCanaryClient,
      'capability: "workbench.chrome.read"',
    );
    assert.notInclude(workbench, "synthesisSidecarWorkbenchClient");
    assert.notInclude(legacyComposition, "synthesisSidecarWorkbenchClient");
    assert.notInclude(legacyComposition, "topicApplicationNode");
    assert.notInclude(workbench, "topicApplicationNode");
    const workerThreadUsers = fs
      .readdirSync(path.join(sidecarAppRoot, "src"))
      .filter(
        (entry) =>
          entry.endsWith(".ts") &&
          fs
            .readFileSync(path.join(sidecarAppRoot, "src", entry), "utf8")
            .includes("node:worker_threads"),
      )
      .sort();
    assert.deepEqual(workerThreadUsers, []);
    const runtimeSupervisor = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisSidecarRuntimeSupervisor.ts"),
      "utf8",
    );
    for (const forbidden of [
      "pathSearch",
      "resolveRuntimeCommand",
      "getRuntimeProcessControlSnapshot",
      "processControl",
      "getDefaultSynthesisClient",
      "getDefaultSynthesisService",
    ]) {
      assert.notInclude(runtimeSupervisor, forbidden);
    }
    assert.notInclude(serviceSource, "createZoteroSynthesisLibraryAdapter");
    assert.notInclude(
      serviceSource,
      "libraryAdapter?: SynthesisLibraryAdapter",
    );
    assert.notInclude(serviceSource, "getDefaultSynthesisService");
    assert.notInclude(serviceSource, "invalidateDefaultSynthesisService");
    assert.notInclude(serviceSource, "readZoteroItemField");
    assert.notInclude(serviceSource, "zoteroCreatorsFromItem");
    assert.notInclude(serviceSource, "zoteroTagsFromItem");
    assert.notInclude(serviceSource, "zoteroCollectionsFromItem");
    assert.notInclude(serviceSource, "SynthesisMirrorAdapter");
    assert.notInclude(serviceSource, "SynthesisMirrorRefreshResult");
    assert.notInclude(serviceSource, "createZoteroSynthesisMirrorAdapter");
    assert.notInclude(serviceSource, "rebuildMirrorFromCanonical");
    assert.notInclude(serviceSource, "recoverCanonicalFromMirror");
    assert.notInclude(serviceSource, "globalThis as { Zotero");
    assert.include(legacyComposition, "createSynthesisHostExportDeliveryPort");
    assert.include(legacyComposition, "hostExportDeliveryPort");
    assert.notInclude(readonlyComposition, "hostExportDeliveryPort");
    assert.include(
      exportDeliveryAdapter,
      "rebuildSynthesisHostExportDeliveryRequest",
    );
    assert.include(exportDeliveryAdapter, "registerHostBridgeExportFile");
    assert.include(serviceSource, "hostExportDeliveryPort");
    assert.notInclude(serviceSource, "createSynthesisHostExportDeliveryPort");
    assert.notInclude(serviceSource, "registerHostBridgeExportFile");
    assert.notInclude(serviceSource, "createStoreZipBytes");
    assert.notInclude(serviceSource, "remoteExportRoot");
    assert.notInclude(serviceSource, "registerRemoteExportBundle");
    for (const forbidden of [
      "getSynthesisGitSyncPrefsConfig",
      "getSynthesisGitSyncAutoSyncEnabled",
      "createPrefsConfiguredSynthesisGitSyncAdapter",
      "getGitSyncPrefsStatus",
      "saveGitSyncPrefs",
      "saveGitSyncToken",
      "clearGitSyncToken",
      "testGitSyncConfiguration",
      "getWebDavSyncPrefsStatus",
      "saveWebDavSyncPrefs",
      "saveWebDavSyncCredential",
      "clearWebDavSyncCredential",
      "testWebDavSyncConfiguration",
      "SynthesisWebDavHttpClient",
      "onConfigurationChanged",
    ]) {
      assert.notInclude(serviceSource, forbidden);
    }
    for (const forbidden of [
      "webDavSyncPrefs",
      "webDavSyncCredentialPrefs",
      "webDavSyncClient",
      "webDavCredentialForRequest",
      "getSynthesisWebDavSyncPrefsConfig",
      "globalThis",
      "fetch(",
    ]) {
      assert.notInclude(webDavSyncSource, forbidden);
    }
    assert.include(webDavSyncSource, "createSynthesisWebDavSyncApplication");
    assert.include(webDavSyncApplicationSource, "options.hostPort.readText");
    assert.include(webDavSyncApplicationSource, "options.hostPort.writeText");
    assert.include(webDavSyncAdapter, "webDavCredentialForRequest");
    assert.include(webDavSyncAdapter, "getSynthesisWebDavSyncPrefsConfig");
    assert.include(
      webDavSyncRuntime,
      "createDisabledSynthesisHostWebDavSyncPort",
    );
    assert.include(
      legacyComposition,
      "createPrefsConfiguredSynthesisWebDavSyncPort",
    );
    assert.include(legacyComposition, "hostWebDavSyncPort");
    assert.include(
      readonlyComposition,
      "createDisabledSynthesisHostWebDavSyncPort",
    );
    assert.include(serviceSource, "citationGraphLayoutEngine");
    assert.include(serviceSource, "computeCitationGraphLayoutWithEngine");
    assert.include(serviceSource, "citationGraphMetricsEngine");
    assert.include(serviceSource, "computeCitationGraphMetricsWithEngine");
    assert.include(serviceSource, "citationGraphBuildEngine");
    assert.include(serviceSource, "buildProductionCitationGraphWithEngine");
    assert.include(serviceSource, "citation_graph_build_basis_superseded");
    assert.include(serviceSource, "referenceMatcherEngine");
    assert.include(serviceSource, "tagVocabularyEngine");
    assert.include(serviceSource, "conceptKbIndexEngine");
    assert.include(serviceSource, "topicGraphIndexEngine");
    assert.include(serviceSource, "topicStructuredArtifactEngine");
    assert.include(
      serviceSource,
      "computeSynthesisReferenceBindingsWithEngine",
    );
    assert.include(serviceSource, "computeSynthesisReferenceDedupeWithEngine");
    assert.include(serviceSource, "reference_matching_basis_superseded");
    assert.include(serviceSource, "synthesisRepository.transaction");
    assert.include(
      serviceSource,
      "currentGraph.graph_hash !== request.graphHash",
    );
    assert.notMatch(
      serviceSource,
      /lock\.runExclusive[\s\S]{0,240}computeCitationGraphLayoutWithEngine/,
    );
    assert.notInclude(
      legacyComposition,
      "createInProcessSynthesisCitationGraphLayoutEngine",
    );
    assert.include(
      legacyComposition,
      "createSynthesisSidecarCitationGraphLayoutEngine",
    );
    assert.include(legacyComposition, "citationGraphLayoutEngine");
    assert.notInclude(legacyComposition, "synthesisSidecarComputeClient");
    assert.notInclude(workbench, "synthesisSidecarComputeClient");
    assert.include(
      sidecarCitationGraphLayoutAdapter,
      "getReadySynthesisSidecarControlConnection",
    );
    assert.include(
      sidecarCitationGraphLayoutAdapter,
      "SYNTHESIS_SIDECAR_LAYOUT_DEADLINE_MS",
    );
    assert.notMatch(
      sidecarCitationGraphLayoutAdapter,
      /(?:repository|canonical|Host|Zotero|child_process|createInProcessSynthesisCitationGraphLayoutEngine)/,
    );
    assert.notInclude(
      legacyComposition,
      "createInProcessSynthesisCitationGraphMetricsEngine",
    );
    assert.include(
      legacyComposition,
      "createSynthesisSidecarCitationGraphMetricsEngine",
    );
    assert.include(legacyComposition, "citationGraphMetricsEngine");
    assert.include(
      sidecarCitationGraphMetricsAdapter,
      "getReadySynthesisSidecarControlConnection",
    );
    assert.include(
      sidecarCitationGraphMetricsAdapter,
      "SYNTHESIS_SIDECAR_METRICS_DEADLINE_MS",
    );
    assert.notMatch(
      sidecarCitationGraphMetricsAdapter,
      /(?:repository|canonical|Host|Zotero|child_process|createInProcessSynthesisCitationGraphMetricsEngine)/,
    );
    assert.include(
      legacyComposition,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.include(legacyComposition, "citationGraphBuildEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisReferenceMatcherEngine",
    );
    assert.include(legacyComposition, "referenceMatcherEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisTagVocabularyEngine",
    );
    assert.include(legacyComposition, "tagVocabularyEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisConceptKbIndexEngine",
    );
    assert.include(legacyComposition, "conceptKbIndexEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisTopicGraphIndexEngine",
    );
    assert.include(legacyComposition, "topicGraphIndexEngine");
    assert.include(
      legacyComposition,
      "createInProcessSynthesisTopicStructuredArtifactEngine",
    );
    assert.include(legacyComposition, "topicStructuredArtifactEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisCitationGraphBuildEngine",
    );
    assert.include(readonlyComposition, "citationGraphBuildEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisReferenceMatcherEngine",
    );
    assert.include(readonlyComposition, "referenceMatcherEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisTagVocabularyEngine",
    );
    assert.include(readonlyComposition, "tagVocabularyEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisConceptKbIndexEngine",
    );
    assert.include(readonlyComposition, "conceptKbIndexEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisTopicGraphIndexEngine",
    );
    assert.include(readonlyComposition, "topicGraphIndexEngine");
    assert.include(
      readonlyComposition,
      "createInProcessSynthesisTopicStructuredArtifactEngine",
    );
    assert.include(readonlyComposition, "topicStructuredArtifactEngine");
    assert.isFalse(
      fs.existsSync(
        path.join(ROOT_DIR, "src/modules/synthesis/referenceMatcher.ts"),
      ),
    );
    assert.notMatch(
      referenceMatcherEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation|runtimePersistence|libraryAdapter))/,
    );
    assert.notMatch(
      tagVocabularyEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation|runtimePersistence|libraryAdapter))/,
    );
    assert.notMatch(
      conceptKbIndexEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation|runtimePersistence|libraryAdapter))/,
    );
    assert.notMatch(
      topicGraphIndexEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation|runtimePersistence|libraryAdapter))/,
    );
    assert.notMatch(
      topicStructuredArtifactEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation|runtimePersistence|libraryAdapter))/,
    );
    assert.isFalse(
      fs.existsSync(
        path.join(ROOT_DIR, "src/modules/synthesis/topicStructuredArtifact.ts"),
      ),
    );
    assert.include(
      topicGraphIndexAdapter,
      "rebuildSynthesisTopicGraphIndexResult",
    );
    assert.include(
      topicStructuredArtifactAdapter,
      "rebuildSynthesisTopicArtifactAssemblyResult",
    );
    assert.include(
      topicStructuredArtifactAdapter,
      "rebuildSynthesisTopicArtifactValidationResult",
    );
    assert.include(
      topicStructuredArtifactAdapter,
      "rebuildSynthesisTopicSectionPatchResult",
    );
    assert.include(
      tagVocabularyAdapter,
      "rebuildSynthesisTagVocabularyValidationResult",
    );
    assert.include(
      tagVocabularyAdapter,
      "rebuildSynthesisTagVocabularyIndexResult",
    );
    assert.include(
      conceptKbIndexAdapter,
      "rebuildSynthesisConceptKbIndexResult",
    );
    assert.include(
      conceptKbIndexAdapter,
      "rebuildSynthesisConceptKbQueryResult",
    );
    assert.include(
      referenceMatcherAdapter,
      "rebuildSynthesisReferenceBindingResult",
    );
    assert.include(
      referenceMatcherAdapter,
      "rebuildSynthesisReferenceDedupeResult",
    );
    assert.notInclude(citationGraphSource, 'from "d3-force"');
    assert.notInclude(citationGraphSource, 'from "graphology"');
    assert.notInclude(citationGraphSource, "computeCitationGraphLayout(");
    assert.notInclude(citationGraphSource, "computeCitationGraphMetrics(");
    assert.include(
      citationGraphLayoutAdapter,
      "buildCitationGraphLayoutEngineRequest",
    );
    assert.include(citationGraphLayoutAdapter, "hashCanonicalJson(base)");
    assert.include(
      citationGraphMetricsAdapter,
      "buildCitationGraphMetricsEngineRequest",
    );
    assert.include(citationGraphMetricsAdapter, "hashCanonicalJson(base)");
    assert.include(
      citationGraphBuildAdapter,
      "buildProductionCitationGraphEngineRequest",
    );
    assert.notMatch(
      citationGraphBuildEngine,
      /from\s+["'](?:node:|[^"']*(?:repository|foundation))/,
    );
    const engineImports = [
      ...citationGraphLayoutEngine.matchAll(/from\s+["']([^"']+)["']/g),
    ].map((match) => match[1]);
    assert.deepEqual(
      [...new Set(engineImports)].sort(),
      [
        "./canonicalJson.ts",
        "./citationGraphBuildTransfer.ts",
        "./conceptKbIndex.ts",
        "./referenceMatcher.ts",
        "./tagVocabulary.ts",
        "./topicGraphIndex.ts",
        "./topicStructuredArtifact.ts",
      ].sort(),
    );
    assert.isFalse(
      engineImports.some((specifier) =>
        /^(?:node:)|(?:repository|foundation|zotero)/i.test(specifier),
      ),
    );
    assert.include(legacyComposition, "createZoteroSynthesisHostReadPort");
    assert.include(legacyComposition, "hostReadPort");
    assert.include(
      legacyComposition,
      "createZoteroSynthesisRepresentativeImageReadPort",
    );
    assert.include(legacyComposition, "hostRepresentativeImageReadPort");
    assert.notInclude(readonlyComposition, "hostRepresentativeImageReadPort");
    assert.include(
      legacyComposition,
      "createZoteroSynthesisRelatedItemsEffectPort",
    );
    assert.include(legacyComposition, "hostRelatedItemsEffectPort");
    assert.notInclude(readonlyComposition, "hostRelatedItemsEffectPort");
    assert.include(
      legacyComposition,
      "createZoteroSynthesisStagedTagBindingMigrationPort",
    );
    assert.include(legacyComposition, "hostStagedTagBindingMigrationPort");
    assert.include(legacyComposition, "createZoteroSynthesisTagEffectPort");
    assert.include(legacyComposition, "hostTagEffectPort");
    assert.notInclude(readonlyComposition, "hostStagedTagBindingMigrationPort");
    assert.notInclude(readonlyComposition, "hostTagEffectPort");
    assert.include(
      tagEffectAdapter,
      "rebuildSynthesisHostTagEffectBatchRequest",
    );
    assert.notInclude(
      serviceSource,
      'import { handlers } from "../../handlers"',
    );
    assert.notInclude(serviceSource, "Zotero.Items.get(parentItemId)");
    assert.notInclude(tagRegulatorApply, "appendTagToBoundParentItem");
    assert.notInclude(tagRegulatorApply, "appendTagsToBoundParents");
    assert.notInclude(tagRegulatorApply, "currentParentItemId");
    assert.include(serviceSource, "hostRepresentativeImageReadPort");
    assert.notInclude(
      serviceSource,
      "createZoteroSynthesisRepresentativeImageReadPort",
    );
    assert.notInclude(serviceSource, "resolveDigestRepresentativeImageForUi");
    for (const forbidden of [
      "runtimePersistence",
      "readRuntimeBytes",
      "globalThis",
      "Zotero",
      "getFilePathAsync",
    ]) {
      assert.notInclude(representativeImageHelper, forbidden);
    }
    assert.include(
      representativeImageAdapter,
      "rebuildSynthesisHostRepresentativeImageReadRequest",
    );
    assert.include(representativeImageAdapter, "readRuntimeBytes");
    assert.include(representativeImageAdapter, "statRuntimePath");
    assert.notInclude(serviceSource, "type RelatedItemsSyncHost");
    assert.notInclude(serviceSource, "createDefaultRelatedItemsSyncHost");
    assert.notInclude(serviceSource, "zoteroItemByLibraryAndKey");
    assert.notInclude(workbench, ".getSynthesisWorkbenchChromeInput");
    assert.notInclude(workbench, ".getSynthesisWorkbenchSurfaceInput");
    assert.notInclude(workbench, ".resolveTopicPaperDigest");
    assert.match(workbench, /client\.workbench\s*\.readChrome/);
    assert.match(workbench, /client\.workbench\s*\.readSurface/);
    assert.match(workbench, /client\.workbench\s*\.readTopicDetail/);
    assert.match(workbench, /client\.workbench\s*\.readPaperDigest/);
    assert.match(workbench, /client\.workbench\s*\.readProgress/);
    assert.match(workbench, /client\.topics\s*\.getTopicReport/);
    assert.match(workbench, /client\.topics\s*\.deleteTopicArtifact/);
    assert.match(workbench, /client\.topics\s*\.purgeDeletedTopicArtifacts/);
    assert.match(workbench, /client\.topics\s*\.rejectTopicDiscoveryHint/);
    assert.match(workbench, /client\.topics\s*\.restoreTopicDiscoveryHint/);
    assert.match(workbench, /client\.graph\s*\.recomputeCitationGraphLayout/);
    assert.match(workbench, /client\.graph\s*\.rebuildCitationGraphCacheNow/);
    assert.match(
      workbench,
      /client\.graph\s*\.refreshCitationGraphCacheIncrementalNow/,
    );
    assert.match(workbench, /client\.graph\s*\.retryCitationGraphCacheRebuild/);
    assert.match(
      workbench,
      /client\.references\s*\.refreshReferenceSidecarNow/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.retryReferenceSidecarRefresh/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.runAdvancedReferenceMatchingNow/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.retryAdvancedReferenceMatching/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyCanonicalRevisionReviewAction/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyReferenceMatchProposalAction/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyReferenceMatchProposalActions/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.mergeEffectiveCanonicalReference/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.applyCanonicalRevisionMergeRequests/,
    );
    assert.match(
      workbench,
      /client\.references\s*\.updateCanonicalReferenceMetadata/,
    );
    assert.match(workbench, /client\.references\s*\.archiveCanonicalReference/);
    assert.match(workbench, /client\.concepts\s*\.rebuildConceptKbIndex/);
    assert.match(workbench, /client\.concepts\s*\.updateConceptDisplayText/);
    assert.match(workbench, /client\.concepts\s*\.applyConceptReviewAction/);
    assert.match(workbench, /client\.concepts\s*\.deleteConceptEntries/);
    assert.match(workbench, /client\.topicGraph\s*\.rebuildTopicGraphIndex/);
    assert.match(workbench, /client\.topicGraph\s*\.acceptTopicGraphRelation/);
    assert.match(workbench, /client\.topicGraph\s*\.rejectTopicGraphRelation/);
    assert.match(
      workbench,
      /client\.topicGraph\s*\.applyTopicGraphReviewAction/,
    );
    for (const [transport, method] of [
      ["webDav", "runNow"],
      ["webDav", "pause"],
      ["webDav", "resume"],
      ["webDav", "retry"],
      ["webDav", "resolveConflict"],
    ]) {
      assert.match(
        workbench,
        new RegExp(`client\\.sync\\s*\\.${transport}\\s*\\.${method}`),
      );
    }
    assert.match(workbench, /client\.tags\s*\.validateTagVocabulary/);
    assert.match(workbench, /client\.tags\s*\.rebuildTagVocabularyIndex/);
    assert.match(workbench, /client\.tags\s*\.exportTagVocabularyForRegulator/);
    assert.match(workbench, /client\.tags\s*\.promoteStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.discardStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.clearStagedTagSuggestions/);
    assert.match(workbench, /client\.tags\s*\.updateStagedTagSuggestion/);
    assert.match(workbench, /client\.tags\s*\.updateTagVocabularyEntry/);
    assert.match(workbench, /client\.tags\s*\.deleteTagVocabularyEntry/);
    assert.match(workbench, /client\.tags\s*\.previewTagVocabularyImport/);
    assert.match(workbench, /client\.tags\s*\.applyTagVocabularyImport/);
    for (const method of [
      "recomputeCitationGraphLayout",
      "rebuildCitationGraphCacheNow",
      "refreshCitationGraphCacheIncrementalNow",
      "retryCitationGraphCacheRebuild",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "refreshReferenceSidecarNow",
      "retryReferenceSidecarRefresh",
      "runAdvancedReferenceMatchingNow",
      "retryAdvancedReferenceMatching",
      "applyCanonicalRevisionReviewAction",
      "applyReferenceMatchProposalAction",
      "applyReferenceMatchProposalActions",
      "mergeEffectiveCanonicalReference",
      "applyCanonicalRevisionMergeRequests",
      "updateCanonicalReferenceMetadata",
      "archiveCanonicalReference",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "rebuildConceptKbIndex",
      "updateConceptDisplayText",
      "applyConceptReviewAction",
      "deleteConceptEntries",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(`getDefaultSynthesisService\\(\\)\\.${method}`),
      );
    }
    for (const method of [
      "deleteTopicArtifact",
      "purgeDeletedTopicArtifacts",
      "rejectTopicDiscoveryHint",
      "restoreTopicDiscoveryHint",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    for (const method of [
      "rebuildTopicGraphIndex",
      "acceptTopicGraphRelation",
      "rejectTopicGraphRelation",
      "applyTopicGraphReviewAction",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    for (const method of [
      "validateTagVocabulary",
      "rebuildTagVocabularyIndex",
      "exportTagVocabularyForRegulator",
      "previewTagVocabularyImport",
      "applyTagVocabularyImport",
    ]) {
      assert.notMatch(
        workbench,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    const stagedBulkRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "applyTagVocabularyImport"',
      ),
    );
    for (const method of [
      "promoteStagedTagSuggestions",
      "discardStagedTagSuggestions",
      "clearStagedTagSuggestions",
    ]) {
      assert.notMatch(
        stagedBulkRegion,
        new RegExp(
          `(?:getDefaultSynthesisService\\(\\)\\s*\\.|\\bservice\\.)${method}`,
        ),
      );
    }
    const stagedUpdateRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "updateStagedTagSuggestion"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
    );
    assert.notMatch(
      stagedUpdateRegion,
      /(?:getDefaultSynthesisService\(\)\s*\.|\bservice\.)(?:stageTagSuggestions|discardStagedTagSuggestions)/,
    );
    const vocabularyEntryMutationRegion = workbench.slice(
      workbench.indexOf(
        'result.hostCommand?.command === "updateTagVocabularyEntry"',
      ),
      workbench.indexOf(
        'result.hostCommand?.command === "promoteStagedTagSuggestions"',
      ),
    );
    assert.notMatch(
      vocabularyEntryMutationRegion,
      /(?:getDefaultSynthesisService\(\)|\bservice\.|\.)(?:loadTagVocabulary|saveTagVocabulary)/,
    );
    assert.notMatch(
      workbench,
      /getDefaultSynthesisService\(\)\.getTopicReport/,
    );
    assert.notInclude(workbench, ".warmSynthesisWorkbenchSurfaces");
    const progressRefreshBlock = workbench.slice(
      workbench.indexOf("async function refreshWorkbenchCommandProgress"),
      workbench.indexOf("function runWorkbenchCommandOnce"),
    );
    assert.notInclude(progressRefreshBlock, ".getSynthesisBackgroundJobRows");

    const clientContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/client.ts"),
      "utf8",
    );
    const workbenchContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/workbench.ts"),
      "utf8",
    );
    const graphContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/graph.ts"),
      "utf8",
    );
    const referencesContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/references.ts"),
      "utf8",
    );
    const topicsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/topics.ts"),
      "utf8",
    );
    const conceptsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/concepts.ts"),
      "utf8",
    );
    const topicGraphContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/topicGraph.ts"),
      "utf8",
    );
    const tagsContract = fs.readFileSync(
      path.join(ROOT_DIR, "packages/synthesis-contracts/src/tags.ts"),
      "utf8",
    );
    assert.include(topicsContract, "getTopicReport(");
    assert.include(topicsContract, "deleteTopicArtifact(");
    assert.include(topicsContract, "purgeDeletedTopicArtifacts()");
    assert.include(topicsContract, "rejectTopicDiscoveryHint(");
    assert.include(topicsContract, "restoreTopicDiscoveryHint(");
    assert.include(topicsContract, "SynthesisTopicArtifactDeleteRequest");
    assert.include(topicsContract, "SynthesisTopicDiscoveryHintRequest");
    assert.notMatch(
      topicsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.notInclude(workbenchContract, "getTopicReport(");
    assert.include(workbenchContract, "readProgress()");
    assert.include(clientContract, "graph: SynthesisGraphClient");
    assert.include(graphContract, "recomputeCitationGraphLayout(");
    assert.include(graphContract, "rebuildCitationGraphCacheNow()");
    assert.include(graphContract, "refreshCitationGraphCacheIncrementalNow()");
    assert.include(graphContract, "retryCitationGraphCacheRebuild()");
    assert.notMatch(
      graphContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(clientContract, "references: SynthesisReferencesClient");
    assert.include(clientContract, "concepts: SynthesisConceptsClient");
    assert.include(clientContract, "topicGraph: SynthesisTopicGraphClient");
    assert.include(referencesContract, "refreshReferenceSidecarNow()");
    assert.include(referencesContract, "retryReferenceSidecarRefresh()");
    assert.include(referencesContract, "runAdvancedReferenceMatchingNow()");
    assert.include(referencesContract, "retryAdvancedReferenceMatching()");
    assert.include(referencesContract, "applyCanonicalRevisionReviewAction(");
    assert.include(referencesContract, "applyReferenceMatchProposalAction(");
    assert.include(referencesContract, "applyReferenceMatchProposalActions(");
    assert.include(referencesContract, "mergeEffectiveCanonicalReference(");
    assert.include(referencesContract, "applyCanonicalRevisionMergeRequests(");
    assert.include(referencesContract, "updateCanonicalReferenceMetadata(");
    assert.include(referencesContract, "archiveCanonicalReference(");
    assert.include(
      referencesContract,
      "SynthesisCanonicalReferenceMetadataPatch",
    );
    assert.include(referencesContract, '"manual_target"');
    assert.include(referencesContract, 'kind: "zotero_item"');
    assert.include(referencesContract, 'kind: "canonical_reference"');
    assert.notMatch(
      referencesContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(conceptsContract, "rebuildConceptKbIndex()");
    assert.include(conceptsContract, "updateConceptDisplayText(");
    assert.include(conceptsContract, "applyConceptReviewAction(");
    assert.include(conceptsContract, "deleteConceptEntries(");
    assert.include(conceptsContract, '"merge_into_existing"');
    assert.include(conceptsContract, "short_definition?: string");
    assert.notMatch(
      conceptsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(topicGraphContract, "rebuildTopicGraphIndex()");
    assert.include(topicGraphContract, "acceptTopicGraphRelation(");
    assert.include(topicGraphContract, "rejectTopicGraphRelation(");
    assert.include(topicGraphContract, "applyTopicGraphReviewAction(");
    assert.include(topicGraphContract, '"approve_suggested"');
    assert.notMatch(
      topicGraphContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions/,
    );
    assert.include(clientContract, "tags: SynthesisTagsClient");
    assert.include(tagsContract, "validateTagVocabulary()");
    assert.include(tagsContract, "rebuildTagVocabularyIndex()");
    assert.include(tagsContract, "exportTagVocabularyForRegulator()");
    assert.include(tagsContract, "SynthesisTagSelectionRequest");
    assert.include(tagsContract, "SynthesisTagCommandResult");
    assert.include(tagsContract, "SynthesisStagedTagUpdateRequest");
    assert.include(tagsContract, "updateStagedTagSuggestion(");
    assert.include(tagsContract, "SynthesisTagVocabularyEntryUpdateRequest");
    assert.include(tagsContract, "SynthesisTagVocabularyEntryDeleteRequest");
    assert.include(tagsContract, "updateTagVocabularyEntry(");
    assert.include(tagsContract, "deleteTagVocabularyEntry(");
    assert.include(tagsContract, "promoteStagedTagSuggestions(");
    assert.include(tagsContract, "discardStagedTagSuggestions(");
    assert.include(tagsContract, "clearStagedTagSuggestions()");
    assert.notMatch(
      tagsContract,
      /onProgress|callback|stream|Workbench|SynthesisUi|progressOptions|clipboard/,
    );
    assert.notMatch(
      `${clientContract}\n${workbenchContract}`,
      /prewarm|warmSynthesis|onPhase|fullSnapshot/,
    );
  });

  it("records reviewable schema, canonical ownership, and bounded DTO fixtures [inv.runtime.single_production_owner]", function () {
    const schemaPath = path.join(FIXTURE_ROOT, "schema-baseline.json");
    const canonicalPath = path.join(FIXTURE_ROOT, "canonical-topic-tree.json");
    const dtoPath = path.join(FIXTURE_ROOT, "bounded-dto-baseline.json");
    for (const fixturePath of [schemaPath, canonicalPath, dtoPath]) {
      assert.isTrue(fs.existsSync(fixturePath), `${fixturePath} must exist`);
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
    const dto = JSON.parse(fs.readFileSync(dtoPath, "utf8"));
    assert.equal(schema.database, "state/synthesis.db");
    assert.includeMembers(schema.tables, [
      "synt_operation",
      "synt_cache_basis",
      "synt_canonical_reference",
    ]);
    assert.equal(canonical.canonical_source, "topic_current_files");
    assert.equal(canonical.zotero_note_role, "mirror");
    assert.isAtMost(dto.reference_artifact_page.items.length, 50);
    assert.equal(dto.reference_artifact_page.page.limit, 50);
  });

  it("keeps active docs explicit about current process and Topic ownership", function () {
    const readme = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/README.md"),
      "utf8",
    );
    const storage = fs.readFileSync(
      path.join(
        ROOT_DIR,
        "doc/synthesis-layer/library-ssot-and-sidecar-cache.md",
      ),
      "utf8",
    );
    const runtime = fs.readFileSync(
      path.join(ROOT_DIR, "doc/synthesis-layer/runtime-and-rebuild.md"),
      "utf8",
    );

    assert.include(
      readme,
      "Topic canonical current files are the only runtime SSOT",
    );
    assert.include(
      storage,
      "| Topic canonical current files and source manifests |",
    );
    assert.include(storage, "| Legacy Zotero Topic anchor/shard items |");
    assert.include(storage, "Normal runtime does not discover, read, update");
    assert.notInclude(
      storage,
      "No external process requirement just to keep a local index current.",
    );
    assert.include(runtime, "The production owner injects the sidecar-backed");
    assert.match(
      runtime,
      /do not\s+retry through Node or a plugin production owner/,
    );
    assert.include(
      runtime,
      "synthesis_sidecar_service_stage1_refactor_plan_20260715.md",
    );
    assert.include(runtime, "113-method service");
  });

  it("routes production lifecycle through the single production owner [inv.runtime.sidecar_supervision_isolated]", function () {
    const hooks = fs.readFileSync(path.join(ROOT_DIR, "src/hooks.ts"), "utf8");
    const owner = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisProductionOwner.ts"),
      "utf8",
    );
    const installer = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisSidecarRuntimeInstaller.ts"),
      "utf8",
    );
    const supervisor = fs.readFileSync(
      path.join(ROOT_DIR, "src/modules/synthesisSidecarRuntimeSupervisor.ts"),
      "utf8",
    );
    assert.include(hooks, "startDefaultSynthesisProductionOwner()");
    assert.include(hooks, "stopDefaultSynthesisProductionOwner");
    assert.notInclude(hooks, "startSynthesisSidecarRuntimeSupervisor(");
    const invalidation = owner.indexOf(
      "deps.invalidateClient || invalidateDefaultSynthesisClient",
    );
    const endpointStop = owner.indexOf("await endpoint?.stop()");
    const supervisorStop = owner.indexOf(
      "await deps.stopProductionSupervisor()",
    );
    assert.isAtLeast(invalidation, 0);
    assert.isAbove(supervisorStop, invalidation);
    assert.isAbove(endpointStop, supervisorStop);
    assert.notInclude(installer, "ensureSynthesisService");
    assert.notInclude(installer, "getMozillaSubprocessModule");
    assert.notInclude(installer, "resolveRuntimeCommand");
    assert.notInclude(supervisor, "getDefaultSynthesisClient");
    assert.notInclude(supervisor, "getDefaultSynthesisService");
    assert.notInclude(supervisor, "pathSearch");
  });

  it("registers the migration-safe single-owner invariant", function () {
    const contract = parseYaml(
      fs.readFileSync(
        path.join(ROOT_DIR, "doc/synthesis-layer/contracts/invariants.yaml"),
        "utf8",
      ),
    ) as {
      invariants: Array<{
        id: string;
        test_refs?: Array<{ file: string; marker: string }>;
      }>;
    };
    const invariant = contract.invariants.find(
      (entry) => entry.id === "inv.runtime.single_production_owner",
    );
    assert.exists(invariant);
    assert.deepInclude(invariant?.test_refs || [], {
      file: "test/core/168-synthesis-sidecar-boundary.test.ts",
      marker: "[inv.runtime.single_production_owner]",
      kind: "static_guard",
    });
  });
});

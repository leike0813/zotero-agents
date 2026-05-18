import { assert } from "chai";

type AnyModule = Record<string, any> & { __loadError?: unknown };

async function importOptional(modulePath: string): Promise<AnyModule> {
  try {
    return (await import(modulePath)) as AnyModule;
  } catch (error) {
    return { __loadError: error };
  }
}

function requireExport(module: AnyModule, exportName: string) {
  assert.isUndefined(
    module.__loadError,
    `expected structured topic artifact module to load before checking ${exportName}: ${
      module.__loadError instanceof Error ? module.__loadError.message : String(module.__loadError)
    }`,
  );
  assert.isFunction(
    module[exportName],
    `expected synthesis structured artifact module to export ${exportName}`,
  );
  return module[exportName] as (...args: any[]) => any;
}

function completeSectionManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "2.0.0",
    operation: "create",
    topic_id: "object-detection",
    language: "zh-CN",
    created_at: "2026-05-16T00:00:00.000Z",
    sections: {
      topic: {
        path: "result/sections/topic.json",
        hash: "sha256:topic",
        content_type: "json",
      },
      summary: {
        path: "result/sections/summary.json",
        hash: "sha256:summary",
        content_type: "json",
      },
      claims: {
        path: "result/sections/claims.json",
        hash: "sha256:claims",
        content_type: "json",
      },
      positioning: {
        path: "result/sections/positioning.json",
        hash: "sha256:positioning",
        content_type: "json",
      },
      taxonomy: {
        path: "result/sections/taxonomy.json",
        hash: "sha256:taxonomy",
        content_type: "json",
      },
      comparison_matrix: {
        path: "result/sections/comparison-matrix.json",
        hash: "sha256:comparison",
        content_type: "json",
      },
      debates: {
        path: "result/sections/debates.json",
        hash: "sha256:debates",
        content_type: "json",
      },
      review_outline: {
        path: "result/sections/review-outline.json",
        hash: "sha256:outline",
        content_type: "json",
      },
      evidence_map: {
        path: "result/sections/evidence-map.json",
        hash: "sha256:evidence-map",
        content_type: "json",
      },
      timeline_events: {
        path: "result/sections/timeline-events.json",
        hash: "sha256:timeline",
        content_type: "json",
      },
      paper_evidence: {
        path: "result/sections/paper-evidence.json",
        hash: "sha256:evidence",
        content_type: "json",
      },
      external_literature_analysis: {
        path: "result/sections/external-literature-analysis.json",
        hash: "sha256:external",
        content_type: "json",
      },
      coverage: {
        path: "result/sections/coverage.json",
        hash: "sha256:coverage",
        content_type: "json",
      },
      gaps: {
        path: "result/sections/gaps.json",
        hash: "sha256:gaps",
        content_type: "json",
      },
      source_artifacts: {
        path: "result/sections/source-artifacts.json",
        hash: "sha256:sources",
        content_type: "json",
      },
      diagnostics: {
        path: "result/sections/diagnostics.json",
        hash: "sha256:diagnostics",
        content_type: "json",
      },
    },
    markdown_path: "result/preview.md",
    ...overrides,
  };
}

function sectionPatchManifest(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_section_patch_manifest",
    schema_version: "2.0.0",
    operation: "update_patch",
    topic_id: "object-detection",
    language: "zh-CN",
    created_at: "2026-05-16T00:00:00.000Z",
    base: {
      current_manifest_hash: "sha256:current-manifest",
      current_artifact_hash: "sha256:current-artifact",
      read_section_hashes: {
        claims: "sha256:old-claims",
        coverage: "sha256:old-coverage",
      },
      replace_section_hashes: {
        claims: "sha256:old-claims",
      },
    },
    patch: {
      mode: "section_replace",
      changed_sections: ["claims"],
      unchanged_section_policy: "inherit_current",
      sections: {
        claims: {
          path: "result/sections/claims.json",
          hash: "sha256:new-claims",
          content_type: "json",
        },
      },
    },
    diagnostics: {
      requires_full_update: false,
    },
    ...overrides,
  };
}

function structuredArtifact(overrides: Record<string, unknown> = {}) {
  return {
    schema_id: "synthesis.topic_synthesis_artifact",
    schema_version: "2.0.0",
    language: "zh-CN",
    topic: {
      id: "object-detection",
      title: "Object Detection",
    },
    summary: {
      brief: "对象检测主题综合。",
    },
    claims: [
      {
        id: "claim:detector-evolution",
        text: "检测器从手工 proposal 走向端到端集合预测。",
        evidence_refs: ["paper:1:DETR"],
        evidence_map_refs: ["claim:detector-evolution"],
      },
    ],
    timeline_events: [
      {
        id: "event:detr",
        year: 2020,
        label: "DETR",
        evidence_refs: ["paper:1:DETR"],
      },
    ],
    positioning: {
      thesis: "对象检测方法演化体现了从 proposal pipeline 到集合预测的建模迁移。",
      evidence_map_refs: ["claim:detector-evolution"],
    },
    taxonomy: {
      axis: "method route",
      nodes: [
        {
          id: "tax:end-to-end",
          label: "End-to-end set prediction",
          paper_refs: ["1:DETR"],
          evidence_map_refs: ["tax:end-to-end"],
        },
      ],
    },
    comparison_matrix: {
      dimensions: ["problem addressed", "core mechanism"],
      rows: [
        {
          id: "cmp:detr",
          paper_ref: "1:DETR",
          values: {
            "problem addressed": "object detection pipeline",
            "core mechanism": "set prediction with transformers",
          },
          evidence_map_refs: ["cmp:detr"],
        },
      ],
    },
    debates: [],
    review_outline: {
      sections: [
        {
          id: "outline:intro",
          title: "Introduction",
          purpose: "定位对象检测方法迁移。",
          source_section_refs: ["claim:detector-evolution"],
          evidence_map_refs: ["claim:detector-evolution"],
        },
      ],
    },
    evidence_map: {
      path: "runtime/payloads/cross-paper-evidence-map.json",
      hash: "sha256:evidence-map",
      candidate_counts: {
        taxonomy_candidates: 1,
        comparison_dimensions: 1,
        claim_candidates: 1,
        debate_candidates: 0,
        gap_candidates: 0,
        review_outline_seeds: 1,
      },
      candidate_ids: [
        "claim:detector-evolution",
        "tax:end-to-end",
        "cmp:detr",
      ],
    },
    paper_evidence: [
      {
        id: "paper:1:DETR",
        paper_ref: "1:DETR",
        title: "End-to-End Object Detection with Transformers",
        digest_ref: {
          paper_ref: "1:DETR",
          item_ref: "zotero://select/items/1_DETR",
          note_key: "NOTEDETR",
          payload_type: "digest-markdown",
          payload_hash: "sha256:digest",
          updated_at: "2026-05-10T00:00:00.000Z",
        },
      },
    ],
    external_literature_analysis: {
      summary: "外部文献提供方法脉络和背景约束。",
      themes: [
        {
          id: "theme:transformers",
          title: "Transformer 背景",
          reference_ids: ["external:vaswani2017"],
        },
      ],
      representative_references: [
        {
          id: "external:vaswani2017",
          title: "Attention Is All You Need",
          cited_by_papers: ["paper:1:DETR"],
          information_completeness: "partial",
        },
      ],
      citation_contexts: [],
      contribution_to_topic: "说明 DETR 借用 Transformer 的建模基础。",
      limitations: "库外证据不直接支撑主结论。",
    },
    coverage: {
      paper_count: 1,
      external_literature_count: 1,
    },
    gaps: [],
    source_artifacts: [],
    diagnostics: {
      warnings: [],
    },
    ...overrides,
  };
}

describe("Topic synthesis structured artifact contract", function () {
  it("accepts complete section manifests and optional create/full-update markdown preview inputs", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(completeSectionManifest());

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.manifest.operation, "create");
    assert.equal(result.manifest.language, "zh-CN");
    assert.equal(result.manifest.markdown_path, "result/preview.md");
  });

  it("accepts section patch manifests with read-set CAS and inherit-current unchanged sections", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(sectionPatchManifest());

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.manifest.operation, "update_patch");
    assert.deepEqual(result.manifest.patch.changed_sections, ["claims"]);
    assert.equal(result.manifest.patch.unchanged_section_policy, "inherit_current");
  });

  it("rejects field-level patch payloads, replacement outside read set, and patch markdown dependencies", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );

    const result = validateTopicAnalysisManifest(
      sectionPatchManifest({
        markdown_path: "result/patch-preview.md",
        base: {
          current_manifest_hash: "sha256:current-manifest",
          current_artifact_hash: "sha256:current-artifact",
          read_section_hashes: {
            coverage: "sha256:old-coverage",
          },
          replace_section_hashes: {
            claims: "sha256:old-claims",
          },
        },
        patch: {
          mode: "json_patch",
          changed_sections: ["claims"],
          unchanged_section_policy: "inherit_current",
          operations: [{ op: "replace", path: "/claims/0/text", value: "bad" }],
          sections: {
            claims: {
              path: "result/sections/claims.json",
              hash: "sha256:new-claims",
              content_type: "json",
            },
          },
        },
      }),
    );

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /section_replace|read_section_hashes|markdown/i);
  });

  it("rejects embedded markdown and missing required section paths", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicAnalysisManifest = requireExport(
      module,
      "validateTopicAnalysisManifest",
    );
    const manifest = completeSectionManifest({
      markdown: "# embedded markdown is forbidden",
      sections: {
        ...completeSectionManifest().sections,
        claims: {
          hash: "sha256:claims",
          content_type: "json",
        },
      },
    });

    const result = validateTopicAnalysisManifest(manifest);

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /markdown|claims.*path/i);
  });

  it("validates language propagation into the materialized structured artifact", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(structuredArtifact(), {
      expectedLanguage: "zh-CN",
    });

    assert.isTrue(result.ok, result.errors?.join("; "));
    assert.equal(result.artifact.language, "zh-CN");
  });

  it("computes documented manifest, artifact, export, metadata, and section hashes from canonical current files", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const computeTopicCurrentHashes = requireExport(module, "computeTopicCurrentHashes");

    const hashes = computeTopicCurrentHashes({
      manifest: { schema_id: "synthesis.topic_current_manifest", sections: {} },
      artifact: structuredArtifact(),
      metadata: { topic_id: "object-detection", language: "zh-CN" },
      exportMarkdown: "# Object Detection\n",
      sections: {
        claims: [{ id: "claim:detector-evolution" }],
      },
    });

    assert.containsAllKeys(hashes, [
      "manifest_hash",
      "structured_hash",
      "artifact_hash",
      "markdown_hash",
      "export_hash",
      "metadata_hash",
      "section_hashes",
    ]);
    assert.equal(hashes.structured_hash, hashes.artifact_hash);
    assert.equal(hashes.markdown_hash, hashes.export_hash);
    assert.match(hashes.section_hashes.claims, /^sha256:/);
  });

  it("validates claims and timeline events against library paper evidence links", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const missingEvidence = structuredArtifact({
      claims: [
        {
          id: "claim:bad",
          text: "Unsupported claim",
          evidence_refs: ["paper:1:MISSING"],
        },
      ],
      timeline_events: [
        {
          id: "event:bad",
          year: 2026,
          label: "Unsupported event",
          evidence_refs: ["external:vaswani2017"],
        },
      ],
    });

    const result = validateTopicSynthesisArtifact(missingEvidence);

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /paper_evidence|evidence_refs|external/i);
  });

  it("requires digest_ref locators without embedding full digest bodies", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        paper_evidence: [
          {
            id: "paper:1:DETR",
            paper_ref: "1:DETR",
            digest_markdown: "# Full digest body must not be embedded",
            digest_ref: {
              paper_ref: "1:DETR",
              payload_type: "digest-markdown",
            },
          },
        ],
      }),
    );

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /digest_ref|digest_markdown|payload_hash/i);
  });

  it("keeps external references inside external_literature_analysis instead of main timeline evidence nodes", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");
    const validateTopicSynthesisArtifact = requireExport(
      module,
      "validateTopicSynthesisArtifact",
    );

    const result = validateTopicSynthesisArtifact(
      structuredArtifact({
        timeline_events: [
          {
            id: "event:external",
            year: 2017,
            label: "Transformer background",
            evidence_refs: ["external:vaswani2017"],
          },
        ],
      }),
    );

    assert.isFalse(result.ok);
    assert.match(result.errors.join("\n"), /external_literature_analysis|timeline|library paper/i);
  });
});

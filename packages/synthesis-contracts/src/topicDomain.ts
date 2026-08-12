export type SynthesisTopicDefinition = {
  id: string;
  title: string;
  name?: string;
  definition?: string;
  aliases?: string[];
  scope_include?: string[];
  scope_exclude?: string[];
};

export type SynthesisTopicResolverCriteria = {
  and?: string[];
  or?: string[];
  not?: string[];
};

export type SynthesisTopicResolver = {
  paper_refs: string[];
  collection_key: string[];
  tag?: SynthesisTopicResolverCriteria;
  combine: "union" | "intersection";
};

export type SynthesisTopicDigestReference = {
  paper_ref: string;
  payload_type: "digest-markdown";
  note_key?: string;
  path?: string;
  locator?: string;
  payload_hash?: string;
  library_id?: number;
};

export type SynthesisLiteratureQuality = {
  level?: string;
  score?: number;
  reason?: string;
  dimensions?: Record<string, string>;
};

export type SynthesisResolvedPaper = {
  paper_ref: string;
  item_key?: string;
  title?: string;
  year?: string;
  summary?: string;
  synthesis_role?: string;
  match_reasons?: string[];
  authors?: string[];
  role?: string;
  literature_quality?: SynthesisLiteratureQuality;
  context_selection_score?: number;
  caveats?: string[];
  digest_ref?: SynthesisTopicDigestReference;
};

export type SynthesisResolvedPaperSet = {
  papers: SynthesisResolvedPaper[];
};

export type SynthesisTopicRelationType =
  | "target_is_broader_topic_candidate"
  | "target_is_narrower_topic_candidate"
  | "related_topic_candidate"
  | "overlap_topic_candidate"
  | "contrast_topic_candidate";

export type SynthesisConceptCard = {
  label: string;
  aliases: string[];
  concept_type: string;
  domain?: string;
  short_definition?: string;
  definition: string;
  disambiguation?: string;
  topic_relevance: string;
  confidence?: "high" | "medium" | "low";
  evidence?: SynthesisConceptEvidence[];
  relations?: SynthesisConceptRelation[];
};

export type SynthesisConceptEvidence = {
  paper_ref: string;
  quote_or_summary?: string;
  section?: string;
};

export type SynthesisConceptRelation = {
  target_concept_id: string;
  relation: string;
  confidence: "high" | "medium" | "low";
  provenance?: SynthesisConceptEvidence[];
};

export type SynthesisExistingTopicRelationProposal = {
  target_topic_id: string;
  target_topic_title?: string;
  relation_type: SynthesisTopicRelationType;
  confidence: number;
  rationale: string;
  source_paper_refs: string[];
};

export type SynthesisConceptCardsProposal = {
  schema_id?: "synthesis.concept_cards_proposal";
  schema_version?: "1.0.0";
  cards?: SynthesisConceptCard[];
};

export type SynthesisTopicRelationProposals = {
  schema_id?: "synthesis.topic_graph_relation_proposals";
  schema_version?: "1.0.0";
  proposals?: SynthesisExistingTopicRelationProposal[];
};

export type SynthesisTopicInterestMetadata = {
  schema?: "topic_interest_metadata.v1";
  topic_id?: string;
  include_terms?: string[];
  must_have_terms?: string[];
  methods?: string[];
  exclude_terms?: string[];
  seed_literature_item_ids?: string[];
};

export type SynthesisTopicDependencySnapshot = {
  paper_refs: string[];
  paper_artifacts: Record<
    string,
    Record<string, { status: string; hash: string }>
  >;
  missing_artifacts: string[];
};

export type SynthesisTopicReadinessProjection = {
  baseline_input_hash: string;
  baseline_dependencies: SynthesisTopicDependencySnapshot | null;
  current_input_hash: string;
  current_dependencies: SynthesisTopicDependencySnapshot | null;
  baseline_initialized_at: string;
  last_scanned_at: string;
};

export type SynthesisTopicGraphProjection = {
  topic: {
    topic_id: string;
    title: string;
    definition: string;
    artifact_hash: string;
  };
  relations: SynthesisTopicRelationProposals;
};

export type SynthesisTopicDiscoveryProjection = {
  source_paper_refs: string[];
  readiness?: SynthesisTopicReadinessProjection;
};

export type SynthesisTopicProjection = {
  topicGraph?: SynthesisTopicGraphProjection;
  concepts?: SynthesisConceptCardsProposal;
  interestMetadata?: SynthesisTopicInterestMetadata;
  discovery?: SynthesisTopicDiscoveryProjection;
  recommendedUpdate?: {
    actionLabel: "Update";
    freshness:
      | "fresh"
      | "stale"
      | "dirty"
      | "queued"
      | "running"
      | "failed"
      | "unknown";
    sourceMaterialsStatus: "complete" | "partial" | "missing";
    blocked?: boolean;
  };
  freshness:
    | "fresh"
    | "stale"
    | "dirty"
    | "queued"
    | "running"
    | "failed"
    | "unknown";
  source_materials_status: "complete" | "partial" | "missing";
  source_materials_percent: number;
  stale_reasons: string[];
  dirty_reasons: string[];
  missing_sections: string[];
};

export type SynthesisTextSummary = {
  text?: string;
  analysis?: string;
  overview?: string;
  brief?: string;
  report_excerpt?: string;
  key_takeaways?: string[];
};

export type SynthesisTaxonomyRoute = {
  id?: string;
  title?: string;
  definition?: string;
  core_problem?: string;
  mechanism?: string;
  strengths?: string[];
  limitations?: string[];
  maturity?: string;
  representative_papers?: string[];
  source_paper_refs?: string[];
};

export type SynthesisTaxonomyAxis = {
  axis_type:
    | "problem_formulation"
    | "technical_mechanism"
    | "evidence_scope"
    | "research_route"
    | "application_context";
  axis_rationale?: string;
  nodes: SynthesisTaxonomyRoute[];
};

export type SynthesisTaxonomy = {
  summary?: SynthesisTextSummary;
  axes?: SynthesisTaxonomyAxis[];
  nodes?: SynthesisTaxonomyRoute[];
};

export type SynthesisClaim = {
  id?: string;
  text?: string;
  analysis?: string;
  scope?: string;
  applicability?: string;
  limitations?: string[];
  confidence?: string;
  source_paper_refs?: string[];
};

export type SynthesisImprovementDimension = {
  id?: string;
  title?: string;
  analysis?: string;
  source_paper_refs?: string[];
};

export type SynthesisImprovementDimensions = {
  summary: SynthesisTextSummary;
  dimensions: SynthesisImprovementDimension[];
};

export type SynthesisTimelineEvent = {
  id?: string;
  label?: string;
  year?: number;
  description?: string;
  historical_role?: string;
  phase?: string;
  source_paper_refs?: string[];
};

export type SynthesisTimeline = {
  summary: SynthesisTextSummary;
  events: SynthesisTimelineEvent[];
};

export type SynthesisDebate = {
  id?: string;
  title: string;
  current_judgment: string;
  source_paper_refs: string[];
};

export type SynthesisFutureDirection = {
  id?: string;
  title?: string;
  direction_type?:
    | "method_limitation"
    | "evaluation_gap"
    | "data_or_benchmark_need"
    | "application_extension"
    | "theory_or_mechanism_question"
    | "integration_opportunity";
  current_limitation?: string;
  future_direction?: string;
  rationale?: string;
  source_paper_refs?: string[];
};

export type SynthesisWritingStrategy = {
  id?: string;
  title?: string;
  review_thesis?: string;
  writing_strategy?: string;
  section_plan?: string[];
  best_for?: string;
  risks?: string;
  source_paper_refs?: string[];
};

export type SynthesisReviewOutline = {
  topic_importance?: string;
  writing_strategies?: SynthesisWritingStrategy[];
  recommended_strategy_id?: string;
};

export type SynthesisCoverage = {
  verdict?: string;
  reason?: string;
  caveats?: string[];
  external_context_summary?: string;
  suggested_collection_directions?: string[];
};

export type SynthesisStatistics = {
  paper_count?: number;
  time_span?: { earliest: string; latest: string };
  route_coverage?: { routes: number };
  coverage_verdict?: string;
};

export type SynthesisReport = {
  title?: string;
  markdown?: string;
  summary?: string;
  sections?: string[];
};

export type SynthesisArtifactEntry = {
  key?: string;
  path?: string;
  hash?: string;
  skill_id?: string;
  stage_id?: string;
};

export type SynthesisSourceArtifacts = {
  resolver_manifest?: SynthesisArtifactEntry;
  prepare_handoff?: SynthesisArtifactEntry;
  core_handoff?: SynthesisArtifactEntry;
};

export type SynthesisTopicArtifact = {
  topic?: SynthesisTopicDefinition;
  summary?: SynthesisTextSummary;
  taxonomy?: SynthesisTaxonomy;
  improvement_dimensions?: SynthesisImprovementDimensions;
  claims?: SynthesisClaim[];
  timeline_events?: SynthesisTimeline;
  source_papers?: SynthesisResolvedPaper[];
  debates?: SynthesisDebate[];
  coverage?: SynthesisCoverage;
  statistics?: SynthesisStatistics;
  synthesis_report?: SynthesisReport;
  future_directions?: SynthesisFutureDirection[];
  review_outline?: SynthesisReviewOutline;
  source_artifacts?: SynthesisSourceArtifacts;
  diagnostics?: string[];
};

export type SynthesisTopicManifest = {
  schema_id?: string;
  schema_version?: string;
  topic_id?: string;
  operation?: string;
  language?: string;
  sections?: Record<string, SynthesisArtifactEntry>;
  sidecars?: Record<string, SynthesisArtifactEntry>;
};

export type SynthesisTopicRelationProposal = {
  source_topic_id?: string;
  target_topic_id?: string;
  target_title?: string;
  relation?: string;
  confidence?: number;
  evidence_refs?: string[];
};

export type SynthesisTopicMetadata = {
  schema_id?: string;
  schema_version?: string;
  topic_id?: string;
  language?: string;
  updated_at?: string;
  paper_count?: number;
  external_literature_count?: number;
  prospective_topic_relation_proposals?: SynthesisTopicRelationProposal[];
};

export type SynthesisTopicDigestContext = {
  topic_id: string;
  title: string;
  definition: string;
  language: string;
  updated_at: string;
  summary: SynthesisTextSummary;
  paper_count: number;
  external_literature_count: number;
};

export type SynthesisComparisonMatrix = {
  columns?: string[];
  rows?: Array<Record<string, string>>;
};

export type SynthesisTopicSemanticContext = {
  topic_id: string;
  language: string;
  topic_definition: SynthesisTopicDefinition;
  topic_resolver: SynthesisTopicResolver;
  resolved_paper_set: SynthesisResolvedPaperSet;
  prospective_topic_relation_proposals?: SynthesisTopicRelationProposal[];
  topic?: SynthesisTopicDefinition;
  summary?: SynthesisTextSummary;
  taxonomy?: SynthesisTaxonomy;
  comparison_matrix?: SynthesisComparisonMatrix;
  improvement_dimensions?: SynthesisImprovementDimensions;
  claims?: SynthesisClaim[];
  timeline_events?: SynthesisTimeline;
  source_papers?: SynthesisResolvedPaper[];
  debates?: SynthesisDebate[];
  future_directions?: SynthesisFutureDirection[];
  review_outline?: SynthesisReviewOutline;
  synthesis_report?: SynthesisReport;
  markdown?: string;
};

export type SynthesisSourcePaperTriageRecord = {
  paper_ref: string;
  relevance_level?: string;
  relevance_reason?: string;
  core_digest?: string;
  caveats?: string[];
};

export type SynthesisTopicFreshnessDetails = {
  freshness?:
    | "fresh"
    | "stale"
    | "dirty"
    | "queued"
    | "running"
    | "failed"
    | "unknown";
  source_materials_status?: "complete" | "partial" | "missing";
  source_materials_percent?: number;
  stale_reasons?: string[];
  dirty_reasons?: string[];
  missing_sections?: string[];
};

export type SynthesisTopicAuditContext = {
  topic_id: string;
  language: string;
  paths: Record<string, string>;
  current_metadata: SynthesisTopicMetadata;
  current_manifest: SynthesisTopicManifest;
  current_hashes: Record<string, string>;
  section_hashes: Record<string, string>;
  topic_resolver: SynthesisTopicResolver;
  resolved_paper_set: SynthesisResolvedPaperSet;
  source_paper_triage: Record<string, SynthesisSourcePaperTriageRecord>;
  freshness?: SynthesisTopicFreshnessDetails;
  source_materials: {
    status: "complete" | "partial" | "missing";
    percent: number;
  };
};

export type SynthesisDigestArtifact = {
  noteKey?: string;
  payloadHash?: string;
  content?: string;
};

export type SynthesisReferenceEntry = {
  id?: string;
  title?: string;
  year?: string;
  authors?: string[];
  doi?: string;
  url?: string;
  text?: string;
};

export type SynthesisReferencesArtifact = {
  noteKey?: string;
  payloadHash?: string;
  references?: SynthesisReferenceEntry[];
};

export type SynthesisCitationAnalysisItem = {
  id?: string;
  ref_index?: number;
  reference_index?: number;
  index?: number;
  title?: string;
  year?: string;
  function?: string;
  role?: string;
  roles?: string[];
};

export type SynthesisCitationAnalysisArtifact = {
  noteKey?: string;
  payloadHash?: string;
  items?: SynthesisCitationAnalysisItem[];
  citations?: SynthesisCitationAnalysisItem[];
};

export type SynthesisLiteratureScore = {
  score?: number;
  level?: string;
  reason?: string;
  dimensions?: Record<string, number>;
};

export type SynthesisLiteratureMatchingMetadata = {
  schema: "synthesis.literature_matching_metadata.v1";
  key_terms: string[];
  methods: string[];
  problems: string[];
  datasets: string[];
  exclude_terms: string[];
};

export type SynthesisMatchedReference = {
  raw_reference_id?: string;
  canonical_reference_id?: string;
  library_id?: number;
  item_key?: string;
  confidence?: number;
  status?: string;
  reasons?: string[];
};

export type SynthesisWorkflowSource = {
  workflowId?: string;
  runId?: string;
  skillId?: string;
  artifactPath?: string;
};

export type SynthesisTopicResolverDiagnostics = {
  final_count: number;
  warnings: string[];
};

export type SynthesisTopicResultBundle = {
  kind: "topic_synthesis";
  operation: "create" | "update_full" | "update_patch";
  mode?: string;
  language: string;
  base_hashes?: Record<string, string>;
  create_base_hashes_ignored?: boolean;
  topic_id?: string;
  read_section_hashes?: Record<string, string>;
  topic_definition: SynthesisTopicDefinition;
  topic_resolver?: SynthesisTopicResolver;
  resolved_paper_set?: SynthesisResolvedPaperSet;
  resolver_manifest_path?: string;
  artifact_manifest_path?: string;
  resolver_diagnostics?: SynthesisTopicResolverDiagnostics;
  artifact_metadata?: Record<string, string>;
  analysis_manifest_path?: string;
  topic_interest_metadata_path?: string;
  concept_cards_proposal_path?: string;
  topic_graph_relation_proposals_path?: string;
  markdown?: string;
  markdown_path?: string;
  timeline?: SynthesisTimeline;
};

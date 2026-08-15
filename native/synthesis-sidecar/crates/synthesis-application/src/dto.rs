use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use synthesis_canonical_store::CanonicalTopicView;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HostEffectDiagnostic {
    pub code: String,
    pub severity: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub message: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub field: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CacheReadiness {
    pub cache_key: String,
    pub cache_kind: String,
    pub status: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub refreshed_at: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub stale_reason: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum JobProgress {
    Indeterminate {
        #[serde(default, skip_serializing_if = "String::is_empty")]
        label: String,
    },
    Determinate {
        percent: i64,
        current: i64,
        total: i64,
        #[serde(default, skip_serializing_if = "String::is_empty")]
        label: String,
    },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BackgroundJob {
    pub job_id: String,
    pub source: String,
    pub status: String,
    pub label: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub detail: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub updated_at: String,
    pub progress: JobProgress,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkbenchMaintenance {
    pub cache_readiness: Vec<CacheReadiness>,
    pub background_jobs: Vec<BackgroundJob>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WorkbenchChrome {
    pub maintenance: WorkbenchMaintenance,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicAsset {
    pub id: String,
    pub media_type: String,
    pub text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicApplyRequest {
    pub bundle: Value,
    pub assets: Vec<TopicAsset>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicListRequest {
    pub cursor: String,
    pub limit: usize,
}

fn default_topic_limit() -> usize {
    50
}

impl Default for TopicListRequest {
    fn default() -> Self {
        Self {
            cursor: String::new(),
            limit: default_topic_limit(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicDetailRequest {
    pub topic_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicDeleteRequest {
    pub topic_id: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicDeleteStatus {
    Deleted,
    NotFound,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicDeleteResult {
    pub ok: bool,
    pub status: TopicDeleteStatus,
    pub topic_id: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub deleted_path_id: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub reason: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct TopicPurgeResult {
    pub ok: bool,
    pub status: String,
    pub purged_count: usize,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub enum TopicFreshness {
    Fresh,
    Stale,
    Dirty,
    Queued,
    Running,
    Failed,
    Unknown,
}

impl TopicFreshness {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Fresh => "fresh",
            Self::Stale => "stale",
            Self::Dirty => "dirty",
            Self::Queued => "queued",
            Self::Running => "running",
            Self::Failed => "failed",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicSourceMaterialsStatus {
    Complete,
    Partial,
    Missing,
}

impl TopicSourceMaterialsStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Complete => "complete",
            Self::Partial => "partial",
            Self::Missing => "missing",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicDefinitionDto {
    pub id: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub definition: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aliases: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_include: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_exclude: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicResolverTagDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub and: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub or: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub not: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicResolverCombineDto {
    Union,
    Intersection,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicResolverDto {
    pub paper_refs: Vec<String>,
    pub collection_key: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tag: Option<TopicResolverTagDto>,
    pub combine: TopicResolverCombineDto,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicDigestReferenceDto {
    pub paper_ref: String,
    pub payload_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locator: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub library_id: Option<i64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicLiteratureQualityDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<BTreeMap<String, String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResolvedTopicPaperDto {
    pub paper_ref: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub synthesis_role: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub match_reasons: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub literature_quality: Option<TopicLiteratureQualityDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context_selection_score: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub caveats: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub digest_ref: Option<TopicDigestReferenceDto>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResolvedTopicPaperSetDto {
    pub papers: Vec<ResolvedTopicPaperDto>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicRelationProposalDto {
    pub target_topic_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_topic_title: Option<String>,
    pub relation_type: String,
    pub confidence: f64,
    pub rationale: String,
    pub source_paper_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicRelationProposalsDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proposals: Option<Vec<TopicRelationProposalDto>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicGraphProjectionTopicDto {
    pub topic_id: String,
    pub title: String,
    pub definition: String,
    pub artifact_hash: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicGraphProjectionDto {
    pub topic: TopicGraphProjectionTopicDto,
    pub relations: TopicRelationProposalsDto,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicConceptCardDto {
    pub label: String,
    pub aliases: Vec<String>,
    pub concept_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub short_definition: Option<String>,
    pub definition: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disambiguation: Option<String>,
    pub topic_relevance: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub confidence: Option<TopicConceptConfidenceDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub evidence: Option<Vec<TopicConceptEvidenceDto>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub relations: Option<Vec<TopicConceptRelationDto>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicConceptConfidenceDto {
    High,
    Medium,
    Low,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicConceptEvidenceDto {
    pub paper_ref: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quote_or_summary: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicConceptRelationDto {
    pub target_concept_id: String,
    pub relation: String,
    pub confidence: TopicConceptConfidenceDto,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provenance: Option<Vec<TopicConceptEvidenceDto>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicConceptCardsDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cards: Option<Vec<TopicConceptCardDto>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicInterestMetadataDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub topic_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_terms: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub must_have_terms: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub methods: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exclude_terms: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed_literature_item_ids: Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicDependencyArtifactDto {
    pub status: String,
    pub hash: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicDependencySnapshotDto {
    pub paper_refs: Vec<String>,
    pub paper_artifacts: BTreeMap<String, BTreeMap<String, TopicDependencyArtifactDto>>,
    pub missing_artifacts: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicReadinessProjectionDto {
    pub baseline_input_hash: String,
    pub baseline_dependencies: Option<TopicDependencySnapshotDto>,
    pub current_input_hash: String,
    pub current_dependencies: Option<TopicDependencySnapshotDto>,
    pub baseline_initialized_at: String,
    pub last_scanned_at: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicDiscoveryProjectionDto {
    pub source_paper_refs: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub readiness: Option<TopicReadinessProjectionDto>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicProjectionDto {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "topicGraph")]
    pub topic_graph: Option<TopicGraphProjectionDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub concepts: Option<TopicConceptCardsDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "interestMetadata")]
    pub interest_metadata: Option<TopicInterestMetadataDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discovery: Option<TopicDiscoveryProjectionDto>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "recommendedUpdate")]
    pub recommended_update: Option<TopicRecommendedUpdateDto>,
    pub freshness: TopicFreshness,
    pub source_materials_status: TopicSourceMaterialsStatus,
    pub source_materials_percent: i64,
    pub stale_reasons: Vec<String>,
    pub dirty_reasons: Vec<String>,
    pub missing_sections: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicRecommendedUpdateDto {
    pub action_label: String,
    pub freshness: TopicFreshness,
    pub source_materials_status: TopicSourceMaterialsStatus,
    #[serde(default)]
    pub blocked: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicRecord {
    pub topic_id: String,
    pub path_id: String,
    pub title: String,
    pub definition: String,
    pub language: String,
    pub operation: String,
    pub manifest_hash: String,
    pub artifact_hash: String,
    pub metadata_hash: String,
    pub bundle_hash: String,
    pub paper_count: i64,
    pub updated_at: String,
    pub topic_definition: TopicDefinitionDto,
    pub topic_resolver: TopicResolverDto,
    pub resolved_paper_set: ResolvedTopicPaperSetDto,
    pub projection: TopicProjectionDto,
    pub freshness: TopicFreshness,
    pub source_materials_status: TopicSourceMaterialsStatus,
    pub source_materials_percent: i64,
    pub stale_reasons: Vec<String>,
    pub dirty_reasons: Vec<String>,
    pub missing_sections: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicListResult {
    pub topics: Vec<TopicRecord>,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
    pub returned: usize,
    pub total: usize,
    pub limit: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicFindRequest {
    pub paper_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TopicFindRow {
    pub topic_id: String,
    pub title: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub status: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub updated_at: String,
    pub matched_paper_refs: Vec<String>,
    pub match_sources: Vec<String>,
    pub freshness: TopicFreshness,
    pub source_materials_status: TopicSourceMaterialsStatus,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TopicFindDiagnostics {
    pub requested_count: usize,
    pub matched_topic_count: usize,
    pub unmatched_paper_refs: Vec<String>,
    pub source: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub errors: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TopicFindResult {
    pub ok: bool,
    pub status: String,
    pub paper_refs: Vec<String>,
    pub topics: Vec<TopicFindRow>,
    pub diagnostics: TopicFindDiagnostics,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TopicWorkflowFilter {
    All,
    Updatable,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct TopicWorkflowOption {
    pub value: String,
    pub label: String,
    pub description: String,
    pub meta: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct TopicWorkflowOptionsResult {
    pub options: Vec<TopicWorkflowOption>,
    pub diagnostics: Vec<Value>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TopicContextView {
    Digest,
    Semantic,
    Audit,
    Full,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicContextRequest {
    pub topic_id: String,
    pub view: TopicContextView,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct TopicContextResult(pub Value);

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicReportRequest {
    pub topic_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TopicReportResult {
    pub ok: bool,
    pub status: String,
    pub topic_id: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub title: String,
    pub format: String,
    pub markdown: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TopicResolverCombine {
    Union,
    Intersection,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TopicResolverRequest {
    pub tag: Option<Value>,
    pub collection_keys: Vec<String>,
    pub paper_refs: Vec<String>,
    pub combine: TopicResolverCombine,
    pub cursor: usize,
    pub limit: usize,
    pub normalized: Value,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicLibraryItem {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    #[serde(default)]
    pub item_type: String,
    pub title: String,
    #[serde(default)]
    pub year: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub collections: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicLibraryPage {
    pub items: Vec<TopicLibraryItem>,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicLibraryItemsByRef {
    pub items: Vec<TopicLibraryItem>,
    pub missing_paper_refs: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub struct TopicResolverPaper {
    pub paper_ref: String,
    pub item_key: String,
    pub title: String,
    pub year: String,
    pub match_reasons: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct TopicResolverResult {
    pub ok: bool,
    pub errors: Vec<String>,
    pub papers: Vec<TopicResolverPaper>,
    pub normalized_resolver: Value,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
    pub returned: usize,
    pub total: usize,
    pub limit: usize,
    pub diagnostics: Value,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicDiscoveryHintRequest {
    pub hint_id: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct TopicDiscoveryHintResult {
    pub ok: bool,
    pub status: String,
    pub hint: Option<Value>,
    pub diagnostics: Vec<Value>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkbenchSurface {
    Home,
    Topics,
    Index,
    Review,
    Graph,
    Tags,
    Concepts,
    Reader,
}

#[derive(Clone, Debug, PartialEq)]
pub struct WorkbenchSurfaceRequest {
    pub surface: WorkbenchSurface,
    pub state: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct WorkbenchProjection(pub Value);

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum TopicDetailResult {
    Absent {
        #[serde(rename = "topicId")]
        topic_id: String,
        diagnostics: Vec<String>,
    },
    Invalid {
        #[serde(rename = "topicId")]
        topic_id: String,
        diagnostics: Vec<String>,
    },
    Ready {
        #[serde(rename = "topicId")]
        topic_id: String,
        topic: Box<TopicRecord>,
        snapshot: Box<CanonicalTopicView>,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TopicApplyStatus {
    Persisted,
    TopicExists,
    TopicMissing,
    Conflict,
    PatchConflict,
    CanonicalStoreBusy,
    FailedRecovered,
    RepairRequired,
    InvalidRequest,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicApplyResult {
    pub ok: bool,
    pub status: TopicApplyStatus,
    pub topic_id: String,
    pub operation_id: String,
    pub hashes: BTreeMap<String, String>,
    pub mismatches: Vec<Value>,
    pub warnings: Vec<String>,
}

impl TopicApplyResult {
    pub fn failed(status: TopicApplyStatus, topic_id: String, operation_id: String) -> Self {
        Self {
            ok: false,
            status,
            topic_id,
            operation_id,
            hashes: BTreeMap::new(),
            mismatches: Vec::new(),
            warnings: Vec::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PatchOutput {
    pub sections: BTreeMap<String, Value>,
    pub mismatches: Vec<Value>,
}

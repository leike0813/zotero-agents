use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use synthesis_canonical_store::TopicSnapshot;

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
    #[serde(default)]
    pub cursor: String,
    #[serde(default = "default_topic_limit")]
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
    pub topic_definition: Value,
    pub topic_resolver: Value,
    pub resolved_paper_set: Value,
    pub projection: Value,
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
        snapshot: Box<TopicSnapshot>,
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

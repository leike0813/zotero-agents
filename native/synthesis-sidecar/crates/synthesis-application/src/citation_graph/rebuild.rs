use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationGraphRebuildMode {
    Full,
    Incremental,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphCollectionPlan {
    pub mode: CitationGraphRebuildMode,
    pub expected_graph_hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphRebuildMaterial {
    pub input: Value,
    #[serde(default)]
    pub source_ids: Vec<String>,
}

pub struct CitationGraphRebuildAttempt {
    pub(super) operation_id: String,
    pub(super) started_at: String,
    pub(super) plan: CitationGraphCollectionPlan,
    pub(super) cancel: Arc<AtomicBool>,
}

impl CitationGraphRebuildAttempt {
    pub fn plan(&self) -> &CitationGraphCollectionPlan {
        &self.plan
    }
}

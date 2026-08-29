mod admission;
pub mod citation_graph;
pub mod concept_kb;
pub mod debug_maintenance;
pub mod dto;
pub mod durable_bundle;
pub mod knowledge_checkpoint;
pub mod library_snapshot_index;
pub mod ports;
pub mod reference;
pub mod reference_application;
pub mod reference_matching;
pub mod reference_refresh;
pub mod related_items;
pub mod tag_vocabulary;
pub mod topic;
pub mod topic_digest;
pub mod topic_graph;
pub mod webdav_sync;
pub mod workbench;

/// A sidecar-owned gate evaluated immediately before an application promotes
/// a computed replacement into durable state.  Callers use it to surface a
/// cancellation or deadline observed after computation without publishing the
/// stale candidate.
pub type PromotionCheckpoint<'a> = dyn Fn() -> Result<(), String> + 'a;

pub use citation_graph::CitationGraphApplication;
pub use concept_kb::ConceptKbApplication;
pub use debug_maintenance::DebugMaintenanceApplication;
pub use dto::*;
pub use durable_bundle::DurableBundleApplication;
pub use knowledge_checkpoint::KnowledgeCheckpointApplication;
pub use library_snapshot_index::LibrarySnapshotIndexApplication;
pub use ports::*;
pub use reference_application::ReferenceApplication;
pub use reference_matching::ReferenceMatchingApplication;
pub use reference_refresh::ReferenceRefreshApplication;
pub use related_items::RelatedItemsApplication;
pub use tag_vocabulary::TagVocabularyApplication;
pub use topic::{TopicApplication, project_legacy_canonical_topic};
pub use topic_digest::TopicPaperDigestApplication;
pub use topic_graph::TopicGraphApplication;
pub use webdav_sync::WebDavSyncApplication;
pub use workbench::WorkbenchApplication;

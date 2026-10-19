use serde::{Deserialize, de::DeserializeOwned};
use serde_json::{Value, json};
use synthesis_application::tag_audit::{
    TagAuditRunAbortRequest, TagAuditRunAppendRequest, TagAuditRunBeginRequest,
    TagAuditRunPromoteRequest, TagRegulationAcknowledgementPrepareRequest,
    TagRegulationVerifiedCommit,
};
use synthesis_application::tag_vocabulary::{
    TagImportPreview, TagMutationResult, TagSelectionRequest, TagStagedUpdateRequest,
    TagSuggestionStageRequest, TagVocabularyEntryDeleteRequest, TagVocabularyEntryUpdateRequest,
    TagVocabularySaveRequest,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::TagAuditRecord;

use crate::runtime_production_client::{
    ProductionClientCanonicalEffect, ProductionClientRouteEntry,
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TagImportPreviewRequest {
    payload: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TagImportApplyRequest {
    payload: String,
    action: TagImportAction,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum TagImportAction {
    UseImported,
    MergeNonConflicting,
}

impl TagImportAction {
    fn as_str(self) -> &'static str {
        match self {
            Self::UseImported => "use-imported",
            Self::MergeNonConflicting => "merge-non-conflicting",
        }
    }
}

#[derive(serde::Serialize)]
struct TagMutationWire {
    #[serde(flatten)]
    result: TagMutationResult,
    diagnostics: Vec<TagMutationDiagnosticWire>,
    #[serde(rename = "previewDigest", skip_serializing_if = "Option::is_none")]
    preview_digest: Option<String>,
}

#[derive(serde::Serialize)]
struct TagMutationDiagnosticWire {
    code: String,
    severity: &'static str,
}

#[derive(serde::Serialize)]
struct TagImportPreviewWire {
    #[serde(flatten)]
    preview: TagImportPreview,
    #[serde(rename = "previewDigest")]
    preview_digest: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditReplaceRequest {
    library_id: i64,
    entries: Vec<TagAuditReplaceEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditReplaceEntry {
    item_key: String,
    compliant: bool,
    non_compliant_tags: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagAuditClearRequest {
    library_id: i64,
    item_key: String,
}

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;

/// The only production adapter for the public Tag surface.  It deliberately
/// keeps the private vocabulary application as the durable domain owner while
/// preventing the RPC boundary from exposing repository records directly.
pub(crate) const TAG_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.isBuiltinTagPolicyInitialized", |apps, args| {
        no_args(args)?;
        Ok(Value::Bool(apps.tags.is_builtin_policy_initialized()?))
    }),
    ProductionClientRouteEntry::new("client.loadTagVocabulary", |apps, args| {
        no_args(args)?;
        snapshot(apps)
    }),
    ProductionClientRouteEntry::new("client.exportTagVocabularyForRegulator", |apps, args| {
        no_args(args)?;
        wire(apps.tags.export_regulator_tags()?)
    }),
    ProductionClientRouteEntry::new("client.listStagedTagSuggestions", list_staged),
    ProductionClientRouteEntry::new("client.initializeBuiltinTagPolicy", |apps, args| {
        no_args(args)?;
        wire(apps.tags.initialize_public_vocabulary()?)
    }),
    ProductionClientRouteEntry::new("client.saveTagVocabulary", save)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.validateTagVocabulary", validate),
    ProductionClientRouteEntry::new("client.rebuildTagVocabularyIndex", rebuild_index),
    ProductionClientRouteEntry::new("client.stageTagSuggestions", stage),
    ProductionClientRouteEntry::new("client.updateStagedTagSuggestion", update_staged),
    ProductionClientRouteEntry::new("client.updateTagVocabularyEntry", update_entry)
        .with_canonical_effect(ProductionClientCanonicalEffect::Mutated),
    ProductionClientRouteEntry::new("client.deleteTagVocabularyEntry", delete_entry)
        .with_canonical_effect(ProductionClientCanonicalEffect::Mutated),
    ProductionClientRouteEntry::new("client.promoteStagedTagSuggestions", promote)
        .with_canonical_effect(ProductionClientCanonicalEffect::NonEmptyPromotion),
    ProductionClientRouteEntry::new("client.discardStagedTagSuggestions", discard),
    ProductionClientRouteEntry::new("client.clearStagedTagSuggestions", clear_staged),
    ProductionClientRouteEntry::new("client.previewTagVocabularyImport", preview_import),
    ProductionClientRouteEntry::new("client.applyTagVocabularyImport", apply_import)
        .with_canonical_effect(ProductionClientCanonicalEffect::Committed),
    ProductionClientRouteEntry::new("client.replaceTagAuditRecords", replace_audits),
    ProductionClientRouteEntry::new("client.clearTagAuditRecord", clear_audit),
    ProductionClientRouteEntry::new("client.beginTagAuditRun", begin_audit_run),
    ProductionClientRouteEntry::new("client.appendTagAuditRun", append_audit_run),
    ProductionClientRouteEntry::new("client.promoteTagAuditRun", promote_audit_run),
    ProductionClientRouteEntry::new("client.abortTagAuditRun", abort_audit_run),
    ProductionClientRouteEntry::new(
        "client.prepareTagRegulationAcknowledgement",
        prepare_regulation_acknowledgement,
    ),
    ProductionClientRouteEntry::new(
        "client.commitTagRegulationAcknowledgement",
        commit_regulation_acknowledgement,
    ),
];

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

trait TagWireRequest: DeserializeOwned {
    const REQUEST: &'static str;
}

macro_rules! tag_wire_requests {
    ($($kind:ty => $request:literal),* $(,)?) => {$(
        impl TagWireRequest for $kind { const REQUEST: &'static str = $request; }
    )*};
}

tag_wire_requests! {
    TagVocabularySaveRequest => "SaveTagVocabularyRequest",
    TagSuggestionStageRequest => "StageTagSuggestionsRequest",
    TagStagedUpdateRequest => "UpdateStagedTagSuggestionRequest",
    TagVocabularyEntryUpdateRequest => "UpdateTagVocabularyEntryRequest",
    TagVocabularyEntryDeleteRequest => "DeleteTagVocabularyEntryRequest",
    TagSelectionRequest => "PromoteStagedTagSuggestionsRequest",
    TagImportPreviewRequest => "PreviewTagVocabularyImportRequest",
    TagImportApplyRequest => "ApplyTagVocabularyImportRequest",
    TagAuditReplaceRequest => "ReplaceTagAuditRecordsRequest",
    TagAuditClearRequest => "ClearTagAuditRecordRequest",
    TagAuditRunBeginRequest => "BeginTagAuditRunRequest",
    TagAuditRunAppendRequest => "AppendTagAuditRunRequest",
    TagAuditRunPromoteRequest => "PromoteTagAuditRunRequest",
    TagAuditRunAbortRequest => "AbortTagAuditRunRequest",
    TagRegulationAcknowledgementPrepareRequest => "PrepareTagRegulationAcknowledgementRequest",
    TagRegulationVerifiedCommit => "CommitTagRegulationAcknowledgementRequest",
}

fn tag_schema() -> &'static Value {
    static SCHEMA: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    SCHEMA.get_or_init(|| serde_json::from_str(include_str!(
        "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json"
    )).expect("embedded Tag schema"))
}

fn one<T: TagWireRequest>(args: &[Value]) -> Result<T, String> {
    match args {
        [value]
            if crate::runtime_wire_schema::matches(
                tag_schema(),
                &tag_schema()["$defs"][T::REQUEST]["properties"]["args"]["items"],
                value,
            ) =>
        {
            serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into())
        }
        _ => Err("invalid_request".into()),
    }
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn mutation(value: TagMutationResult) -> Result<Value, String> {
    wire(TagMutationWire {
        result: value,
        diagnostics: Vec::new(),
        preview_digest: None,
    })
}

fn snapshot(apps: &ProductionApplications) -> Result<Value, String> {
    wire(apps.tags.load_public_vocabulary()?)
}

fn list_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    wire(apps.tags.list_public_staged()?)
}

fn save(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagVocabularySaveRequest>(args)?;
    mutation(apps.tags.save_public(&request))
}

fn validate(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    wire(apps.tags.validate_public(None)?)
}

fn rebuild_index(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    let expected = apps
        .tags
        .inspect()?
        .vocabulary_hash
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())?;
    let checkpoint = || promotion_checkpoint(apps);
    mutation(
        apps.tags
            .rebuild_index_with_checkpoint(&expected, &checkpoint),
    )
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    checkpoint_current_before_promotion(apps)
}

fn stage(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .stage_public(&one::<TagSuggestionStageRequest>(args)?)?,
    )
}

fn update_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .update_public_staged(&one::<TagStagedUpdateRequest>(args)?)?,
    )
}

fn update_entry(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .update_public_entry(&one::<TagVocabularyEntryUpdateRequest>(args)?)?,
    )
}

fn delete_entry(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .delete_public_entry(&one::<TagVocabularyEntryDeleteRequest>(args)?)?,
    )
}

fn promote(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .promote_public(&one::<TagSelectionRequest>(args)?)?,
    )
}

fn discard(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tags
            .discard_public(&one::<TagSelectionRequest>(args)?)?,
    )
}

fn clear_staged(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    wire(apps.tags.clear_public_staged()?)
}

fn decode_import_payload(payload: &str) -> Result<TagVocabularySaveRequest, String> {
    if payload.len() > 1_048_576 {
        return Err("invalid_request".into());
    }
    serde_json::from_str(payload).map_err(|_| "invalid_request".to_owned())
}

fn preview_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagImportPreviewRequest>(args)?;
    let candidate = decode_import_payload(&request.payload)?;
    wire(TagImportPreviewWire {
        preview: apps.tags.preview_public_import(&candidate)?,
        preview_digest: canonical_json_hash(
            &json!({"payload":request.payload,"candidate":candidate}),
        )?,
    })
}

fn apply_import(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagImportApplyRequest>(args)?;
    let candidate = decode_import_payload(&request.payload)?;
    wire(TagMutationWire {
        result: apps
            .tags
            .apply_public_import(&candidate, request.action.as_str())?,
        diagnostics: Vec::new(),
        preview_digest: Some(canonical_json_hash(&json!({"payload":request.payload}))?),
    })
}

fn replace_audits(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagAuditReplaceRequest>(args)?;
    if request.library_id <= 0 || request.entries.len() > 10_000 {
        return Err("invalid_request".into());
    }
    let records = request
        .entries
        .into_iter()
        .map(|entry| {
            if entry.item_key.trim().is_empty()
                || entry.non_compliant_tags.len() > 10_000
                || entry.non_compliant_tags.iter().any(|tag| tag.is_empty())
            {
                return Err("invalid_request".into());
            }
            Ok(TagAuditRecord {
                library_id: request.library_id,
                item_key: entry.item_key,
                needs_tag_regulation: i64::from(!entry.compliant),
                non_compliant_tags_json: serde_json::to_string(&entry.non_compliant_tags)
                    .map_err(|_| "invalid_request".to_owned())?,
                ..TagAuditRecord::default()
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    if records
        .iter()
        .map(|record| (record.library_id, &record.item_key))
        .collect::<std::collections::HashSet<_>>()
        .len()
        != records.len()
    {
        return Err("invalid_request".into());
    }
    let audited = apps.tags.replace_audits(request.library_id, &records)?;
    Ok(json!({"libraryId":request.library_id,"audited":audited}))
}

fn clear_audit(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one::<TagAuditClearRequest>(args)?;
    if request.library_id <= 0 || request.item_key.is_empty() {
        return Err("invalid_request".into());
    }
    apps.tags
        .clear_audit(request.library_id, &request.item_key)?;
    Ok(json!({"ok":true}))
}

fn begin_audit_run(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let run = apps
        .tag_audits
        .begin(&one::<TagAuditRunBeginRequest>(args)?)?;
    Ok(json!({"outcome":"ready","run":run}))
}

fn append_audit_run(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let outcome = apps
        .tag_audits
        .append(&one::<TagAuditRunAppendRequest>(args)?)?;
    Ok(match outcome {
        synthesis_repository::TagAuditAppendOutcome::Appended { staged_items } => {
            json!({"outcome":"appended","stagedItems":staged_items})
        }
        synthesis_repository::TagAuditAppendOutcome::AlreadyAppended { staged_items } => {
            json!({"outcome":"already_appended","stagedItems":staged_items})
        }
    })
}

fn promote_audit_run(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tag_audits
            .promote(&one::<TagAuditRunPromoteRequest>(args)?)?,
    )
}

fn abort_audit_run(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    wire(
        apps.tag_audits
            .abort(&one::<TagAuditRunAbortRequest>(args)?)?,
    )
}

fn prepare_regulation_acknowledgement(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    wire(
        apps.tag_audits
            .prepare_acknowledgement(&one::<TagRegulationAcknowledgementPrepareRequest>(args)?)?,
    )
}

fn commit_regulation_acknowledgement(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    wire(
        apps.tag_audits
            .commit_acknowledgement(&one::<TagRegulationVerifiedCommit>(args)?)?,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_requests_use_the_production_tag_decoder() {
        let request = json!({"entries":[{"tag":"topic:fixture","facet":"topic"}],"aliases":{},"abbrev":{},"protocol":null});
        assert!(one::<TagVocabularySaveRequest>(std::slice::from_ref(&request)).is_ok());
        let mut invalid = request;
        invalid["entries"][0]["note"] = Value::Null;
        assert!(one::<TagVocabularySaveRequest>(&[invalid]).is_err());
        let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_TAG_REQUEST_CODEC_CASES"),
            std::env::var("SYNTHESIS_TAG_REQUEST_CODEC_RESULTS"),
        ) else {
            return;
        };
        let cases: Vec<Value> =
            serde_json::from_slice(&std::fs::read(cases_path).unwrap()).unwrap();
        assert!(!cases.is_empty());
        let results: Vec<Value> = cases
            .iter()
            .map(|case| {
                let outcome = case["value"]["args"]
                    .as_array()
                    .ok_or_else(|| "invalid_request".to_owned())
                    .and_then(|args| match case["capability"].as_str().unwrap() {
                        "client.saveTagVocabulary" => {
                            one::<TagVocabularySaveRequest>(args).map(|_| ())
                        }
                        "client.stageTagSuggestions" => {
                            one::<TagSuggestionStageRequest>(args).map(|_| ())
                        }
                        "client.updateStagedTagSuggestion" => {
                            one::<TagStagedUpdateRequest>(args).map(|_| ())
                        }
                        "client.updateTagVocabularyEntry" => {
                            one::<TagVocabularyEntryUpdateRequest>(args).map(|_| ())
                        }
                        "client.deleteTagVocabularyEntry" => {
                            one::<TagVocabularyEntryDeleteRequest>(args).map(|_| ())
                        }
                        "client.promoteStagedTagSuggestions"
                        | "client.discardStagedTagSuggestions" => {
                            one::<TagSelectionRequest>(args).map(|_| ())
                        }
                        "client.previewTagVocabularyImport" => {
                            one::<TagImportPreviewRequest>(args).map(|_| ())
                        }
                        "client.applyTagVocabularyImport" => {
                            one::<TagImportApplyRequest>(args).map(|_| ())
                        }
                        "client.replaceTagAuditRecords" => {
                            one::<TagAuditReplaceRequest>(args).map(|_| ())
                        }
                        "client.clearTagAuditRecord" => {
                            one::<TagAuditClearRequest>(args).map(|_| ())
                        }
                        "client.beginTagAuditRun" => {
                            one::<TagAuditRunBeginRequest>(args).map(|_| ())
                        }
                        "client.appendTagAuditRun" => {
                            one::<TagAuditRunAppendRequest>(args).map(|_| ())
                        }
                        "client.promoteTagAuditRun" => {
                            one::<TagAuditRunPromoteRequest>(args).map(|_| ())
                        }
                        "client.abortTagAuditRun" => {
                            one::<TagAuditRunAbortRequest>(args).map(|_| ())
                        }
                        "client.prepareTagRegulationAcknowledgement" => {
                            one::<TagRegulationAcknowledgementPrepareRequest>(args).map(|_| ())
                        }
                        "client.commitTagRegulationAcknowledgement" => {
                            one::<TagRegulationVerifiedCommit>(args).map(|_| ())
                        }
                        _ => panic!("unexpected Tag capability"),
                    });
                json!({"id":case["id"],"accepted":outcome.is_ok(),"reason":outcome.err()})
            })
            .collect();
        std::fs::write(results_path, serde_json::to_vec(&results).unwrap()).unwrap();
        for (case, result) in cases.iter().zip(results) {
            assert_eq!(result["accepted"], case["valid"], "Tag case {}", case["id"]);
        }
    }
}

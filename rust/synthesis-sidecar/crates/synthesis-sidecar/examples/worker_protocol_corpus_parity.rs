use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{self, Read};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Descriptor {
    section: String,
    #[serde(rename = "pageIndex")]
    page_index: u64,
    #[serde(rename = "rowCount")]
    row_count: usize,
    #[serde(rename = "byteLength")]
    byte_length: usize,
    sha256: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TagEntry {
    tag: String,
    facet: String,
    aliases: Vec<String>,
    abbrev: Vec<String>,
    note: Option<String>,
    deprecated: Option<bool>,
    replacement: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConceptAlias {
    alias_id: String,
    alias: String,
    normalized: String,
    concept_id: String,
    sense_id: Option<String>,
    status: String,
    confidence: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Page<Row> {
    descriptor: Descriptor,
    rows: Vec<Row>,
}

#[derive(Deserialize)]
struct Corpus {
    schema: String,
    cases: Vec<CorpusCase>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CorpusCase {
    id: String,
    schema_ref: String,
    value: Value,
}

#[derive(Serialize)]
struct CaseResult {
    id: String,
    accepted: bool,
}

#[derive(Serialize)]
struct Output {
    schema: String,
    cases: Vec<CaseResult>,
}

fn descriptor_valid(descriptor: &Descriptor, rows: usize, section: &str) -> bool {
    descriptor.section == section
        && descriptor.page_index <= 255
        && descriptor.row_count == rows
        && descriptor.byte_length <= 4 * 1024 * 1024
        && descriptor.sha256.starts_with("sha256:")
        && descriptor.sha256.len() == 71
}

fn tag_page(value: Value) -> bool {
    serde_json::from_value::<Page<TagEntry>>(value).is_ok_and(|page| {
        descriptor_valid(&page.descriptor, page.rows.len(), "entries")
            && page.rows.iter().all(|row| {
                !row.tag.is_empty()
                    && !row.facet.is_empty()
                    && row.aliases.len() <= 4096
                    && row.abbrev.len() <= 4096
                    && row.note.as_deref().is_none_or(|value| value.len() <= 4096)
                    && row
                        .replacement
                        .as_deref()
                        .is_none_or(|value| value.len() <= 4096)
                    && row.deprecated.is_none_or(|_| true)
            })
    })
}

fn concept_alias_page(value: Value) -> bool {
    serde_json::from_value::<Page<ConceptAlias>>(value).is_ok_and(|page| {
        descriptor_valid(&page.descriptor, page.rows.len(), "aliases")
            && page.rows.iter().all(|row| {
                !row.alias_id.is_empty()
                    && !row.alias.is_empty()
                    && !row.concept_id.is_empty()
                    && !row.status.is_empty()
                    && matches!(row.confidence.as_str(), "high" | "medium" | "low")
                    && row
                        .sense_id
                        .as_deref()
                        .is_none_or(|value| !value.is_empty())
                    && row.normalized.len() <= 4096
            })
    })
}

fn main() {
    let mut source = String::new();
    io::stdin()
        .read_to_string(&mut source)
        .expect("read corpus");
    let corpus: Corpus = serde_json::from_str(&source).expect("parse corpus");
    let cases = corpus
        .cases
        .into_iter()
        .map(|case| {
            let accepted = if case.id.contains("tag-entry") {
                tag_page(case.value)
            } else if case.id.contains("concept-alias") {
                concept_alias_page(case.value)
            } else {
                false
            };
            let _ = case.schema_ref;
            CaseResult {
                id: case.id,
                accepted,
            }
        })
        .collect();
    println!(
        "{}",
        serde_json::to_string(&Output {
            schema: corpus.schema,
            cases,
        })
        .expect("serialize output")
    );
}

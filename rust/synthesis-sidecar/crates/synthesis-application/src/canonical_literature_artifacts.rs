//! Strict native decoder for the versioned literature artifact contract.
//!
//! The JSON Schemas in the TypeScript contract-set remain the schema owner.
//! These serde DTOs deliberately mirror that closed wire shape so the native
//! application can reject aliases and storage wrappers before projection.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;

pub const SOURCE_REFERENCE_ARTIFACT_SCHEMA: &str = "source_reference_artifact.v1";
pub const CITATION_ANALYSIS_ARTIFACT_SCHEMA: &str = "citation_analysis_artifact.v1";
pub const LITERATURE_SCORE_ARTIFACT_SCHEMA: &str = "literature_score.v1";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceReferenceArtifact {
    pub schema: String,
    pub references: Vec<SourceReference>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceReference {
    pub source_reference_id: String,
    pub extraction: Option<SourceReferenceExtraction>,
    pub bibliography: SourceReferenceBibliography,
    pub matching: SourceReferenceMatching,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceReferenceExtraction {
    pub raw: String,
    pub confidence: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceReferenceBibliography {
    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<i64>,
    pub publication_title: Option<String>,
    pub conference_name: Option<String>,
    pub university: Option<String>,
    #[serde(rename = "archiveID")]
    pub archive_id: Option<String>,
    pub volume: Option<String>,
    pub issue: Option<String>,
    pub pages: Option<String>,
    pub place: Option<String>,
    pub num_pages: Option<i64>,
    pub publisher: Option<String>,
    pub item_type: Option<String>,
    pub date: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceReferenceMatching {
    #[serde(rename = "DOI")]
    pub doi: Option<String>,
    pub url: Option<String>,
    #[serde(rename = "ISBN")]
    pub isbn: Option<String>,
    #[serde(rename = "ISSN")]
    pub issn: Option<String>,
    pub citekey: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct LiteratureScoreArtifact {
    pub schema: String,
    pub rubric_id: String,
    pub paper_type: String,
    pub paper_type_reason: String,
    pub overall_score: f64,
    pub confidence: f64,
    pub confidence_adjusted_score: f64,
    pub dimensions: Vec<LiteratureScoreDimension>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct LiteratureScoreDimension {
    pub dimension_key: String,
    pub name: String,
    pub configured_weight: f64,
    pub effective_weight: f64,
    pub raw_score: u64,
    pub applicable_max_score: u64,
    pub score: Option<f64>,
    pub confidence: Option<f64>,
    pub summary: String,
    pub criteria: Vec<LiteratureScoreCriterion>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct LiteratureScoreCriterion {
    pub criterion_key: String,
    pub name: String,
    pub status: String,
    pub score: Option<i64>,
    pub max_score: u64,
    pub reason: String,
    pub evidence: Vec<LiteratureScoreEvidence>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct LiteratureScoreEvidence {
    pub line_start: u64,
    pub line_end: u64,
    pub quote: String,
}

fn score_in_range(value: f64, minimum: f64, maximum: f64) -> bool {
    value.is_finite() && (minimum..=maximum).contains(&value)
}

pub fn parse_literature_score_artifact(value: &Value) -> Result<LiteratureScoreArtifact, String> {
    let artifact: LiteratureScoreArtifact =
        serde_json::from_value(value.clone()).map_err(|_| "literature_score_artifact_invalid")?;
    if artifact.schema != LITERATURE_SCORE_ARTIFACT_SCHEMA {
        return Err("literature_score_artifact_schema_invalid".into());
    }
    if artifact.rubric_id.trim().is_empty() || artifact.paper_type_reason.trim().is_empty() {
        return Err("literature_score_required_text_invalid".into());
    }
    if !matches!(
        artifact.paper_type.as_str(),
        "empirical" | "review" | "theoretical" | "qualitative" | "mixed_methods" | "other"
    ) {
        return Err("literature_score_paper_type_invalid".into());
    }
    if !score_in_range(artifact.overall_score, 0.0, 100.0)
        || !score_in_range(artifact.confidence, 0.0, 1.0)
        || !score_in_range(artifact.confidence_adjusted_score, 0.0, 100.0)
        || artifact.dimensions.len() != 6
    {
        return Err("literature_score_summary_invalid".into());
    }
    for dimension in &artifact.dimensions {
        if dimension.dimension_key.trim().is_empty()
            || dimension.name.trim().is_empty()
            || dimension.summary.trim().is_empty()
            || !score_in_range(dimension.configured_weight, 0.0, 1.0)
            || !score_in_range(dimension.effective_weight, 0.0, 1.0)
            || dimension
                .score
                .is_some_and(|value| !score_in_range(value, 0.0, 100.0))
            || dimension
                .confidence
                .is_some_and(|value| !score_in_range(value, 0.0, 1.0))
            || dimension.criteria.is_empty()
        {
            return Err("literature_score_dimension_invalid".into());
        }
        for criterion in &dimension.criteria {
            if criterion.criterion_key.trim().is_empty()
                || criterion.name.trim().is_empty()
                || criterion.reason.trim().is_empty()
                || !matches!(criterion.status.as_str(), "scored" | "not_applicable")
                || criterion.score.is_some_and(|value| value < 0)
                || criterion.max_score == 0
            {
                return Err("literature_score_criterion_invalid".into());
            }
            for evidence in &criterion.evidence {
                if evidence.line_start == 0
                    || evidence.line_end == 0
                    || evidence.quote.is_empty()
                    || evidence.quote.chars().count() > 500
                {
                    return Err("literature_score_evidence_invalid".into());
                }
            }
        }
    }
    Ok(artifact)
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationFunction {
    Background,
    Baseline,
    Contrast,
    Component,
    Dataset,
    Tooling,
    Historical,
    Uncategorized,
}

impl CitationFunction {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Background => "background",
            Self::Baseline => "baseline",
            Self::Contrast => "contrast",
            Self::Component => "component",
            Self::Dataset => "dataset",
            Self::Tooling => "tooling",
            Self::Historical => "historical",
            Self::Uncategorized => "uncategorized",
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationAnalysisArtifact {
    pub schema: String,
    pub meta: CitationMeta,
    pub summary: String,
    pub timeline: CitationTimeline,
    pub items: Vec<CitationItem>,
    pub unresolved: Vec<CitationUnresolvedMention>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationMeta {
    pub language: String,
    pub scope: CitationScope,
    pub scope_source: Option<String>,
    pub scope_decision: CitationScopeDecision,
    pub mapping_reliability: String,
    pub reference_extraction: CitationReferenceExtractionStatus,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationScope {
    pub section_title: Option<String>,
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationScopeDecision {
    pub selection_reason: Option<String>,
    pub covered_sections: Vec<String>,
    pub fallback_from: Option<CitationScope>,
    pub fallback_reason: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationReferenceExtractionStatus {
    pub status: String,
    pub reason: Option<String>,
    pub file_quality_low: Option<bool>,
    pub triggered_signals: Option<Vec<String>>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationTimeline {
    pub early: CitationTimelineBucket,
    pub mid: CitationTimelineBucket,
    pub recent: CitationTimelineBucket,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationTimelineBucket {
    pub summary: String,
    pub source_reference_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationItem {
    pub source_reference_id: String,
    pub function: Option<CitationFunction>,
    #[serde(rename = "role_in_context")]
    pub role_in_context: Option<String>,
    pub topic: Option<String>,
    pub usage: Option<String>,
    pub keywords: Vec<String>,
    pub summary: Option<String>,
    #[serde(rename = "key_reference_reason")]
    pub key_reference_reason: Option<String>,
    pub confidence: Option<f64>,
    pub mentions: Vec<CitationMention>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationMention {
    pub mention_id: String,
    pub marker: Option<String>,
    pub style: Option<String>,
    pub line_start: Option<u64>,
    pub line_end: Option<u64>,
    pub snippet: Option<String>,
    pub ref_number_hint: Option<u64>,
    pub year_hint: Option<i64>,
    pub surname_hint: Option<String>,
    pub citation_label_hint: Option<String>,
    pub citekey_hint: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub struct CitationUnresolvedMention {
    #[serde(flatten)]
    pub mention: CitationMention,
    pub reason: Option<String>,
}

fn required_text(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("canonical_artifact_{field}_empty"))
    } else {
        Ok(())
    }
}

fn validate_source_artifact(
    value: SourceReferenceArtifact,
) -> Result<SourceReferenceArtifact, String> {
    if value.schema != SOURCE_REFERENCE_ARTIFACT_SCHEMA {
        return Err("source_reference_artifact_schema_invalid".into());
    }
    let mut ids = HashSet::new();
    for reference in &value.references {
        required_text(&reference.source_reference_id, "source_reference_id")?;
        if !ids.insert(reference.source_reference_id.as_str()) {
            return Err("source_reference_id_duplicate".into());
        }
        if let Some(extraction) = &reference.extraction
            && extraction
                .confidence
                .is_some_and(|value| !(0.0..=1.0).contains(&value))
        {
            return Err("source_reference_extraction_confidence_invalid".into());
        }
        if reference
            .bibliography
            .num_pages
            .is_some_and(|value| value < 0)
        {
            return Err("source_reference_num_pages_invalid".into());
        }
    }
    Ok(value)
}

pub fn parse_source_reference_artifact(value: &Value) -> Result<SourceReferenceArtifact, String> {
    validate_source_artifact(
        serde_json::from_value(value.clone()).map_err(|_| "source_reference_artifact_invalid")?,
    )
}

pub fn parse_citation_analysis_artifact(value: &Value) -> Result<CitationAnalysisArtifact, String> {
    let artifact: CitationAnalysisArtifact =
        serde_json::from_value(value.clone()).map_err(|_| "citation_analysis_artifact_invalid")?;
    if artifact.schema != CITATION_ANALYSIS_ARTIFACT_SCHEMA {
        return Err("citation_analysis_artifact_schema_invalid".into());
    }
    if artifact.meta.mapping_reliability != "normal"
        && artifact.meta.mapping_reliability != "reduced"
    {
        return Err("citation_mapping_reliability_invalid".into());
    }
    if artifact.meta.reference_extraction.status != "completed"
        && artifact.meta.reference_extraction.status != "abandoned"
    {
        return Err("citation_reference_extraction_status_invalid".into());
    }
    let mut mention_ids = HashSet::new();
    for item in &artifact.items {
        required_text(&item.source_reference_id, "citation_source_reference_id")?;
        for mention in &item.mentions {
            required_text(&mention.mention_id, "citation_mention_id")?;
            if !mention_ids.insert(mention.mention_id.as_str()) {
                return Err("citation_mention_id_duplicate".into());
            }
        }
        if item
            .confidence
            .is_some_and(|value| !(0.0..=1.0).contains(&value))
        {
            return Err("citation_confidence_invalid".into());
        }
    }
    for unresolved in &artifact.unresolved {
        required_text(&unresolved.mention.mention_id, "citation_mention_id")?;
        if !mention_ids.insert(unresolved.mention.mention_id.as_str()) {
            return Err("citation_mention_id_duplicate".into());
        }
    }
    Ok(artifact)
}

pub fn validate_citation_against_references(
    citation: &CitationAnalysisArtifact,
    references: &SourceReferenceArtifact,
) -> Result<(), String> {
    let ids = references
        .references
        .iter()
        .map(|reference| reference.source_reference_id.as_str())
        .collect::<HashSet<_>>();
    if citation
        .items
        .iter()
        .map(|item| item.source_reference_id.as_str())
        .chain(
            citation
                .timeline
                .early
                .source_reference_ids
                .iter()
                .map(String::as_str),
        )
        .chain(
            citation
                .timeline
                .mid
                .source_reference_ids
                .iter()
                .map(String::as_str),
        )
        .chain(
            citation
                .timeline
                .recent
                .source_reference_ids
                .iter()
                .map(String::as_str),
        )
        .any(|id| !ids.contains(id))
    {
        return Err("citation_source_reference_linkage_invalid".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn references() -> Value {
        json!({
            "schema": SOURCE_REFERENCE_ARTIFACT_SCHEMA,
            "references": [{
                "sourceReferenceId": "source-reference-1",
                "extraction": {"raw": "Doe (2024)", "confidence": 0.9},
                "bibliography": {"title": "Example", "authors": ["Doe"], "year": 2024},
                "matching": {"DOI": "10.1234/example"}
            }]
        })
    }

    fn citation() -> Value {
        json!({
            "schema": CITATION_ANALYSIS_ARTIFACT_SCHEMA,
            "meta": {
                "language": "en",
                "scope": {"section_title": null, "line_start": null, "line_end": null},
                "scope_source": null,
                "scope_decision": {
                    "selection_reason": null,
                    "covered_sections": [],
                    "fallback_from": null,
                    "fallback_reason": null
                },
                "mapping_reliability": "normal",
                "reference_extraction": {"status": "completed"}
            },
            "summary": "",
            "timeline": {
                "early": {"summary": "", "sourceReferenceIds": []},
                "mid": {"summary": "", "sourceReferenceIds": []},
                "recent": {"summary": "", "sourceReferenceIds": ["source-reference-1"]}
            },
            "items": [{
                "sourceReferenceId": "source-reference-1",
                "function": "background",
                "role_in_context": "sets context",
                "topic": null,
                "usage": null,
                "keywords": [],
                "summary": null,
                "key_reference_reason": null,
                "confidence": 0.8,
                "mentions": []
            }],
            "unresolved": []
        })
    }

    #[test]
    fn decodes_closed_reference_and_citation_contracts() {
        let references = parse_source_reference_artifact(&references()).expect("references");
        let citation = parse_citation_analysis_artifact(&citation()).expect("citation");
        validate_citation_against_references(&citation, &references).expect("linked citation");
    }

    #[test]
    fn rejects_aliases_and_unknown_source_ids() {
        let mut value = references();
        value["references"][0]["title"] = json!("alias");
        assert!(parse_source_reference_artifact(&value).is_err());
        let mut citation = citation();
        citation["items"][0]["sourceReferenceId"] = json!("missing");
        let parsed = parse_citation_analysis_artifact(&citation).expect("citation shape");
        let references = parse_source_reference_artifact(&references()).expect("references");
        assert!(validate_citation_against_references(&parsed, &references).is_err());
    }

    #[test]
    fn decodes_full_literature_score_with_criteria_and_evidence() {
        let dimensions = (0..6)
            .map(|index| {
                json!({
                    "dimension_key": format!("dimension-{index}"),
                    "name": "Dimension",
                    "configured_weight": 0.5,
                    "effective_weight": 0.5,
                    "raw_score": 1,
                    "applicable_max_score": 2,
                    "score": 50,
                    "confidence": 0.8,
                    "summary": "Evidence summary",
                    "criteria": [{
                        "criterion_key": "criterion-1",
                        "name": "Criterion",
                        "status": "scored",
                        "score": 1,
                        "max_score": 2,
                        "reason": "Evidence is sufficient",
                        "evidence": [{
                            "line_start": 1,
                            "line_end": 2,
                            "quote": "A source quote"
                        }]
                    }]
                })
            })
            .collect::<Vec<_>>();
        let value = json!({
            "schema": LITERATURE_SCORE_ARTIFACT_SCHEMA,
            "rubric_id": "rubric-v1",
            "paper_type": "empirical",
            "paper_type_reason": "The paper reports an empirical study.",
            "overall_score": 50,
            "confidence": 0.8,
            "confidence_adjusted_score": 40,
            "dimensions": dimensions
        });
        assert!(parse_literature_score_artifact(&value).is_ok());
        let mut invalid = value;
        invalid["dimensions"][0]["criteria"][0]["evidence"][0]["extra"] = json!(true);
        assert!(parse_literature_score_artifact(&invalid).is_err());
    }
}

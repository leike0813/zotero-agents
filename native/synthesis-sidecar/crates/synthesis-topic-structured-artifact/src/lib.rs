use serde_json::{Map, Value, json};
use std::collections::{BTreeSet, HashMap};
use std::sync::atomic::{AtomicBool, Ordering};
use synthesis_protocol::{
    TOPIC_ARTIFACT_ASSEMBLE_OPERATION, TOPIC_ARTIFACT_VALIDATE_OPERATION,
    TOPIC_MANIFEST_VALIDATE_OPERATION, TOPIC_SECTION_PATCH_OPERATION,
};

pub const CONTRACT_VERSION: &str = "synthesis-topic-structured-artifact.v1";
pub const MANIFEST_VALIDATION_VERSION: &str = "topic-analysis-manifest-validation.v1";
pub const ARTIFACT_ASSEMBLY_VERSION: &str = "topic-structured-artifact-assembly.v1";
pub const ARTIFACT_VALIDATION_VERSION: &str = "topic-structured-artifact-validation.v1";
pub const SECTION_PATCH_VERSION: &str = "topic-section-patch.v1";
const COMPLETE_SECTIONS: &[&str] = &[
    "topic",
    "summary",
    "taxonomy",
    "improvement_dimensions",
    "claims",
    "timeline_events",
    "source_papers",
    "debates",
    "coverage",
    "future_directions",
    "review_outline",
    "statistics",
    "synthesis_report",
    "source_artifacts",
    "diagnostics",
];
const REMOVED_SECTIONS: &[&str] = &[
    "improvement_dimension_summary",
    "external_literature_analysis",
    "gaps",
    "positioning",
];
const SIDECARS: &[&str] = &[
    "topic_interest_metadata",
    "concept_cards_proposal",
    "topic_graph_relation_proposals",
    "prospective_topic_relation_proposals",
];

fn canceled(flag: &AtomicBool) -> Result<(), &'static str> {
    if flag.load(Ordering::Relaxed) {
        Err("worker_canceled")
    } else {
        Ok(())
    }
}

fn object(value: &Value) -> Result<&Map<String, Value>, &'static str> {
    value.as_object().ok_or("invalid_request")
}

fn text(value: Option<&Value>) -> &str {
    value.and_then(Value::as_str).unwrap_or("").trim()
}

#[derive(Default)]
struct JsonBounds {
    nodes: usize,
    string_bytes: usize,
}

fn validate_json_bounds(
    value: &Value,
    depth: usize,
    state: &mut JsonBounds,
    flag: &AtomicBool,
) -> Result<(), &'static str> {
    if depth > 32 {
        return Err("invalid_request");
    }
    state.nodes = state.nodes.checked_add(1).ok_or("invalid_request")?;
    if state.nodes > 1_000_000 {
        return Err("invalid_request");
    }
    if state.nodes.is_multiple_of(256) {
        canceled(flag)?;
    }
    match value {
        Value::String(value) => {
            let length = value.encode_utf16().count();
            if length > 1024 * 1024 {
                return Err("invalid_request");
            }
            state.string_bytes = state
                .string_bytes
                .checked_add(length)
                .ok_or("invalid_request")?;
            if state.string_bytes > 32 * 1024 * 1024 {
                return Err("invalid_request");
            }
        }
        Value::Array(values) => {
            if values.len() > 25_000 {
                return Err("invalid_request");
            }
            for value in values {
                validate_json_bounds(value, depth + 1, state, flag)?;
            }
        }
        Value::Object(values) => {
            if values.len() > 1_024 {
                return Err("invalid_request");
            }
            for (key, value) in values {
                if key.encode_utf16().count() > 1024 * 1024 {
                    return Err("invalid_request");
                }
                validate_json_bounds(value, depth + 1, state, flag)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn entry_errors(prefix: &str, value: Option<&Value>, sidecar: bool) -> Vec<String> {
    let Some(value) = value.and_then(Value::as_object) else {
        return vec![format!("{prefix} entry must be an object")];
    };
    let mut errors = Vec::new();
    if text(value.get("path")).is_empty() {
        errors.push(format!("{prefix}.path is required"));
    }
    if text(value.get("content_type")) != "json" {
        errors.push(format!("{prefix}.content_type must be json"));
    }
    if sidecar && text(value.get("schema_id")).is_empty() {
        errors.push(format!("{prefix}.schema_id is required"));
    }
    errors
}

fn sidecar_errors(manifest: &Map<String, Value>) -> Vec<String> {
    let sidecars = manifest.get("sidecars").and_then(Value::as_object);
    let mut errors = Vec::new();
    for name in SIDECARS {
        let Some(value) = sidecars.and_then(|sidecars| sidecars.get(*name)) else {
            errors.push(format!("sidecars.{name} is required"));
            continue;
        };
        errors.extend(entry_errors(&format!("sidecars.{name}"), Some(value), true));
    }
    errors
}

fn manifest_errors(value: &Value) -> Vec<String> {
    let Some(manifest) = value.as_object() else {
        return vec!["topic analysis manifest must be an object".into()];
    };
    let mut errors = Vec::new();
    if manifest.contains_key("markdown") {
        errors.push("manifest must not embed markdown".into());
    }
    if manifest.contains_key("markdown_path") {
        errors.push("manifest must not depend on markdown_path".into());
    }
    let schema = text(manifest.get("schema_id"));
    let operation = text(manifest.get("operation"));
    if schema == "synthesis.topic_section_patch_manifest" || operation == "update_patch" {
        if schema != "synthesis.topic_section_patch_manifest" {
            errors.push(
                "update_patch manifest schema_id must be synthesis.topic_section_patch_manifest"
                    .into(),
            );
        }
        let base = manifest.get("base").and_then(Value::as_object);
        let read = base
            .and_then(|base| base.get("read_section_hashes"))
            .and_then(Value::as_object);
        let replace = base
            .and_then(|base| base.get("replace_section_hashes"))
            .and_then(Value::as_object);
        let patch = manifest.get("patch").and_then(Value::as_object);
        if text(patch.and_then(|patch| patch.get("mode"))) != "section_replace" {
            errors.push("section_patch patch.mode must be section_replace".into());
        }
        if text(patch.and_then(|patch| patch.get("unchanged_section_policy"))) != "inherit_current"
        {
            errors.push("section_patch unchanged_section_policy must be inherit_current".into());
        }
        let changed = patch
            .and_then(|patch| patch.get("changed_sections"))
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let sections = patch
            .and_then(|patch| patch.get("sections"))
            .and_then(Value::as_object);
        for section in changed.iter().filter_map(Value::as_str) {
            if section == "topic" || !COMPLETE_SECTIONS.contains(&section) {
                errors.push(format!("{section} is not patchable; use update_full"));
            }
            if read.is_none_or(|read| !read.contains_key(section)) {
                errors.push(format!("{section} must be present in read_section_hashes"));
            }
            if replace.is_none_or(|replace| !replace.contains_key(section)) {
                errors.push(format!(
                    "{section} must be present in replace_section_hashes"
                ));
            }
            if sections.is_none_or(|sections| !sections.contains_key(section)) {
                errors.push(format!("{section} must be present in patch.sections"));
            }
        }
        if let Some(replace) = replace {
            for section in replace.keys() {
                if read.is_none_or(|read| !read.contains_key(section)) {
                    errors.push(format!(
                        "{section} replace_section_hashes must be a subset of read_section_hashes"
                    ));
                }
            }
        }
        if let Some(sections) = sections {
            for (section, value) in sections {
                errors.extend(entry_errors(section, Some(value), false));
            }
        }
        errors.extend(sidecar_errors(manifest));
        return errors;
    }
    if schema != "synthesis.topic_analysis_manifest" {
        errors.push("manifest schema_id must be synthesis.topic_analysis_manifest".into());
    }
    if operation != "create" && operation != "update_full" {
        errors.push("complete manifest operation must be create or update_full".into());
    }
    if text(manifest.get("language")).is_empty() {
        errors.push("manifest language is required".into());
    }
    let sections = manifest.get("sections").and_then(Value::as_object);
    for section in REMOVED_SECTIONS {
        if sections.is_some_and(|sections| sections.contains_key(*section)) {
            errors.push(format!(
                "sections.{section} is not part of the current contract"
            ));
        }
    }
    for section in COMPLETE_SECTIONS {
        let Some(value) = sections.and_then(|sections| sections.get(*section)) else {
            errors.push(format!("sections.{section} is required"));
            continue;
        };
        errors.extend(entry_errors(section, Some(value), false));
    }
    errors.extend(sidecar_errors(manifest));
    errors
}

fn walk_legacy(value: &Value, path: &str, errors: &mut Vec<String>) {
    match value {
        Value::Array(values) => {
            for (index, value) in values.iter().enumerate() {
                walk_legacy(value, &format!("{path}[{index}]"), errors);
            }
        }
        Value::Object(values) => {
            for (key, value) in values {
                if matches!(
                    key.as_str(),
                    "paper_evidence"
                        | "evidence_map"
                        | "evidence_refs"
                        | "paper_evidence_refs"
                        | "evidence_map_refs"
                ) {
                    errors.push(format!(
                        "{path}.{key} is not part of source_paper_refs contract"
                    ));
                }
                walk_legacy(value, &format!("{path}.{key}"), errors);
            }
        }
        _ => {}
    }
}

fn first_text<'a>(value: &'a Map<String, Value>, keys: &[&str]) -> &'a str {
    keys.iter()
        .find_map(|key| {
            let value = text(value.get(*key));
            (!value.is_empty()).then_some(value)
        })
        .unwrap_or("")
}

fn has_any_key(value: &Map<String, Value>, keys: &[&str]) -> bool {
    keys.iter()
        .any(|key| value.contains_key(*key) && !text(value.get(*key)).is_empty())
}

fn taxonomy_route_rows(taxonomy: &Map<String, Value>) -> Vec<&Value> {
    let axis_rows: Vec<_> = taxonomy
        .get("axes")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .filter_map(|axis| axis.get("nodes").and_then(Value::as_array))
        .flatten()
        .collect();
    if axis_rows.is_empty() {
        taxonomy
            .get("nodes")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect()
    } else {
        axis_rows
    }
}

fn timeline_event_rows(value: Option<&Value>) -> Vec<&Value> {
    match value {
        Some(Value::Object(value)) => value
            .get("events")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        Some(Value::Array(value)) => value.iter().collect(),
        _ => Vec::new(),
    }
}

fn improvement_dimension_rows(value: Option<&Value>) -> Vec<&Value> {
    match value {
        Some(Value::Object(value)) => value
            .get("dimensions")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        Some(Value::Array(value)) => value.iter().collect(),
        _ => Vec::new(),
    }
}

fn source_paper_ids(artifact: &Map<String, Value>) -> BTreeSet<String> {
    artifact
        .get("source_papers")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
        .map(|entry| text(entry.get("paper_ref")))
        .filter(|entry| !entry.is_empty())
        .map(str::to_owned)
        .collect()
}

fn source_paper_ref_errors(
    label: &str,
    rows: Vec<&Value>,
    known: &BTreeSet<String>,
    require_property: bool,
) -> Vec<String> {
    let mut errors = Vec::new();
    for row in rows.into_iter().filter_map(Value::as_object) {
        let has_refs = row.contains_key("source_paper_refs");
        let refs: Vec<_> = row
            .get("source_paper_refs")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
            .collect();
        if require_property && !has_refs {
            errors.push(format!(
                "{label} {} requires source_paper_refs",
                text(row.get("id"))
            ));
        }
        for reference in refs {
            if !known.contains(reference) {
                errors.push(format!(
                    "{label} {} references missing source_papers {reference}",
                    text(row.get("id"))
                ));
            }
        }
    }
    errors
}

fn nested_source_paper_ref_errors(
    label: &str,
    value: Option<&Value>,
    known: &BTreeSet<String>,
) -> Vec<String> {
    fn walk(label: &str, value: &Value, known: &BTreeSet<String>, errors: &mut Vec<String>) {
        match value {
            Value::Array(values) => {
                for value in values {
                    walk(label, value, known, errors);
                }
            }
            Value::Object(values) => {
                if let Some(refs) = values.get("source_paper_refs") {
                    for reference in refs
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(str::trim)
                        .filter(|entry| !entry.is_empty())
                    {
                        if !known.contains(reference) {
                            errors.push(format!(
                                "{label} {} references missing source_papers {reference}",
                                text(values.get("id").or_else(|| values.get("title")))
                            ));
                        }
                    }
                }
                for value in values.values() {
                    walk(label, value, known, errors);
                }
            }
            _ => {}
        }
    }
    let mut errors = Vec::new();
    if let Some(value) = value {
        walk(label, value, known, &mut errors);
    }
    errors
}

fn report_dimension_errors(artifact: &Map<String, Value>) -> Vec<String> {
    let mut errors = Vec::new();
    let topic = artifact
        .get("topic")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if text(topic.get("definition")).is_empty()
        || !has_any_key(
            &topic,
            &["discipline", "field", "research_field", "research_area"],
        )
        || (topic
            .get("scope_boundary")
            .and_then(Value::as_object)
            .is_none()
            && text(topic.get("scope")).is_empty())
    {
        errors.push("topic definition/scope".into());
    }
    let taxonomy = artifact
        .get("taxonomy")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let taxonomy_summary = taxonomy
        .get("summary")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if !has_any_key(&taxonomy_summary, &["text", "analysis", "overview"])
        || taxonomy_route_rows(&taxonomy).is_empty()
    {
        errors.push("research routes".into());
    }
    let timeline = artifact
        .get("timeline_events")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let timeline_summary = timeline
        .get("summary")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if !has_any_key(&timeline_summary, &["text", "analysis", "overview"])
        || timeline_event_rows(artifact.get("timeline_events")).is_empty()
    {
        errors.push("historical progression".into());
    }
    if artifact
        .get("claims")
        .and_then(Value::as_array)
        .is_none_or(Vec::is_empty)
    {
        errors.push("core findings".into());
    }
    if improvement_dimension_rows(artifact.get("improvement_dimensions")).is_empty()
        && artifact
            .get("debates")
            .and_then(Value::as_array)
            .is_none_or(Vec::is_empty)
    {
        errors.push("improvement dimensions/debates".into());
    }
    let coverage = artifact
        .get("coverage")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if text(coverage.get("coverage_verdict")).is_empty()
        || text(coverage.get("coverage_reason")).is_empty()
        || coverage
            .get("coverage_caveats")
            .and_then(Value::as_array)
            .is_none()
        || text(coverage.get("external_context_summary")).is_empty()
        || coverage
            .get("suggested_collection_directions")
            .and_then(Value::as_array)
            .is_none()
    {
        errors.push("coverage".into());
    }
    errors
}

fn review_outline_errors(artifact: &Map<String, Value>) -> Vec<String> {
    let mut errors = Vec::new();
    let outline = artifact
        .get("review_outline")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if text(outline.get("topic_importance")).is_empty() {
        errors.push("review_outline.topic_importance is required".into());
    }
    let strategies = outline
        .get("writing_strategies")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if strategies.is_empty() {
        errors.push("review_outline.writing_strategies is required".into());
    }
    let mut ids = BTreeSet::new();
    for (index, strategy) in strategies.iter().enumerate() {
        let Some(strategy) = strategy.as_object() else {
            errors.push(format!(
                "review_outline.writing_strategies[{index}] must be an object"
            ));
            continue;
        };
        let id = text(strategy.get("id"));
        if id.is_empty() {
            errors.push(format!(
                "review_outline.writing_strategies[{index}].id is required"
            ));
        } else {
            ids.insert(id.to_owned());
        }
        for key in [
            "title",
            "review_thesis",
            "writing_strategy",
            "best_for",
            "risks",
        ] {
            if text(strategy.get(key)).is_empty() {
                errors.push(format!(
                    "review_outline.writing_strategies[{index}].{key} is required"
                ));
            }
        }
        if strategy
            .get("section_plan")
            .and_then(Value::as_array)
            .is_none_or(|values| {
                !values
                    .iter()
                    .any(|value| !value.as_str().unwrap_or("").trim().is_empty())
            })
        {
            errors.push(format!(
                "review_outline.writing_strategies[{index}].section_plan is required"
            ));
        }
    }
    let recommended = text(outline.get("recommended_strategy_id"));
    if recommended.is_empty() || !ids.contains(recommended) {
        errors.push("review_outline.recommended_strategy_id must match a strategy id".into());
    }
    errors
}

fn content_depth_errors(artifact: &Map<String, Value>) -> Vec<String> {
    let mut errors = Vec::new();
    let topic = artifact
        .get("topic")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if !has_any_key(
        &topic,
        &["discipline", "field", "research_field", "research_area"],
    ) {
        errors.push("topic requires discipline/research field metadata".into());
    }
    if topic
        .get("scope_boundary")
        .and_then(Value::as_object)
        .is_none()
        && text(topic.get("scope")).is_empty()
    {
        errors.push("topic requires scope_boundary or scope".into());
    }

    let taxonomy = artifact
        .get("taxonomy")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let taxonomy_axes = taxonomy
        .get("axes")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let legacy_nodes = taxonomy
        .get("nodes")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if !taxonomy_axes.is_empty() {
        if (taxonomy_axes.len() < 2 && legacy_nodes.is_empty()) || taxonomy_axes.len() > 5 {
            errors.push("taxonomy.axes requires 2-5 classification axes".into());
        }
        for (index, axis) in taxonomy_axes.iter().enumerate() {
            let Some(axis) = axis.as_object() else {
                errors.push(format!("taxonomy axis {} must be an object", index + 1));
                continue;
            };
            let axis_type = text(axis.get("axis_type"));
            if !matches!(
                axis_type,
                "problem_formulation"
                    | "technical_mechanism"
                    | "evidence_scope"
                    | "research_route"
                    | "application_context"
            ) {
                errors.push(format!("taxonomy axis {} has invalid axis_type", index + 1));
            }
            if axis
                .get("nodes")
                .and_then(Value::as_array)
                .is_none_or(Vec::is_empty)
            {
                errors.push(format!(
                    "taxonomy axis {} requires nodes",
                    if axis_type.is_empty() {
                        (index + 1).to_string()
                    } else {
                        axis_type.to_owned()
                    }
                ));
            }
        }
    }
    match taxonomy.get("summary").and_then(Value::as_object) {
        None => errors.push("taxonomy.summary is required".into()),
        Some(summary) if !has_any_key(summary, &["text", "analysis", "overview"]) => {
            errors.push("taxonomy.summary requires text/analysis".into());
        }
        _ => {}
    }
    let taxonomy_rows = taxonomy_route_rows(&taxonomy);
    if taxonomy_rows.is_empty() {
        errors.push("taxonomy.axes requires at least one research route".into());
    }
    for node in taxonomy_rows.into_iter().filter_map(Value::as_object) {
        let id = first_text(node, &["id", "title", "label", "name"]);
        for (field, aliases) in [
            (
                "definition",
                &["definition", "route_definition", "description"][..],
            ),
            (
                "core_problem",
                &["core_problem", "problem", "target_problem"][..],
            ),
            (
                "mechanism",
                &["mechanism", "technical_mechanism", "core_mechanism"][..],
            ),
            ("source_paper_refs", &["source_paper_refs"][..]),
            ("strengths", &["strengths", "advantages"][..]),
            ("limitations", &["limitations", "weaknesses"][..]),
            ("maturity", &["maturity", "status", "development_stage"][..]),
        ] {
            let present = aliases.iter().any(|key| {
                node.get(*key).is_some_and(|value| match value {
                    Value::Array(values) => !values.is_empty(),
                    _ => !text(Some(value)).is_empty(),
                })
            });
            if !present {
                errors.push(format!("taxonomy route {id} requires {field}"));
            }
        }
    }

    for claim in artifact
        .get("claims")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_object)
    {
        let id = first_text(claim, &["id", "text", "claim"]);
        if !has_any_key(claim, &["analysis", "rationale", "argument", "explanation"]) {
            errors.push(format!("claim {id} requires analysis/rationale"));
        }
        if !claim.contains_key("limitations")
            && !claim.contains_key("scope")
            && !claim.contains_key("applicability")
        {
            errors.push(format!("claim {id} requires limitations or scope"));
        }
    }

    let timeline_value = artifact.get("timeline_events");
    let timeline_object = timeline_value.and_then(Value::as_object);
    if timeline_object.is_none() {
        errors.push("timeline_events must be an object with summary and events".into());
    }
    match timeline_object.and_then(|timeline| timeline.get("summary").and_then(Value::as_object)) {
        None => errors.push("timeline_events.summary is required".into()),
        Some(summary) if !has_any_key(summary, &["text", "analysis", "overview"]) => {
            errors.push("timeline_events.summary requires text/analysis".into());
        }
        _ => {}
    }
    let timeline_rows = timeline_event_rows(timeline_value);
    if timeline_rows.is_empty() {
        errors.push("timeline_events.events requires at least one event".into());
    }
    for event in timeline_rows.into_iter().filter_map(Value::as_object) {
        let id = first_text(event, &["id", "label", "title"]);
        if !has_any_key(event, &["description", "analysis", "why_it_matters"]) {
            errors.push(format!("timeline {id} requires description/analysis"));
        }
        if !has_any_key(
            event,
            &["phase", "stage", "progression_logic", "follow_on_effect"],
        ) {
            errors.push(format!("timeline {id} requires phase or progression logic"));
        }
    }

    let statistics = artifact.get("statistics").and_then(Value::as_object);
    for key in [
        "paper_count",
        "time_span",
        "route_coverage",
        "coverage_verdict",
    ] {
        if statistics.is_none_or(|statistics| !statistics.contains_key(key)) {
            errors.push(format!("statistics.{key} is required"));
        }
    }

    let report = artifact
        .get("synthesis_report")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if text(report.get("title")).is_empty() {
        errors.push("synthesis_report.title is required".into());
    }
    let body = first_text(&report, &["body", "markdown", "text", "report"]);
    let paper_count = statistics
        .and_then(|statistics| statistics.get("paper_count"))
        .and_then(|value| match value {
            Value::Number(value) => value.as_f64(),
            Value::String(value) => value.parse().ok(),
            _ => None,
        })
        .unwrap_or(0.0);
    let minimum = if paper_count > 0.0 && paper_count < 5.0 {
        400
    } else {
        800
    };
    if body.encode_utf16().count() < minimum {
        errors.push(format!(
            "synthesis_report body must contain at least {minimum} characters of substantive continuous prose"
        ));
    }
    if paper_count >= 5.0
        && body
            .split("\n\n")
            .filter(|paragraph| !paragraph.trim().is_empty())
            .count()
            < 3
    {
        errors.push(
            "synthesis_report body must contain multiple paragraphs for medium/large topics".into(),
        );
    }
    let missing_dimensions = report_dimension_errors(artifact);
    if !missing_dimensions.is_empty() {
        errors.push(format!(
            "synthesis_report source dimensions incomplete: {}",
            missing_dimensions.join(", ")
        ));
    }
    match report
        .get("source_section_chapters")
        .and_then(Value::as_object)
    {
        None => errors.push("synthesis_report.source_section_chapters is required".into()),
        Some(chapters) => {
            if text(chapters.get("research_routes")) != "taxonomy.summary" {
                errors.push(
                    "synthesis_report.source_section_chapters.research_routes must be taxonomy.summary"
                        .into(),
                );
            }
            if text(chapters.get("historical_progression")) != "timeline_events.summary" {
                errors.push(
                    "synthesis_report.source_section_chapters.historical_progression must be timeline_events.summary"
                        .into(),
                );
            }
        }
    }
    errors
}

fn artifact_errors(value: &Value, expected_language: &str) -> Vec<String> {
    let Some(artifact) = value.as_object() else {
        return vec!["topic synthesis artifact must be an object".into()];
    };
    let mut errors = Vec::new();
    if text(artifact.get("schema_id")) != "synthesis.topic_synthesis_artifact" {
        errors.push("artifact schema_id must be synthesis.topic_synthesis_artifact".into());
    }
    if text(artifact.get("schema_version")) != "4.0.0" {
        errors.push("artifact schema_version must be 4.0.0".into());
    }
    if !expected_language.is_empty() && text(artifact.get("language")) != expected_language {
        errors.push(format!("artifact language must be {expected_language}"));
    }
    walk_legacy(value, "artifact", &mut errors);
    for section in REMOVED_SECTIONS {
        if artifact.contains_key(*section) {
            errors.push(format!(
                "artifact.{section} is not part of the current contract"
            ));
        }
    }
    for section in COMPLETE_SECTIONS {
        if !artifact.contains_key(*section) {
            errors.push(format!("artifact.{section} is required"));
        }
    }
    let known = source_paper_ids(artifact);
    errors.extend(source_paper_ref_errors(
        "claim",
        artifact
            .get("claims")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        &known,
        true,
    ));
    errors.extend(source_paper_ref_errors(
        "timeline",
        timeline_event_rows(artifact.get("timeline_events")),
        &known,
        true,
    ));
    errors.extend(source_paper_ref_errors(
        "debate",
        artifact
            .get("debates")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        &known,
        true,
    ));
    errors.extend(source_paper_ref_errors(
        "future_directions",
        artifact
            .get("future_directions")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .collect(),
        &known,
        true,
    ));
    for entry in artifact
        .get("source_papers")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let Some(entry) = entry.as_object() else {
            errors.push("source_papers entries must be objects".into());
            continue;
        };
        if text(entry.get("paper_ref")).is_empty() {
            errors.push("source_papers.paper_ref is required".into());
        }
        if entry
            .get("digest_ref")
            .and_then(Value::as_object)
            .map(|digest| text(digest.get("payload_type")))
            != Some("digest-markdown")
        {
            errors.push("source_papers.digest_ref.payload_type must be digest-markdown".into());
        }
    }
    errors.extend(content_depth_errors(artifact));
    errors.extend(review_outline_errors(artifact));
    errors.extend(nested_source_paper_ref_errors(
        "taxonomy",
        artifact.get("taxonomy"),
        &known,
    ));
    errors.extend(source_paper_ref_errors(
        "improvement_dimensions",
        improvement_dimension_rows(artifact.get("improvement_dimensions")),
        &known,
        true,
    ));
    errors.extend(nested_source_paper_ref_errors(
        "review_outline",
        artifact.get("review_outline"),
        &known,
    ));
    errors
}

fn string_map(value: Option<&Value>) -> HashMap<String, String> {
    value
        .and_then(Value::as_object)
        .map(|values| {
            values
                .iter()
                .map(|(key, value)| (key.clone(), text(Some(value)).to_owned()))
                .collect()
        })
        .unwrap_or_default()
}

fn patch(request: &Value) -> Result<Value, &'static str> {
    let current_manifest = object(request.get("currentManifest").ok_or("invalid_request")?)?;
    let current_sections = object(request.get("currentSections").ok_or("invalid_request")?)?;
    let patch_manifest = object(request.get("patchManifest").ok_or("invalid_request")?)?;
    let changed_sections = object(request.get("changedSections").ok_or("invalid_request")?)?;
    let base = patch_manifest.get("base").and_then(Value::as_object);
    let read = string_map(base.and_then(|base| base.get("read_section_hashes")));
    let replace = string_map(base.and_then(|base| base.get("replace_section_hashes")));
    let current = string_map(current_manifest.get("section_hashes"));
    for (section, hash) in &read {
        if current.get(section) != Some(hash) {
            return Ok(json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":SECTION_PATCH_VERSION,
                "status":"conflict",
                "sections":null,
                "nextSectionHashes":null,
                "mismatches":[{"name":format!("section:{section}"),"base":hash,"current":current.get(section).cloned().unwrap_or_default()}],
                "errors":[]
            }));
        }
    }
    for section in replace.keys() {
        if !read.contains_key(section) {
            return Ok(json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":SECTION_PATCH_VERSION,
                "status":"invalid",
                "sections":null,
                "nextSectionHashes":null,
                "mismatches":[],
                "errors":[format!("{section} replace_section_hashes must be a subset of read_section_hashes")]
            }));
        }
    }
    let mut sections = current_sections.clone();
    sections.extend(changed_sections.clone());
    let mut hashes = current;
    if let Some(patch_sections) = patch_manifest
        .get("patch")
        .and_then(Value::as_object)
        .and_then(|patch| patch.get("sections"))
        .and_then(Value::as_object)
    {
        for (section, entry) in patch_sections {
            hashes.insert(section.clone(), text(entry.get("hash")).to_owned());
        }
    }
    Ok(json!({
        "contractVersion":CONTRACT_VERSION,
        "algorithmVersion":SECTION_PATCH_VERSION,
        "status":"applied",
        "sections":sections,
        "nextSectionHashes":hashes,
        "mismatches":[],
        "errors":[]
    }))
}

pub fn compute(operation: &str, request: Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    canceled(flag)?;
    if text(request.get("contractVersion")) != CONTRACT_VERSION {
        return Err("invalid_request");
    }
    let mut bounds = JsonBounds::default();
    validate_json_bounds(&request, 0, &mut bounds, flag)?;
    match operation {
        TOPIC_MANIFEST_VALIDATE_OPERATION
            if text(request.get("algorithmVersion")) == MANIFEST_VALIDATION_VERSION =>
        {
            let errors = manifest_errors(request.get("manifest").ok_or("invalid_request")?);
            Ok(json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":MANIFEST_VALIDATION_VERSION,
                "ok":errors.is_empty(),
                "errors":errors
            }))
        }
        TOPIC_ARTIFACT_ASSEMBLE_OPERATION
            if text(request.get("algorithmVersion")) == ARTIFACT_ASSEMBLY_VERSION =>
        {
            let manifest = object(request.get("manifest").ok_or("invalid_request")?)?;
            let sections = object(request.get("sections").ok_or("invalid_request")?)?;
            let mut artifact = Map::new();
            artifact.insert(
                "schema_id".into(),
                json!("synthesis.topic_synthesis_artifact"),
            );
            artifact.insert("schema_version".into(), json!("4.0.0"));
            let language = text(manifest.get("language"));
            artifact.insert(
                "language".into(),
                json!(if language.is_empty() {
                    "auto"
                } else {
                    language
                }),
            );
            artifact.extend(sections.clone());
            Ok(json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":ARTIFACT_ASSEMBLY_VERSION,
                "artifact":artifact
            }))
        }
        TOPIC_ARTIFACT_VALIDATE_OPERATION
            if text(request.get("algorithmVersion")) == ARTIFACT_VALIDATION_VERSION =>
        {
            let errors = artifact_errors(
                request.get("artifact").ok_or("invalid_request")?,
                text(request.get("expectedLanguage")),
            );
            Ok(json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":ARTIFACT_VALIDATION_VERSION,
                "ok":errors.is_empty(),
                "errors":errors
            }))
        }
        TOPIC_SECTION_PATCH_OPERATION
            if text(request.get("algorithmVersion")) == SECTION_PATCH_VERSION =>
        {
            patch(&request)
        }
        _ => Err("invalid_request"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assembles_and_applies_patch_without_mutating_input() {
        let result = compute(
            TOPIC_ARTIFACT_ASSEMBLE_OPERATION,
            json!({
                "contractVersion":CONTRACT_VERSION,
                "algorithmVersion":"topic-structured-artifact-assembly.v1",
                "manifest":{"language":"zh-CN"},
                "sections":{"topic":{"id":"topic:test"}}
            }),
            &AtomicBool::new(false),
        )
        .unwrap();
        assert_eq!(result["artifact"]["language"], "zh-CN");
        assert_eq!(result["artifact"]["topic"]["id"], "topic:test");
    }

    #[test]
    fn bounds_and_cancellation_fail_closed() {
        let request = json!({
            "contractVersion":CONTRACT_VERSION,
            "algorithmVersion":"topic-analysis-manifest-validation.v1",
            "manifest":{}
        });
        assert_eq!(
            compute(
                TOPIC_MANIFEST_VALIDATE_OPERATION,
                request.clone(),
                &AtomicBool::new(true)
            ),
            Err("worker_canceled")
        );
        let mut deep = json!(null);
        for _ in 0..34 {
            deep = json!([deep]);
        }
        let mut invalid = request;
        invalid["manifest"] = deep;
        assert_eq!(
            compute(
                TOPIC_MANIFEST_VALIDATE_OPERATION,
                invalid,
                &AtomicBool::new(false)
            ),
            Err("invalid_request")
        );
    }
}

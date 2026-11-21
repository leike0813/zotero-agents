use super::*;
use crate::evidence_search::scoped_evidence_identities;
use synthesis_canonical_store::{CanonicalTopicState, canonical_json_hash};

const AGENT_EVIDENCE_BYTES: usize = 40 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SemanticEvidenceRef {
    publication: String,
    identity: String,
    fragment_id: String,
    source_version: String,
}

fn unavailable(code: &str) -> Value {
    json!({"status":"unavailable","method":null,"results":[],
        "coverage":{"vector":"unavailable"},"issues":[code]})
}

fn semantic_read_error(code: String, fallback: &str) -> Result<Value, String> {
    match code.as_str() {
        "invalid_request" | "operation_canceled" | "operation_cancelled" => Err(code),
        "basis_mismatch"
        | "source_changed"
        | "source_unavailable"
        | "source_read_failed"
        | "retrieval_index_paused"
        | "retrieval_index_missing"
        | "embedding_disabled"
        | "embedding_service_unavailable"
        | "scan_budget_exhausted"
        | "operation_timeout"
        | "invalid_source"
        | "retrieval_unavailable" => Ok(unavailable(&code)),
        "repository_unavailable" => Ok(unavailable("retrieval_unavailable")),
        _ => Ok(unavailable(fallback)),
    }
}

impl RetrievalApplication {
    pub(crate) fn topic_excerpt(
        &self,
        source: &Value,
        version: &str,
        start: i64,
        end: i64,
    ) -> Result<(String, String), String> {
        let topic = source["topicId"].as_str().ok_or("invalid_source")?;
        let CanonicalTopicState::Ready(view) = self
            .canonical
            .read_topic(topic)
            .map_err(|_| "source_read_failed")?
        else {
            return Err("source_unavailable".into());
        };
        if view.path_id != source["pathId"].as_str().unwrap_or_default()
            || canonical_json_hash(&json!(&view))? != version
        {
            return Err("source_changed".into());
        }
        let section = source["section"].as_str().ok_or("invalid_source")?;
        let text = crate::topic_search::retrieval_section_text(&view, section)?;
        let title = view
            .sections
            .get("topic")
            .and_then(|v| v["title"].as_str())
            .unwrap_or(topic);
        Ok((title.to_owned(), excerpt(&text, start, end)?))
    }

    fn explorer_preview(
        &self,
        identity: &str,
        source: &Value,
        version: &str,
        start: i64,
        end: i64,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let location = if source["kind"] == "topic" {
            json!({"unit":"topic_section","field":topic_section(source["section"].as_str().ok_or("invalid_source")?),"range":{"start":start,"end":end}})
        } else {
            let (unit, field) = match source["kind"].as_str() {
                Some("metadata") => ("field", source["field"].clone()),
                Some("analysis") => ("analysis_field", json!(ANALYSIS_ROOT_FIELD)),
                Some("fulltext") => ("paragraph", Value::Null),
                _ => return Err("invalid_source".into()),
            };
            json!({"unit":unit,"field":field,"range":{"start":start,"end":end}})
        };
        self.verify_evidence(identity, source, version, location, None, checkpoint)
            .map(|row| project_preview(row, identity))
    }

    fn verify_evidence(
        &self,
        identity: &str,
        source: &Value,
        version: &str,
        location: Value,
        scope: Option<&Value>,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        checkpoint()?;
        let mut row = json!({"location":location,"sourceVersion":version});
        if source["kind"] == "topic" {
            let start = location["range"]["start"]
                .as_i64()
                .ok_or("invalid_source")?;
            let end = location["range"]["end"].as_i64().ok_or("invalid_source")?;
            let (title, text) = self.topic_excerpt(source, version, start, end)?;
            row["topicId"] = source["topicId"].clone();
            row["source"] = json!({"kind":"topic","section":topic_section(source["section"].as_str().ok_or("invalid_source")?)});
            row["title"] = title.into();
            row["content"] = text.into();
            row["format"] = json!("markdown");
        } else {
            let item = item_ref_from_identity(identity).ok_or("invalid_source")?;
            let targeted = json!({"libraryIds":[item.library_id],"itemRefs":[item]});
            let scope = scope.unwrap_or(&targeted);
            let descriptor = self.sources.indexed_descriptor(scope, &item, source)?;
            if descriptor["sourceVersion"] != version {
                return Err("source_changed".into());
            }
            let wire = parse_request(descriptor.clone())?;
            let text = self.read_source_range(scope, &descriptor, &wire, &location, checkpoint)?;
            row["itemRef"] = json!(item);
            row["source"] = source.clone();
            row["format"] = descriptor["format"].clone();
            row["content"] = json!(text);
            if source["field"] == "title" {
                row["title"] = text.chars().take(1024).collect::<String>().into();
            }
        }
        Ok(row)
    }

    pub fn search_semantic_evidence(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let limit = request["limit"].as_u64().unwrap_or(8) as usize;
        let result = self.rank_evidence(&request, limit, true, checkpoint);
        match result {
            Ok(RankedEvidence {
                mut results,
                mut issues,
                mut limited,
                source_kinds,
                ..
            }) => {
                // Count full serialized rows against the byte budget. Keep the
                // best complete prefix, including UTF-8 and JSON escaping.
                let mut bytes = 512;
                let keep = results
                    .iter()
                    .take_while(|row| {
                        bytes += row.to_string().len() + 1;
                        bytes <= AGENT_EVIDENCE_BYTES
                    })
                    .count();
                if keep < results.len() {
                    results.truncate(keep);
                    issues.insert("response_budget_exhausted".into());
                    limited = true;
                }
                Ok(evidence_result(results, issues, limited, source_kinds))
            }
            Err(code) => semantic_read_error(code, "query_encoding_failed"),
        }
    }

    fn rank_evidence(
        &self,
        request: &Value,
        limit: usize,
        capture_library: bool,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<RankedEvidence, String> {
        let topic = request["target"] == "topic";
        let mut query =
            json!({"query":request["query"],"includeTopics":topic,"maxResults":limit + 25});
        let mut scope = None;
        let basis = self.evidence_publication()?;
        if topic {
            query["libraryIds"] = json!([]);
            query["sourceKinds"] = json!([]);
            for key in ["topicIds", "sections"] {
                if let Some(value) = request.get(key) {
                    query[key] = value.clone();
                }
            }
        } else if capture_library {
            let mut requested = json!({});
            for key in ["libraryIds", "collectionRef", "itemRefs"] {
                if let Some(value) = request.get(key) {
                    requested[key] = value.clone();
                }
            }
            checkpoint()?;
            let resolved = self
                .sources
                .list_sources(json!({"scope":requested,"limit":1,"sourceKinds":["metadata"]}))?;
            let captured = resolved
                .get("scope")
                .filter(|value| value.is_object())
                .ok_or("invalid_source")?;
            query["libraryIds"] = captured["libraryIds"].clone();
            if let Some(refs) = captured.get("itemRefs") {
                query["itemRefs"] = refs.clone();
            }
            if let Some(kinds) = request.get("sourceKinds") {
                query["sourceKinds"] = kinds.clone();
            }
            scope = Some(captured.clone());
        }
        let outcome = if let Some(scope) =
            scope.as_ref().filter(|s| s.get("collectionRef").is_some())
        {
            let eligible = scoped_evidence_identities(self.sources.as_ref(), scope, checkpoint)?;
            self.query_scoped(query, &eligible, checkpoint)?
        } else {
            self.query_with_checkpoint(query, checkpoint)?
        };
        if outcome.publication != basis {
            return Err("basis_mismatch".into());
        }
        let mut issues = outcome
            .issues
            .iter()
            .filter_map(|issue| issue["code"].as_str().map(str::to_owned))
            .filter(|code| !capture_library || code != "result_budget_exhausted")
            .collect::<BTreeSet<_>>();
        let mut limited = !issues.is_empty();
        let source_kinds = outcome.ready_source_kinds;
        if outcome.results.is_empty() && issues.is_empty() {
            limited = outcome.target_has_sources;
            issues.insert(
                if limited {
                    "retrieval_no_scorable_fragments"
                } else {
                    "retrieval_target_empty"
                }
                .into(),
            );
        }
        let mut results = Vec::new();
        for hit in outcome.results {
            if results.len() == limit {
                if !capture_library {
                    limited = true;
                    issues.insert("result_budget_exhausted".into());
                }
                break;
            }
            let source = serde_json::from_str(&hit.source_json).map_err(|_| "invalid_source")?;
            let mut location = hit.evidence_location()?;
            if let Some(topic) = &hit.topic {
                location["unit"] = json!("topic_section");
                location["field"] = json!(topic.section);
            }
            match self.verify_evidence(
                &hit.item_identity,
                &source,
                &hit.source_version,
                location,
                scope.as_ref(),
                checkpoint,
            ) {
                Ok(mut row) => {
                    row["score"] = json!(hit.score);
                    row["evidenceRef"] = json!({"publication":basis,"identity":hit.item_identity,
                        "fragmentId":hit.fragment_id,"sourceVersion":hit.source_version});
                    results.push(row);
                }
                Err(code)
                    if matches!(
                        code.as_str(),
                        "source_changed"
                            | "source_unavailable"
                            | "source_read_failed"
                            | "invalid_source"
                            | "scan_budget_exhausted"
                    ) =>
                {
                    issues.insert(code);
                    limited = true;
                }
                Err(code) => return Err(code),
            }
        }
        if self.evidence_publication()? != basis {
            return Err("basis_mismatch".into());
        }
        Ok(RankedEvidence {
            publication: basis,
            results,
            issues,
            limited,
            source_kinds,
        })
    }

    fn evidence_publication(&self) -> Result<String, String> {
        let state = self
            .repository
            .with_reader(|r| r.get_retrieval_state())?
            .unwrap_or_default();
        if state.status == "paused" {
            return Err("retrieval_index_paused".into());
        }
        if state.active_publication_id.is_empty() {
            return Err("retrieval_index_missing".into());
        }
        Ok(state.active_publication_id)
    }

    pub fn read_semantic_context(
        &self,
        request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let reference: SemanticEvidenceRef = parse_request(request["evidenceRef"].clone())?;
        let read = || -> Result<Value, String> {
            let locations = || {
                self.repository.with_reader(|r| {
                    r.retrieval_context_locations(
                        &reference.publication,
                        &reference.identity,
                        &reference.fragment_id,
                        &reference.source_version,
                    )
                })
            };
            if self.evidence_publication()? != reference.publication {
                return Err("basis_mismatch".into());
            }
            let expected = locations()?;
            if expected.is_empty() {
                return Err("source_changed".into());
            }
            let mut results = Vec::new();
            for (fragment_id, source, location) in &expected {
                let source: Value = serde_json::from_str(source).map_err(|_| "invalid_source")?;
                let mut location: Value =
                    serde_json::from_str(location).map_err(|_| "invalid_source")?;
                if source["kind"] == "topic" {
                    location["unit"] = json!("topic_section");
                    location["field"] = json!(topic_section(
                        source["section"].as_str().ok_or("invalid_source")?
                    ));
                } else if location["unit"] == "analysis_field" && location["field"] == "content" {
                    location["field"] = json!(ANALYSIS_ROOT_FIELD);
                }
                let mut row = self.verify_evidence(
                    &reference.identity,
                    &source,
                    &reference.source_version,
                    location,
                    None,
                    checkpoint,
                )?;
                row["match"] = json!(fragment_id == &reference.fragment_id);
                row["evidenceRef"] = json!({"publication":reference.publication,"identity":reference.identity,
                    "fragmentId":fragment_id,"sourceVersion":reference.source_version});
                results.push(row);
            }
            if self.evidence_publication()? != reference.publication || locations()? != expected {
                return Err("basis_mismatch".into());
            }
            let source_kinds = results
                .iter()
                .filter_map(|row| row["source"]["kind"].as_str().map(str::to_owned))
                .collect();
            let mut result = evidence_result(results, BTreeSet::new(), false, source_kinds);
            if result.to_string().len() > AGENT_EVIDENCE_BYTES
                && let Some(rows) = result["results"].as_array_mut()
            {
                rows.retain(|row| row["match"] == true);
                result["status"] = json!("limited");
                result["coverage"]["vector"] = json!("limited");
                result["issues"] = json!(["response_budget_exhausted"]);
            }
            Ok(result)
        };
        read().or_else(|code| semantic_read_error(code, "source_read_failed"))
    }

    pub fn explore(
        &self,
        mut request: Value,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        checkpoint()?;
        let read_basis = || {
            self.repository.with_reader(|repository| {
                let state = repository.get_retrieval_state()?.unwrap_or_default();
                let counts =
                    repository.count_retrieval_group_statuses(&state.active_publication_id)?;
                let basis = hash(&json!([
                    state.active_publication_id,
                    state.updated_at,
                    state.status,
                    counts
                ]));
                Ok((state, basis))
            })
        };
        let (state, basis) = read_basis()?;
        let publication = state.active_publication_id;
        if publication.is_empty() {
            return Err("retrieval_index_missing".into());
        }
        if request["publication"].as_str().is_some_and(|v| v != basis) {
            return Err("basis_mismatch".into());
        }
        let cursor = request
            .as_object_mut()
            .ok_or("invalid_request")?
            .remove("cursor");
        request.as_object_mut().unwrap().remove("publication");
        let fingerprint = hash(&json!([basis, request]));
        let after = match cursor.as_ref().and_then(Value::as_str) {
            Some(cursor) => cursor
                .strip_prefix(&format!("{fingerprint}/"))
                .ok_or("basis_mismatch")?,
            None => "",
        };
        let limit = request["limit"].as_u64().unwrap_or(25).clamp(1, 100) as usize;
        let operation = request["operation"].as_str().ok_or("invalid_request")?;
        let mut rows = Vec::new();
        let mut issues = BTreeSet::new();
        let mut next = None;
        let mut limited = false;
        match operation {
            "search" => {
                if state.status != "ready" {
                    return Err("retrieval_index_paused".into());
                }
                let evidence = self.rank_evidence(&request, limit, false, checkpoint)?;
                if evidence.publication != publication {
                    return Err("basis_mismatch".into());
                }
                limited = evidence.limited;
                issues = evidence.issues;
                for row in evidence.results {
                    let identity = row["evidenceRef"]["identity"]
                        .as_str()
                        .ok_or("invalid_source")?
                        .to_owned();
                    rows.push(project_preview(row, &identity));
                }
            }
            "browse" => {
                rows = self.repository.with_reader(|r| {
                    r.browse_retrieval_items(
                        &publication,
                        request["libraryId"].as_u64(),
                        request["sourceKind"].as_str(),
                        request["status"].as_str(),
                        after,
                        limit + 1,
                    )
                })?;
                if rows.len() > limit {
                    rows.pop();
                    next = rows
                        .last()
                        .and_then(|row| row["identity"].as_str())
                        .map(str::to_owned);
                }
                for row in &mut rows {
                    if let Some(item) = row["identity"].as_str().and_then(item_ref_from_identity) {
                        row["itemRef"] = json!(item);
                    }
                }
            }
            "fragments" => {
                let identity = request["identity"].as_str().ok_or("invalid_request")?;
                let mut page = self.repository.with_reader(|r| {
                    r.browse_retrieval_fragments(&publication, identity, after, limit + 1)
                })?;
                if page.len() > limit {
                    page.pop();
                    next = page.last().map(|row| row.0.clone());
                }
                for (_, source, version, start, end) in page {
                    checkpoint()?;
                    let source = serde_json::from_str(&source).map_err(|_| "invalid_source")?;
                    match self.explorer_preview(identity, &source, &version, start, end, checkpoint)
                    {
                        Ok(row) => rows.push(row),
                        Err(code)
                            if matches!(
                                code.as_str(),
                                "source_changed" | "source_unavailable" | "source_read_failed"
                            ) =>
                        {
                            issues.insert(code);
                            limited = true;
                        }
                        Err(code) => return Err(code),
                    }
                }
            }
            _ => return Err("invalid_request".into()),
        }
        if basis != read_basis()?.1 {
            return Err("basis_mismatch".into());
        }
        Ok(
            json!({"operation":operation,"publication":basis,"rows":rows,"limited":limited,"issues":issues,
            "nextCursor":next.map(|key|format!("{fingerprint}/{key}"))}),
        )
    }
}

struct RankedEvidence {
    publication: String,
    results: Vec<Value>,
    issues: BTreeSet<String>,
    limited: bool,
    source_kinds: BTreeSet<String>,
}

fn evidence_result(
    results: Vec<Value>,
    issues: BTreeSet<String>,
    limited: bool,
    source_kinds: BTreeSet<String>,
) -> Value {
    json!({"status":if limited {"limited"} else {"completed"},
        "method":"vector","results":results,"issues":issues,
        "coverage":{"vector":if limited {"limited"} else {"complete"},"sourceKinds":source_kinds}})
}

fn project_preview(evidence: Value, identity: &str) -> Value {
    let mut row = json!({"identity":identity,"title":evidence["title"].as_str().unwrap_or(identity),
        "sourceKind":evidence["source"]["kind"],"preview":evidence["content"],
        "start":evidence["location"]["range"]["start"],"end":evidence["location"]["range"]["end"]});
    for key in ["itemRef", "topicId", "score"] {
        if let Some(value) = evidence.get(key) {
            row[key] = value.clone();
        }
    }
    if let Some(section) = evidence["source"]
        .get("section")
        .or_else(|| evidence["source"].get("field"))
    {
        row["section"] = section.clone();
    }
    row
}

fn excerpt(text: &str, start: i64, end: i64) -> Result<String, String> {
    if start < 0 || end <= start {
        return Err("source_changed".into());
    }
    let units = text
        .encode_utf16()
        .skip(start as usize)
        .take((end - start) as usize)
        .collect::<Vec<_>>();
    if units.len() != (end - start) as usize {
        return Err("source_changed".into());
    }
    String::from_utf16(&units).map_err(|_| "source_changed".into())
}

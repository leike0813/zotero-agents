use super::*;
use synthesis_canonical_store::{CanonicalTopicState, canonical_json_hash};

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
    ) -> Result<Value, String> {
        let mut row = json!({"identity":identity,"title":identity,"sourceKind":source["kind"],"start":start,"end":end});
        if source["kind"] == "topic" {
            let (title, text) = self.topic_excerpt(source, version, start, end)?;
            row["topicId"] = source["topicId"].clone();
            row["section"] =
                topic_section(source["section"].as_str().ok_or("invalid_source")?).into();
            row["title"] = title.into();
            row["preview"] = text.into();
        } else {
            let item = item_ref_from_identity(identity).ok_or("invalid_source")?;
            let scope = json!({"libraryIds":[item.library_id],"itemRefs":[item]});
            let descriptor = self.sources.indexed_descriptor(&scope, &item, source)?;
            if descriptor["sourceVersion"] != version {
                return Err("source_changed".into());
            }
            let wire = parse_request(descriptor.clone())?;
            let text = self.read_source(&scope, &descriptor, &wire)?;
            row["itemRef"] = json!(item);
            if let Some(field) = source["field"].as_str() {
                row["section"] = json!(field);
            }
            row["preview"] = excerpt(&text, start, end)?.into();
            if source["field"] == "title" {
                row["title"] = text.chars().take(1024).collect::<String>().into();
            }
        }
        Ok(row)
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
                let topic = request["target"] == "topic";
                let mut query =
                    json!({"query":request["query"],"includeTopics":topic,"maxResults":limit});
                if topic {
                    query["libraryIds"] = json!([]);
                    query["sourceKinds"] = json!([]);
                }
                let outcome = self.query_with_checkpoint(query, checkpoint)?;
                if outcome.publication != publication {
                    return Err("basis_mismatch".into());
                }
                limited = outcome.limited;
                for issue in outcome.issues {
                    if let Some(code) = issue["code"].as_str() {
                        issues.insert(code.to_owned());
                    }
                }
                for hit in outcome.results {
                    checkpoint()?;
                    let source =
                        serde_json::from_str(&hit.source_json).map_err(|_| "invalid_source")?;
                    match self.explorer_preview(
                        &hit.item_identity,
                        &source,
                        &hit.source_version,
                        hit.range_start,
                        hit.range_end,
                    ) {
                        Ok(mut row) => {
                            row["score"] = json!(hit.score);
                            rows.push(row);
                        }
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
                    match self.explorer_preview(identity, &source, &version, start, end) {
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

use crate::retrieval::{DescriptorWire, RetrievalApplication, item_ref_from_identity};
use serde_json::{Value, json};
use synthesis_canonical_store::{CanonicalTopicSearchMember, CanonicalTopicState};

impl RetrievalApplication {
    /// Candidate work is independently repeatable after publication. It never
    /// builds an index or encodes documents and preserves existing hints when
    /// the description is absent or a source cannot be revalidated.
    pub fn refresh_discovery(
        &self,
        checkpoint: &dyn Fn() -> Result<(), String>,
    ) -> Result<Value, String> {
        let state = self
            .repository
            .with_reader(|repository| repository.get_retrieval_state())?
            .unwrap_or_default();
        if state.status != "ready" || state.active_publication_id.is_empty() {
            return Ok(json!({"published":0,"issues":[]}));
        }
        let scope: Value = serde_json::from_str(&state.active_scope_json)
            .map_err(|_| "retrieval_unavailable".to_owned())?;
        let topics = self
            .canonical
            .search_topics(64, 32 * 1024 * 1024)
            .map_err(|error| error.code().to_owned())?;
        let mut published = 0;
        let mut issues = Vec::new();
        if !topics.complete {
            issues
                .push(json!({"code":"scan_budget_exhausted","sourceKind":null,"affectedCount":1}));
        }
        let generation = (|| -> Result<(), String> {
            for member in topics.members {
                checkpoint()?;
                let CanonicalTopicSearchMember::Ready {
                    topic_id,
                    content_hash,
                    view,
                    ..
                } = member
                else {
                    push_issue(&mut issues, "source_unavailable");
                    continue;
                };
                let projection = self.repository.with_reader(|repository| {
                    repository.get_topic_application_projection(&topic_id)
                })?;
                let interest: Value = projection
                    .as_ref()
                    .and_then(|projection| {
                        serde_json::from_str(&projection.interest_metadata_json).ok()
                    })
                    .unwrap_or_else(|| json!({}));
                let interest_basis = projection
                    .as_ref()
                    .map(|projection| projection.interest_metadata_json.clone())
                    .unwrap_or_else(|| "{}".to_owned());
                let Some(query) = discovery_query(&view.artifact, &interest) else {
                    push_issue(&mut issues, "source_unavailable");
                    continue;
                };
                let excluded = self
                    .repository
                    .with_reader(|repository| {
                        repository.retrieval_discovery_excluded_identities(&topic_id)
                    })?
                    .iter()
                    .filter_map(|identity| item_ref_from_identity(identity))
                    .collect::<Vec<_>>();
                let outcome = match self.query_with_checkpoint(json!({"query":query,"libraryIds":scope["libraryIds"],"sourceKinds":scope["sourceKinds"],"excludeItemRefs":excluded,"maxResults":100}), checkpoint) {
                Ok(outcome) => outcome,
                Err(_) => { push_issue(&mut issues, "vector_unavailable"); continue; }
            };
                let mut candidates = Vec::new();
                for fragment in outcome.results {
                    checkpoint()?;
                    let Some(item_ref) = fragment.item_ref.as_ref() else {
                        continue;
                    };
                    let source: Value = serde_json::from_str(&fragment.source_json)
                        .map_err(|_| "invalid_source".to_owned())?;
                    // Full-source verification is owned by the Host. No local path
                    // or stored excerpt can stand in for a current source read.
                    let mut catalog_request = json!({"scope":{"libraryIds":[item_ref.library_id],"itemRefs":[item_ref]},"limit":100});
                    let mut descriptor = None;
                    let mut resolved_scope = Value::Null;
                    let mut cursors = std::collections::BTreeSet::new();
                    for _ in 0..4 {
                        checkpoint()?;
                        let page = match self.sources.list_sources(catalog_request.clone()) {
                            Ok(page) => page,
                            Err(_) => break,
                        };
                        if !resolved_scope.is_null() && resolved_scope != page["scope"] {
                            break;
                        }
                        resolved_scope = page["scope"].clone();
                        descriptor = page["descriptors"]
                            .as_array()
                            .and_then(|rows| {
                                rows.iter().find(|row| {
                                    row["itemRef"] == json!(item_ref)
                                        && row["source"] == source
                                        && row["sourceVersion"] == fragment.source_version
                                })
                            })
                            .cloned();
                        if descriptor.is_some() || page["hasMore"] != true {
                            break;
                        }
                        let Some(cursor) = page["nextCursor"].as_str() else {
                            break;
                        };
                        if cursor.is_empty() || !cursors.insert(cursor.to_owned()) {
                            break;
                        }
                        catalog_request["scope"] = resolved_scope.clone();
                        catalog_request["cursor"] = page["nextCursor"].clone();
                    }
                    let read = match descriptor {
                        Some(descriptor) => {
                            match serde_json::from_value::<DescriptorWire>(descriptor.clone()) {
                                Ok(wire) => self.read_source(&resolved_scope, &descriptor, &wire),
                                Err(_) => Err("invalid_source".to_owned()),
                            }
                        }
                        None => Err("source_changed".to_owned()),
                    };
                    let content = match read {
                        Ok(content) => content,
                        Err(code) => {
                            if code == "source_changed"
                                && let Err(code) =
                                    self.suspend_group(&outcome.publication, &fragment.group_id)
                            {
                                push_issue(&mut issues, &code);
                            }
                            push_issue(
                                &mut issues,
                                if code == "source_changed" {
                                    "source_changed"
                                } else {
                                    "source_read_failed"
                                },
                            );
                            continue;
                        }
                    };
                    let title = if source["kind"] == "metadata" && source["field"] == "title" {
                        content.as_str()
                    } else {
                        ""
                    };
                    candidates.push(json!({"itemIdentity":fragment.item_identity,"groupId":fragment.group_id,
                    "sourceVersion":fragment.source_version,"title":title,"method":"vector",
                    "interestBasis":interest_basis,
                    "basisHash":discovery_basis(&content_hash, &interest_basis, &fragment.group_id, &fragment.source_version),
                    "matching_fields":["semantic"],"updated_at":(self.clock)()}));
                }
                checkpoint()?;
                let current = self
                    .canonical
                    .search_topics(64, 32 * 1024 * 1024)
                    .map_err(|error| error.code().to_owned())?;
                if !current.members.iter().any(|member| matches!(member, CanonicalTopicSearchMember::Ready { topic_id: id, content_hash: hash, .. } if id == &topic_id && hash == &content_hash)) {
                push_issue(&mut issues, "source_changed");
                continue;
            }
                let CanonicalTopicState::Ready(current_view) = self
                    .canonical
                    .read_topic(&topic_id)
                    .map_err(|error| error.code().to_owned())?
                else {
                    push_issue(&mut issues, "source_changed");
                    continue;
                };
                if current_view.basis != view.basis {
                    push_issue(&mut issues, "source_changed");
                    continue;
                }
                match self.repository.with_writer(|repository| {
                    repository.publish_retrieval_discovery_candidates(
                        &topic_id,
                        &view.basis.artifact_hash,
                        &outcome.publication,
                        &candidates,
                        &(self.clock)(),
                    )
                }) {
                    Ok(count) => published += count,
                    Err(_) => push_issue(&mut issues, "source_changed"),
                }
            }
            Ok(())
        })();
        if let Err(code) = generation {
            if published == 0 {
                return Err(code);
            }
            push_issue(&mut issues, &code);
        }
        Ok(json!({"published":published,"issues":issues}))
    }
}

fn push_issue(issues: &mut Vec<Value>, code: &str) {
    if issues.len() < 8 {
        issues.push(json!({"code":code,"sourceKind":null,"affectedCount":1}));
    }
}

fn discovery_basis(content: &str, interest: &str, group: &str, source: &str) -> String {
    use sha2::{Digest, Sha256};
    format!(
        "{:x}",
        Sha256::digest(
            serde_json::to_vec(&json!([content, interest, group, source])).expect("string array")
        )
    )
}

fn discovery_query(artifact: &Value, metadata: &Value) -> Option<String> {
    let description = artifact["topic"]["definition"].as_str()?.trim();
    if description.is_empty() {
        return None;
    }
    let mut parts = vec![description.to_owned()];
    for field in ["include_terms", "methods"] {
        parts.extend(
            metadata[field]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .map(str::to_owned),
        );
    }
    let query = parts.join("\n");
    (query.encode_utf16().count() <= 4096).then_some(query)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_uses_description_and_positive_interests_only() {
        let artifact = json!({"topic":{"definition":"Cross-language retrieval"},"source_papers":[{"paper_ref":"1:ADOPTED"}]});
        let interest = json!({"include_terms":["Evidence"],"methods":["Dense search"],"must_have_terms":["Review"],"exclude_terms":["Survey"],"seed_literature_item_ids":["1:SEED"]});
        assert_eq!(
            discovery_query(&artifact, &interest).as_deref(),
            Some("Cross-language retrieval\nEvidence\nDense search")
        );
        assert!(discovery_query(&json!({"topic":{"definition":" "}}), &interest).is_none());
        assert!(
            discovery_query(&json!({"topic":{"definition":"x".repeat(4097)}}), &interest).is_none()
        );
        let first = discovery_basis(
            "content:1",
            "{\"include_terms\":[\"Evidence\"]}",
            "group:1",
            "source:1",
        );
        for basis in [
            discovery_basis(
                "content:2",
                "{\"include_terms\":[\"Evidence\"]}",
                "group:1",
                "source:1",
            ),
            discovery_basis(
                "content:1",
                "{\"include_terms\":[\"Other\"]}",
                "group:1",
                "source:1",
            ),
            discovery_basis(
                "content:1",
                "{\"include_terms\":[\"Evidence\"]}",
                "group:1",
                "source:2",
            ),
        ] {
            assert_ne!(basis, first);
        }
    }
}

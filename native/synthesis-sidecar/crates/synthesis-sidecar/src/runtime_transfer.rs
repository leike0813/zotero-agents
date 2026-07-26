use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, HashMap};
use std::sync::atomic::AtomicBool;
use synthesis_protocol::{canonical_json, canonical_sha256};

const TRANSFER_VERSION: &str = "synthesis-citation-graph-build-transfer.v1";
const TRANSFER_ENCODING: &str = "canonical_json_rows.v1";

#[derive(Clone)]
struct Session {
    id: String,
    manifest: Value,
    pages: BTreeMap<(String, u64), Value>,
    state: &'static str,
    staged_bytes: u64,
    created_at_ms: u64,
    last_activity_at_ms: u64,
    output_manifest: Option<Value>,
    output_pages: BTreeMap<(String, u64), Value>,
}

pub struct NativeTransferOwner {
    sessions: HashMap<String, Session>,
    idempotency: HashMap<String, String>,
    next_id: u64,
    stopping: bool,
}

struct Descriptor {
    kind: String,
    page_index: u64,
    row_count: u64,
    byte_length: u64,
    sha256: String,
}

impl Default for NativeTransferOwner {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            idempotency: HashMap::new(),
            next_id: 1,
            stopping: false,
        }
    }
}

fn object(value: &Value) -> Result<&Map<String, Value>, &'static str> {
    value.as_object().ok_or("invalid_request")
}

fn exact(value: &Value, fields: &[&str]) -> Result<(), &'static str> {
    let value = object(value)?;
    if value.len() != fields.len() || fields.iter().any(|field| !value.contains_key(*field)) {
        return Err("invalid_request");
    }
    Ok(())
}

fn bounded_string(value: &Value, max: usize) -> Result<&str, &'static str> {
    value
        .as_str()
        .filter(|value| !value.is_empty() && value.len() <= max)
        .ok_or("invalid_request")
}

fn descriptors(manifest: &Value) -> Result<Vec<Descriptor>, &'static str> {
    exact(
        manifest,
        &[
            "transferVersion",
            "encoding",
            "direction",
            "header",
            "pages",
            "rootSha256",
        ],
    )?;
    if manifest["transferVersion"] != TRANSFER_VERSION
        || manifest["encoding"] != TRANSFER_ENCODING
        || manifest["direction"] != "input"
        || !manifest["header"].is_object()
    {
        return Err("invalid_request");
    }
    let pages = manifest["pages"].as_array().ok_or("invalid_request")?;
    if pages.len() > 256 {
        return Err("transfer_limit_exceeded");
    }
    let mut result = Vec::with_capacity(pages.len());
    let mut total = 0_u64;
    for page in pages {
        exact(
            page,
            &["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
        )?;
        let kind = bounded_string(&page["kind"], 64)?.to_owned();
        let page_index = page["pageIndex"].as_u64().ok_or("invalid_request")?;
        let row_count = page["rowCount"].as_u64().ok_or("invalid_request")?;
        let byte_length = page["byteLength"].as_u64().ok_or("invalid_request")?;
        let sha256 = bounded_string(&page["sha256"], 71)?.to_owned();
        total = total
            .checked_add(byte_length)
            .ok_or("transfer_limit_exceeded")?;
        if byte_length > 4 * 1024 * 1024 || total > 1024 * 1024 * 1024 {
            return Err("transfer_limit_exceeded");
        }
        result.push(Descriptor {
            kind,
            page_index,
            row_count,
            byte_length,
            sha256,
        });
    }
    Ok(result)
}

fn page_identity(page: &Value) -> Result<(String, u64, u64), &'static str> {
    exact(page, &["descriptor", "rows"])?;
    let descriptor = &page["descriptor"];
    exact(
        descriptor,
        &["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    )?;
    let rows = page["rows"].as_array().ok_or("invalid_request")?;
    let kind = bounded_string(&descriptor["kind"], 64)?.to_owned();
    let page_index = descriptor["pageIndex"].as_u64().ok_or("invalid_request")?;
    let row_count = descriptor["rowCount"].as_u64().ok_or("invalid_request")?;
    let byte_length = descriptor["byteLength"].as_u64().ok_or("invalid_request")?;
    if row_count != rows.len() as u64
        || byte_length != canonical_json(rows).map_err(|_| "invalid_request")?.len() as u64
        || descriptor["sha256"] != canonical_sha256(rows).map_err(|_| "invalid_request")?
    {
        return Err("transfer_conflict");
    }
    Ok((kind, page_index, byte_length))
}

fn progress(session: &Session, output: bool) -> Value {
    let manifest = if output {
        session.output_manifest.as_ref()
    } else {
        Some(&session.manifest)
    };
    let total_pages = manifest
        .and_then(|manifest| manifest["pages"].as_array())
        .map_or(0, Vec::len);
    let pages = if output {
        session.output_pages.len()
    } else {
        session.pages.len()
    };
    let staged_bytes = if output {
        session
            .output_pages
            .values()
            .filter_map(|page| page["descriptor"]["byteLength"].as_u64())
            .sum()
    } else {
        session.staged_bytes
    };
    json!({
        "receivedPages":pages,
        "totalPages":total_pages,
        "stagedBytes":staged_bytes,
    })
}

fn status(session: &Session) -> Value {
    let mut value = json!({
        "sessionId":session.id,
        "state":session.state,
        "input":progress(session, false),
        "execution":{"attempts":if session.state == "completed" {1} else {0}},
        "stagedBytes":session.staged_bytes,
        "createdAtMs":session.created_at_ms,
        "lastActivityAtMs":session.last_activity_at_ms,
    });
    if session.output_manifest.is_some() {
        value
            .as_object_mut()
            .expect("status object")
            .insert("output".into(), progress(session, true));
    }
    value
}

fn output_page(kind: &str, rows: Value) -> Result<Value, &'static str> {
    let rows = rows.as_array().ok_or("worker_result_invalid")?;
    let canonical = canonical_json(rows).map_err(|_| "worker_result_invalid")?;
    if canonical.len() > 4 * 1024 * 1024 {
        return Err("transfer_limit_exceeded");
    }
    Ok(json!({
        "descriptor":{
            "kind":kind,
            "pageIndex":0,
            "rowCount":rows.len(),
            "byteLength":canonical.len(),
            "sha256":canonical_sha256(rows).map_err(|_| "worker_result_invalid")?,
        },
        "rows":rows,
    }))
}

impl NativeTransferOwner {
    pub fn snapshot(&self) -> Value {
        json!({
            "state":if self.stopping {"stopping"} else if self.sessions.is_empty() {"idle"} else {"active"},
            "sessions":self.sessions.len(),
            "stagedBytes":self.sessions.values().map(|session| session.staged_bytes).sum::<u64>(),
        })
    }

    pub fn stop(&mut self) {
        self.stopping = true;
        self.sessions.clear();
        self.idempotency.clear();
    }

    pub fn handle(&mut self, action: Value, now_ms: u64) -> Result<Value, &'static str> {
        if self.stopping {
            return Err("transfer_stopping");
        }
        let action_name = bounded_string(&action["action"], 64)?;
        match action_name {
            "begin" => {
                exact(&action, &["action", "idempotencyKey", "manifest"])?;
                let key = bounded_string(&action["idempotencyKey"], 128)?.to_owned();
                descriptors(&action["manifest"])?;
                if let Some(session_id) = self.idempotency.get(&key) {
                    let session = self.sessions.get(session_id).ok_or("transfer_not_found")?;
                    if session.manifest != action["manifest"] {
                        return Err("transfer_conflict");
                    }
                    return Ok(status(session));
                }
                if self.sessions.len() >= 2 {
                    return Err("transfer_busy");
                }
                let id = format!("native-transfer:{}", self.next_id);
                self.next_id += 1;
                self.idempotency.insert(key, id.clone());
                let session = Session {
                    id: id.clone(),
                    manifest: action["manifest"].clone(),
                    pages: BTreeMap::new(),
                    state: "receiving_input",
                    staged_bytes: 0,
                    created_at_ms: now_ms,
                    last_activity_at_ms: now_ms,
                    output_manifest: None,
                    output_pages: BTreeMap::new(),
                };
                let result = status(&session);
                self.sessions.insert(id, session);
                Ok(result)
            }
            "put_input_page" => {
                exact(&action, &["action", "sessionId", "page"])?;
                let session_id = bounded_string(&action["sessionId"], 128)?;
                let session = self
                    .sessions
                    .get_mut(session_id)
                    .ok_or("transfer_not_found")?;
                if session.state != "receiving_input" {
                    return Err("transfer_conflict");
                }
                let (kind, index, bytes) = page_identity(&action["page"])?;
                let expected = descriptors(&session.manifest)?
                    .into_iter()
                    .find(|entry| entry.kind == kind && entry.page_index == index)
                    .ok_or("transfer_conflict")?;
                let descriptor = &action["page"]["descriptor"];
                if descriptor["rowCount"] != expected.row_count
                    || descriptor["byteLength"] != expected.byte_length
                    || descriptor["sha256"] != expected.sha256
                {
                    return Err("transfer_conflict");
                }
                let identity = (kind, index);
                if let Some(previous) = session.pages.get(&identity) {
                    if previous != &action["page"] {
                        return Err("transfer_conflict");
                    }
                } else {
                    session.pages.insert(identity, action["page"].clone());
                    session.staged_bytes += bytes;
                }
                session.last_activity_at_ms = now_ms;
                Ok(status(session))
            }
            "seal_input"
            | "status"
            | "execute"
            | "get_output_manifest"
            | "cancel"
            | "get_output_page" => {
                let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
                if action_name == "cancel" {
                    self.sessions
                        .remove(&session_id)
                        .ok_or("transfer_not_found")?;
                    self.idempotency.retain(|_, value| value != &session_id);
                    return Ok(json!({"canceled":true}));
                }
                let session = self
                    .sessions
                    .get_mut(&session_id)
                    .ok_or("transfer_not_found")?;
                match action_name {
                    "status" => Ok(status(session)),
                    "seal_input" => {
                        if session.pages.len() != descriptors(&session.manifest)?.len() {
                            return Err("transfer_incomplete");
                        }
                        session.state = "input_sealed";
                        session.last_activity_at_ms = now_ms;
                        Ok(status(session))
                    }
                    "execute" => {
                        if session.state != "input_sealed" {
                            return Err("transfer_conflict");
                        }
                        let header = session.manifest["header"].clone();
                        let mut request = header.as_object().cloned().ok_or("invalid_request")?;
                        for kind in ["library_nodes", "references"] {
                            let mut rows = Vec::new();
                            for ((page_kind, _), page) in &session.pages {
                                if page_kind == kind {
                                    rows.extend(
                                        page["rows"]
                                            .as_array()
                                            .ok_or("invalid_request")?
                                            .iter()
                                            .cloned(),
                                    );
                                }
                            }
                            request.insert(
                                if kind == "library_nodes" {
                                    "libraryNodes"
                                } else {
                                    "references"
                                }
                                .into(),
                                Value::Array(rows),
                            );
                        }
                        session.state = "executing";
                        let result = synthesis_citation_graph_build::compute(
                            Value::Object(request),
                            &AtomicBool::new(false),
                        )
                        .map_err(|_| "worker_result_invalid")?;
                        let output_kinds = [
                            ("nodes", "nodes"),
                            ("resolved_edges", "resolvedEdges"),
                            ("aggregate_edges", "aggregateEdges"),
                            ("source_ownership", "sourceOwnership"),
                            ("incoming_groups", "incomingGroups"),
                            ("light_metrics", "lightMetrics"),
                        ];
                        for (kind, field) in output_kinds {
                            let page = output_page(kind, result[field].clone())?;
                            session.output_pages.insert((kind.into(), 0), page);
                        }
                        let descriptors: Vec<Value> = output_kinds
                            .iter()
                            .map(|(kind, _)| {
                                session
                                    .output_pages
                                    .get(&(String::from(*kind), 0))
                                    .expect("inserted output page")["descriptor"]
                                    .clone()
                            })
                            .collect();
                        let body = json!({
                            "transferVersion":TRANSFER_VERSION,
                            "encoding":TRANSFER_ENCODING,
                            "direction":"output",
                            "header":{
                                "contractVersion":result["contractVersion"],
                                "scope":result["scope"],
                                "diagnostics":result["diagnostics"],
                            },
                            "pages":descriptors,
                        });
                        let mut manifest = body.clone();
                        manifest.as_object_mut().expect("manifest").insert(
                            "rootSha256".into(),
                            Value::String(
                                canonical_sha256(&body).map_err(|_| "worker_result_invalid")?,
                            ),
                        );
                        session.output_manifest = Some(manifest);
                        session.state = "completed";
                        session.last_activity_at_ms = now_ms;
                        Ok(status(session))
                    }
                    "get_output_manifest" => session
                        .output_manifest
                        .clone()
                        .ok_or("transfer_output_not_ready"),
                    "get_output_page" => {
                        let kind = bounded_string(&action["kind"], 64)?;
                        let page_index = action["pageIndex"].as_u64().ok_or("invalid_request")?;
                        session
                            .output_pages
                            .get(&(kind.to_owned(), page_index))
                            .cloned()
                            .ok_or("transfer_output_not_ready")
                    }
                    _ => unreachable!(),
                }
            }
            _ => Err("invalid_request"),
        }
    }
}

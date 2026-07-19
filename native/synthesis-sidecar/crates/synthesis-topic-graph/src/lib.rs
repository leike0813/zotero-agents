use serde_json::{Value, json};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};

fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, &'static str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or("invalid_request")
}
fn checkpoint(flag: &AtomicBool, index: usize) -> Result<(), &'static str> {
    if index.is_multiple_of(256) && flag.load(Ordering::Relaxed) {
        Err("worker_canceled")
    } else {
        Ok(())
    }
}
pub fn compute(request: Value, flag: &AtomicBool) -> Result<Value, &'static str> {
    checkpoint(flag, 0)?;
    let nodes = request
        .get("nodes")
        .and_then(Value::as_array)
        .ok_or("invalid_request")?;
    let edges = request
        .get("edges")
        .and_then(Value::as_array)
        .ok_or("invalid_request")?;
    let mut parented = HashSet::new();
    for (index, edge) in edges.iter().enumerate() {
        checkpoint(flag, index)?;
        if text(edge, "relation")? == "broader_than" && text(edge, "status")? != "rejected" {
            parented.insert(text(edge, "targetTopicId")?);
        }
    }
    let mut roots = Vec::new();
    let mut unplaced = Vec::new();
    for (index, node) in nodes.iter().enumerate() {
        checkpoint(flag, index)?;
        let id = text(node, "topicId")?;
        let is_root = node
            .get("isRoot")
            .and_then(Value::as_bool)
            .ok_or("invalid_request")?;
        let level = node.get("level").and_then(Value::as_str);
        if is_root || level == Some("top") {
            roots.push(id.to_owned());
        }
        if !is_root
            && level != Some("top")
            && node.get("definitionStatus").and_then(Value::as_str) != Some("deleted")
            && !parented.contains(id)
        {
            unplaced.push(id.to_owned());
        }
    }
    roots.sort_by(|left, right| synthesis_protocol::compare_utf16(left, right));
    unplaced.sort_by(|left, right| synthesis_protocol::compare_utf16(left, right));
    checkpoint(flag, nodes.len())?;
    Ok(
        json!({"contractVersion":"synthesis-topic-graph-index.v1","algorithmVersion":"topic-graph-index.v1","schemaVersion":"1.0.0","sourceManifestHash":text(&request,"sourceManifestHash")?,"rebuiltAt":text(&request,"rebuiltAt")?,"roots":roots,"unplaced":unplaced}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(status: &str) -> Value {
        json!({
            "contractVersion":"synthesis-topic-graph-index.v1",
            "algorithmVersion":"topic-graph-index.v1",
            "sourceManifestHash":"sha256:test",
            "rebuiltAt":"2026-07-19T00:00:00.000Z",
            "nodes":[
                {"topicId":"topic:","isRoot":true,"level":"normal","definitionStatus":"has_synthesis"},
                {"topicId":"topic:😀","isRoot":true,"level":"normal","definitionStatus":"has_synthesis"},
                {"topicId":"topic:child","isRoot":false,"level":"normal","definitionStatus":"placeholder"},
                {"topicId":"topic:deleted","isRoot":false,"level":"normal","definitionStatus":"deleted"}
            ],
            "edges":[{"edgeId":"edge:1","sourceTopicId":"topic:😀","targetTopicId":"topic:child","relation":"broader_than","status":status}]
        })
    }

    #[test]
    fn preserves_utf16_root_order_and_parent_status_semantics() {
        for (status, unplaced) in [
            ("suggested", json!([])),
            ("confirmed", json!([])),
            ("stale", json!([])),
            ("deleted", json!([])),
            ("rejected", json!(["topic:child"])),
        ] {
            let result = compute(request(status), &AtomicBool::new(false)).unwrap();
            assert_eq!(result["roots"], json!(["topic:😀", "topic:"]));
            assert_eq!(result["unplaced"], unplaced);
        }
    }

    #[test]
    fn canceled_kernel_fails_before_publication() {
        assert_eq!(
            compute(request("confirmed"), &AtomicBool::new(true)),
            Err("worker_canceled")
        );
    }
}

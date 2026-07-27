use serde::Deserialize;
use serde_json::{Map, Value, json};
use synthesis_application::{
    TopicDetailRequest, TopicDetailResult, TopicListRequest, TopicListResult, TopicRecord,
};

use crate::runtime_capabilities::ServeState;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ClientArguments {
    args: Vec<Value>,
}

fn topic_list_request(payload: Value) -> Result<TopicListRequest, String> {
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    match envelope.args.as_slice() {
        [] => Ok(TopicListRequest::default()),
        [request] => {
            serde_json::from_value(request.clone()).map_err(|_| "invalid_request".to_owned())
        }
        _ => Err("invalid_request".into()),
    }
}

fn one_argument(payload: Value) -> Result<Value, String> {
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    match envelope.args.as_slice() {
        [request] => Ok(request.clone()),
        _ => Err("invalid_request".into()),
    }
}

fn topic_detail_request(payload: Value) -> Result<TopicDetailRequest, String> {
    serde_json::from_value(one_argument(payload)?).map_err(|_| "invalid_request".to_owned())
}

fn workbench_chrome_request(payload: Value) -> Result<(), String> {
    if one_argument(payload)?.is_object() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn no_arguments(payload: Value) -> Result<(), String> {
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    if envelope.args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn topic_record_wire(record: TopicRecord) -> Value {
    json!({
        "topic_id":record.topic_id,
        "path_id":record.path_id,
        "title":record.title,
        "definition":record.definition,
        "language":record.language,
        "operation":record.operation,
        "manifest_hash":record.manifest_hash,
        "artifact_hash":record.artifact_hash,
        "metadata_hash":record.metadata_hash,
        "bundle_hash":record.bundle_hash,
        "paper_count":record.paper_count,
        "updated_at":record.updated_at,
        "topic_definition":record.topic_definition,
        "topic_resolver":record.topic_resolver,
        "resolved_paper_set":record.resolved_paper_set,
        "projection":record.projection,
    })
}

fn topic_list_wire(result: TopicListResult) -> Value {
    let returned = result.returned;
    let total = result.total;
    let mut value = Map::new();
    value.insert(
        "topics".into(),
        Value::Array(result.topics.into_iter().map(topic_record_wire).collect()),
    );
    value.insert("cursor".into(), Value::String(result.cursor));
    value.insert("next_cursor".into(), Value::String(result.next_cursor));
    value.insert("has_more".into(), Value::Bool(result.has_more));
    value.insert("returned".into(), json!(returned));
    value.insert("total".into(), json!(total));
    value.insert("limit".into(), json!(result.limit));
    value.insert(
        "diagnostics".into(),
        json!({
            "count":returned,
            "total_count":total,
            "source":"rust-topic-application",
        }),
    );
    Value::Object(value)
}

fn topic_detail_wire(result: TopicDetailResult) -> Result<Value, String> {
    serde_json::to_value(result).map_err(|_| "topic_detail_projection_invalid".into())
}

pub(crate) fn dispatch_production_client(
    state: &ServeState,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    if state.owner_mode != "production" {
        return Err("capability_not_found".into());
    }
    match capability {
        "client.listTopics" => state
            .topics
            .list(topic_list_request(payload)?)
            .map(topic_list_wire),
        "client.readTopicDetail" => state
            .topics
            .detail(topic_detail_request(payload)?)
            .and_then(topic_detail_wire),
        "client.getSynthesisWorkbenchChromeInput" => {
            workbench_chrome_request(payload)?;
            state.workbench.read_json()
        }
        "client.getSynthesisBackgroundJobRows" => {
            no_arguments(payload)?;
            serde_json::to_value(state.workbench.read()?.maintenance.background_jobs)
                .map_err(|_| "workbench_projection_invalid".into())
        }
        known if state.production_client_capabilities.contains(known) => {
            Err("service_not_ready".into())
        }
        _ => Err("invalid_request".into()),
    }
}

pub(crate) fn production_client_error_status(code: &str) -> u16 {
    if code == "invalid_request" {
        400
    } else if code.ends_with("_not_found") || code.ends_with("_missing") {
        404
    } else if code.ends_with("_conflict") || code.ends_with("_basis_mismatch") {
        409
    } else if code.ends_with("_busy") {
        429
    } else if code.ends_with("_too_large") || code.ends_with("_limit_exceeded") {
        413
    } else if code.ends_with("_timeout") || code == "timeout" {
        408
    } else {
        503
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn topic_list_wire_is_strictly_legacy_shaped() {
        assert_eq!(
            topic_list_request(json!({"args":[]})).unwrap(),
            TopicListRequest::default()
        );
        assert_eq!(
            topic_list_request(json!({"args":[{"cursor":"2","limit":25}]})).unwrap(),
            TopicListRequest {
                cursor: "2".into(),
                limit: 25,
            }
        );
        assert!(topic_list_request(json!({"args":[{},{}]})).is_err());
        assert!(topic_list_request(json!({"args":[],"extra":true})).is_err());
        assert_eq!(
            topic_detail_request(json!({"args":[{"topicId":"topic-a"}]})).unwrap(),
            TopicDetailRequest {
                topic_id: "topic-a".into(),
            }
        );
        assert!(topic_detail_request(json!({"args":[]})).is_err());
        assert!(topic_detail_request(json!({"args":[{},{}]})).is_err());
        assert!(workbench_chrome_request(json!({"args":[{}]})).is_ok());
        assert!(workbench_chrome_request(json!({"args":[]})).is_err());
        assert!(no_arguments(json!({"args":[]})).is_ok());
        assert!(no_arguments(json!({"args":[{}]})).is_err());
        assert_eq!(production_client_error_status("invalid_request"), 400);
        assert_eq!(production_client_error_status("topic_not_found"), 404);
        assert_eq!(production_client_error_status("basis_conflict"), 409);
        assert_eq!(production_client_error_status("worker_busy"), 429);
        assert_eq!(production_client_error_status("request_too_large"), 413);
        assert_eq!(production_client_error_status("worker_timeout"), 408);
        assert_eq!(production_client_error_status("service_not_ready"), 503);

        let wire = topic_list_wire(TopicListResult {
            topics: Vec::new(),
            cursor: String::new(),
            next_cursor: String::new(),
            has_more: false,
            returned: 0,
            total: 0,
            limit: 50,
        });
        assert_eq!(
            wire,
            json!({
                "topics":[],
                "cursor":"",
                "next_cursor":"",
                "has_more":false,
                "returned":0,
                "total":0,
                "limit":50,
                "diagnostics":{
                    "count":0,
                    "total_count":0,
                    "source":"rust-topic-application"
                }
            })
        );
    }
}

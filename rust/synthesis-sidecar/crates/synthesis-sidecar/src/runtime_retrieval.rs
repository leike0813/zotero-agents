use crate::runtime_production_client::ProductionClientRouteEntry;
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    checkpoint_current_after_promotion, checkpoint_current_before_promotion,
};
use serde_json::{Value, json};
use synthesis_application::retrieval::RetrievalBuildMode;

pub(crate) const RETRIEVAL_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.getRetrievalState", |apps, args| {
        no_args(args)?;
        apps.retrieval.state()
    }),
    ProductionClientRouteEntry::new("client.buildRetrievalIndex", |apps, args| {
        maintain(apps, args, RetrievalBuildMode::Full)
    })
    .with_request_validator(maintenance_args),
    ProductionClientRouteEntry::new("client.rebuildRetrievalIndex", |apps, args| {
        maintain(apps, args, RetrievalBuildMode::Full)
    })
    .with_request_validator(maintenance_args),
    ProductionClientRouteEntry::new("client.updateRetrievalIndex", |apps, args| {
        maintain(apps, args, RetrievalBuildMode::Increment)
    })
    .with_request_validator(maintenance_args),
    ProductionClientRouteEntry::new("client.cleanupRetrievalIndex", |apps, args| {
        no_args(args)?;
        let checkpoint = || checkpoint_current_before_promotion(apps);
        checkpoint()?;
        let mut result = apps
            .retrieval
            .cleanup(&|| checkpoint_current_after_promotion(apps))?;
        if let Some(object) = result.as_object_mut() {
            // Cleanup is the required post-publication tail; its terminal
            // maintenance status is reported separately from publication.
            object.insert("status".into(), json!("cleaned"));
        }
        // The cleanup route is also the candidate-only Discovery recovery
        // entrypoint: it repeats candidate work without re-encoding documents.
        let discovery = apps
            .retrieval
            .refresh_discovery(&|| checkpoint_current_after_promotion(apps));
        let candidates_changed = discovery
            .as_ref()
            .ok()
            .is_some_and(|value| value["published"].as_u64().unwrap_or_default() > 0);
        attach_discovery_issues(&mut result, discovery);
        Ok(maintenance_receipt(
            &result,
            candidates_changed || result["cleaned"].as_u64().unwrap_or_default() > 0,
        ))
    })
    .with_request_validator(no_args),
    ProductionClientRouteEntry::new("client.recommendSimilarPapers", |apps, args| {
        apps.retrieval
            .recommend(one(args)?, &|| checkpoint_current_before_promotion(apps))
    })
    .with_request_validator(similarity_args),
    ProductionClientRouteEntry::new("client.invalidateRetrievalSources", |apps, args| {
        apps.retrieval.invalidate(one(args)?)
    })
    .with_request_validator(invalidate_args),
];

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn one(args: &[Value]) -> Result<Value, String> {
    match args {
        [request] => Ok(request.clone()),
        _ => Err("invalid_request".into()),
    }
}

fn validate_one(args: &[Value], definition: &str) -> Result<(), String> {
    let [request] = args else {
        return Err("invalid_request".into());
    };
    let schema = crate::runtime_wire_schema::retrieval_schema();
    if crate::runtime_wire_schema::matches(schema, &schema["$defs"][definition], request) {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn maintenance_args(args: &[Value]) -> Result<(), String> {
    validate_one(args, "RetrievalMaintenanceRequest")
}

fn similarity_args(args: &[Value]) -> Result<(), String> {
    validate_one(args, "PaperSimilarityRequest")
}

fn invalidate_args(args: &[Value]) -> Result<(), String> {
    validate_one(args, "RetrievalInvalidateRequest")
}

fn maintain(
    apps: &ProductionApplications,
    args: &[Value],
    mode: RetrievalBuildMode,
) -> Result<Value, String> {
    let request = one(args)?;
    let checkpoint = || checkpoint_current_before_promotion(apps);
    let mut result = apps.retrieval.maintain(
        match mode {
            RetrievalBuildMode::Full => "rebuild",
            RetrievalBuildMode::Increment => "update",
        },
        request,
        &checkpoint,
    )?;
    // Discovery runs only after a successful publication, as separate
    // candidate work that cannot revoke the published index.
    if publication_succeeded(&result) {
        match apps
            .retrieval
            .cleanup(&|| checkpoint_current_after_promotion(apps))
        {
            Ok(cleanup) => attach_discovery_issues(&mut result, Ok(cleanup)),
            Err(code) => attach_discovery_issues(&mut result, Err(code)),
        }
        let discovery = apps
            .retrieval
            .refresh_discovery(&|| checkpoint_current_after_promotion(apps));
        attach_discovery_issues(&mut result, discovery);
    }
    if !publication_succeeded(&result) {
        return Err("retrieval_publication_incomplete".into());
    }
    Ok(maintenance_receipt(
        &result,
        result["status"] != "unchanged",
    ))
}

fn maintenance_receipt(result: &Value, state_changed: bool) -> Value {
    let diagnostics = result["issues"].as_array().into_iter().flatten().take(20)
        .map(|issue| json!({"code":issue["code"].as_str().unwrap_or("retrieval_tail_failed"),"severity":"warning"}))
        .collect::<Vec<_>>();
    json!({"schema":"synthesis.maintenance_receipt.v1","outcome":"completed",
        "state_changed":state_changed,"retryable":!diagnostics.is_empty(),"diagnostics":diagnostics})
}

/// Whether a maintenance result reports an index that is ready (or newly
/// promoted). Discovery recovery is skipped when the publication did not
/// complete so it never runs ahead of a compatible active index.
fn publication_succeeded(result: &Value) -> bool {
    matches!(
        result.get("status").and_then(Value::as_str),
        Some("ready" | "promoted" | "unchanged")
    )
}

/// Discovery failure is observable on the maintenance receipt but never turns
/// a successful publication or cleanup into a failure.
fn attach_discovery_issues(result: &mut Value, discovery: Result<Value, String>) {
    let Some(object) = result.as_object_mut() else {
        return;
    };
    if object.get("issues").and_then(Value::as_array).is_none() {
        object.insert("issues".into(), json!([]));
    }
    let Some(issues) = object.get_mut("issues").and_then(Value::as_array_mut) else {
        return;
    };
    match discovery {
        Ok(value) => {
            if let Some(values) = value.get("issues").and_then(Value::as_array) {
                issues.extend(values.iter().cloned());
            }
        }
        Err(code) => issues.push(json!({"code": code, "sourceKind": Value::Null})),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_argument_envelopes_before_application_work() {
        assert_eq!(no_args(&[json!({})]), Err("invalid_request".into()));
        assert_eq!(one(&[]), Err("invalid_request".into()));
        assert_eq!(one(&[json!({}), json!({})]), Err("invalid_request".into()));
    }

    #[test]
    fn shared_requests_use_the_production_retrieval_decoder() {
        let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_RETRIEVAL_REQUEST_CODEC_CASES"),
            std::env::var("SYNTHESIS_RETRIEVAL_REQUEST_CODEC_RESULTS"),
        ) else {
            return;
        };
        let cases: Vec<Value> =
            serde_json::from_slice(&std::fs::read(cases_path).unwrap()).unwrap();
        assert!(!cases.is_empty());
        let results: Vec<Value> = cases.iter().map(|case| {
            let (outcome, predicate) = crate::runtime_wire_schema::with_schema_probe(case, || {
                let args = case["value"]["args"].as_array().ok_or("invalid_request")?;
                match case["capability"].as_str().unwrap() {
                    "client.buildRetrievalIndex" | "client.rebuildRetrievalIndex" |
                    "client.updateRetrievalIndex" => maintenance_args(args),
                    "client.cleanupRetrievalIndex" => no_args(args),
                    "client.recommendSimilarPapers" => similarity_args(args),
                    "client.invalidateRetrievalSources" => invalidate_args(args),
                    _ => Err("invalid_request".into()),
                }
            });
            json!({"id":case["id"],"accepted":outcome.is_ok(),"reason":outcome.err(),"predicateAccepted":predicate})
        }).collect();
        std::fs::write(results_path, serde_json::to_vec(&results).unwrap()).unwrap();
        for (case, result) in cases.iter().zip(results) {
            assert_eq!(
                result["accepted"], case["valid"],
                "Retrieval case {}",
                case["id"]
            );
        }
    }

    #[test]
    fn discovery_only_runs_after_a_successful_publication() {
        assert!(publication_succeeded(&json!({"status":"ready"})));
        assert!(publication_succeeded(&json!({"status":"promoted"})));
        assert!(!publication_succeeded(&json!({"status":"paused"})));
        assert!(!publication_succeeded(&json!({"status":"missing"})));
    }

    #[test]
    fn discovery_failure_never_revokes_a_successful_result() {
        let mut result = json!({"status":"cleaned","cleaned":2,"issues":[]});
        attach_discovery_issues(&mut result, Err("discovery_unavailable".into()));
        assert_eq!(result["status"], json!("cleaned"));
        assert_eq!(result["cleaned"], json!(2));
        assert_eq!(result["issues"][0]["code"], json!("discovery_unavailable"));
        let receipt = maintenance_receipt(&result, true);
        assert_eq!(receipt["outcome"], "completed");
        assert_eq!(receipt["state_changed"], true);
        assert_eq!(receipt["retryable"], true);
        assert_eq!(receipt["diagnostics"][0]["code"], "discovery_unavailable");
    }
}

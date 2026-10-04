use crate::runtime_production_client::ProductionClientRouteEntry;
use crate::runtime_production_ports::ProductionApplications;
use serde_json::Value;

pub(crate) const EVIDENCE_SEARCH_CLIENT_ROUTES: &[ProductionClientRouteEntry] =
    &[ProductionClientRouteEntry::new(
        "client.searchEvidence",
        search,
    )];

fn search(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let [request] = args else {
        return Err("invalid_request".into());
    };
    // Leave time for the bounded partial-result projection before the outer
    // production operation deadline expires.
    let budget = crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(9))?
        .saturating_sub(std::time::Duration::from_secs(1));
    crate::runtime_deadline::with_request_deadline(budget, || {
        apps.evidence.search(request.clone(), &|| {
            crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(1)).map(|_| ())
        })
    })
}

pub(crate) fn execute_library_lexical(
    apps: &ProductionApplications,
    request: Value,
) -> Result<Value, String> {
    let budget = crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(9))?
        .saturating_sub(std::time::Duration::from_secs(1));
    crate::runtime_deadline::with_request_deadline(budget, || {
        apps.evidence.search_library_items(request, &|| {
            crate::runtime_deadline::bounded_timeout(std::time::Duration::from_secs(1)).map(|_| ())
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn route_is_read_only_and_keeps_the_closed_request_boundary() {
        let root = synthesis_test_support::TestRoot::new("evidence-route");
        let repository = synthesis_repository::Repository::open(
            root.path(),
            synthesis_repository::RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .unwrap();
        let canonical = synthesis_canonical_store::CanonicalStore::open(
            root.path(),
            synthesis_canonical_store::CanonicalIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .unwrap();
        let apps = crate::runtime_production_ports::build_production_applications(
            std::sync::Arc::new(synthesis_application::RepositoryPort::new(
                std::sync::Arc::new(std::sync::Mutex::new(repository)),
            )),
            std::sync::Arc::new(std::sync::Mutex::new(canonical)),
            std::sync::Arc::new(crate::runtime_worker_pool::NativeComputePool::new()),
            None,
            "instance".into(),
            root.path().join("webdav.json"),
        )
        .unwrap();
        assert_eq!(
            search(&apps, &[json!({"query":""})]).unwrap_err(),
            "invalid_request"
        );
        assert_eq!(
            search(&apps, &[json!({"query":"evidence"})]).unwrap()["status"],
            "unavailable"
        );
    }

    #[test]
    fn private_library_lexical_execution_is_reachable_without_a_client_route() {
        let root = synthesis_test_support::TestRoot::new("library-lexical-route");
        let repository = synthesis_repository::Repository::open(
            root.path(),
            synthesis_repository::RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .unwrap();
        let canonical = synthesis_canonical_store::CanonicalStore::open(
            root.path(),
            synthesis_canonical_store::CanonicalIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .unwrap();
        let apps = crate::runtime_production_ports::build_production_applications(
            std::sync::Arc::new(synthesis_application::RepositoryPort::new(
                std::sync::Arc::new(std::sync::Mutex::new(repository)),
            )),
            std::sync::Arc::new(std::sync::Mutex::new(canonical)),
            std::sync::Arc::new(crate::runtime_worker_pool::NativeComputePool::new()),
            None,
            "instance".into(),
            root.path().join("webdav.json"),
        )
        .unwrap();
        assert_eq!(
            execute_library_lexical(&apps, json!({"query":"wind"})).unwrap_err(),
            "invalid_request"
        );
        let result =
            execute_library_lexical(&apps, json!({"query":"wind","libraryIds":[1]})).unwrap();
        assert_eq!(result["result"]["method"], "lexical");
        assert_eq!(result["result"]["status"], "unavailable");
        assert!(result["descriptors"].as_array().unwrap().is_empty());
    }
}

use serde::Deserialize;
use std::collections::BTreeSet;

pub const PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT: &str =
    "0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372";
pub const READY_PRODUCTION_CLIENT_CAPABILITIES: &[&str] = &["client.listTopics"];

const PRODUCTION_CLIENT_CAPABILITY_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/capabilities.json"
);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientCapabilityManifest {
    schema: String,
    canonicalization: String,
    fingerprint_sha256: String,
    capabilities: Vec<String>,
}

pub fn production_client_capabilities() -> Result<Vec<String>, String> {
    let manifest: ProductionClientCapabilityManifest =
        serde_json::from_str(PRODUCTION_CLIENT_CAPABILITY_MANIFEST)
            .map_err(|_| "invalid_production_capability_manifest".to_owned())?;
    if manifest.schema != "synthesis-production-client-capabilities.v1"
        || manifest.canonicalization != "sorted-newline-terminated"
        || manifest.fingerprint_sha256 != PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
        || manifest.capabilities.len() != 95
        || manifest
            .capabilities
            .iter()
            .any(|capability| !capability.starts_with("client."))
        || manifest.capabilities.iter().collect::<BTreeSet<_>>().len()
            != manifest.capabilities.len()
    {
        return Err("invalid_production_capability_manifest".to_owned());
    }
    Ok(manifest.capabilities)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_closed_production_client_capability_manifest() {
        let capabilities = production_client_capabilities().unwrap();
        assert_eq!(capabilities.len(), 95);
        assert_eq!(
            PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
            "0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372"
        );
    }
}

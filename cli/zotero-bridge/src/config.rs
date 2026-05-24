use std::{
    env, fs,
    path::{Path, PathBuf},
};

use serde::Deserialize;
use serde_json::Value;

use crate::{args::Cli, error::CliError};

#[derive(Debug, Clone)]
pub struct BridgeConfig {
    pub endpoint: String,
    pub token: Option<String>,
    pub scope: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Profile {
    endpoint: Option<String>,
    token: Option<String>,
    token_env: Option<String>,
    auth: Option<ProfileAuth>,
    scope: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileAuth {
    token: Option<String>,
    token_env: Option<String>,
}

impl BridgeConfig {
    pub fn load(cli: &Cli) -> Result<Self, CliError> {
        let profile = load_profile(resolve_profile_path(cli.profile.as_deref()).as_deref())?;
        let endpoint = cli
            .endpoint
            .clone()
            .or_else(|| profile.as_ref().and_then(|entry| entry.endpoint.clone()))
            .ok_or_else(|| {
                CliError::config(
                    "config_missing_endpoint",
                    "Bridge endpoint is required via --endpoint, ZOTERO_BRIDGE_ENDPOINT, or profile.endpoint",
                )
            })?;

        let token = env::var("ZOTERO_BRIDGE_TOKEN")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .or_else(|| {
                profile
                    .as_ref()
                    .and_then(|entry| entry.token_env.as_ref())
                    .or_else(|| {
                        profile
                            .as_ref()
                            .and_then(|entry| entry.auth.as_ref())
                            .and_then(|auth| auth.token_env.as_ref())
                    })
                    .and_then(|name| env::var(name).ok())
                    .filter(|value| !value.trim().is_empty())
            })
            .or_else(|| {
                profile
                    .as_ref()
                    .and_then(|entry| entry.token.as_ref())
                    .or_else(|| {
                        profile
                            .as_ref()
                            .and_then(|entry| entry.auth.as_ref())
                            .and_then(|auth| auth.token.as_ref())
                    })
                    .cloned()
                    .filter(|value| !value.trim().is_empty())
            });

        Ok(Self {
            endpoint: normalize_endpoint(&endpoint)?,
            token,
            scope: profile.and_then(|entry| entry.scope),
        })
    }

    pub fn require_token(&self) -> Result<&str, CliError> {
        self.token.as_deref().ok_or_else(|| {
            CliError::config(
                "config_missing_token",
                "Bearer token is required via ZOTERO_BRIDGE_TOKEN or profile.tokenEnv",
            )
        })
    }
}

fn resolve_profile_path(explicit: Option<&Path>) -> Option<PathBuf> {
    if let Some(path) = explicit {
        return Some(path.to_path_buf());
    }
    let path = well_known_profile_path()?;
    if path.exists() {
        return Some(path);
    }
    None
}

fn well_known_profile_path() -> Option<PathBuf> {
    let platform = env::consts::OS;
    if platform == "windows" {
        let root = env::var_os("LOCALAPPDATA").or_else(|| {
            env::var_os("USERPROFILE")
                .map(|home| PathBuf::from(home).join("AppData").join("Local").into())
        })?;
        return Some(
            PathBuf::from(root)
                .join("Zotero-Skills")
                .join("bridge-profile.json"),
        );
    }
    if platform == "macos" {
        let home = env::var_os("HOME")?;
        return Some(
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("Zotero-Skills")
                .join("bridge-profile.json"),
        );
    }
    let root = env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("HOME").map(|home| PathBuf::from(home).join(".local").join("share"))
        })?;
    Some(root.join("Zotero-Skills").join("bridge-profile.json"))
}

fn load_profile(path: Option<&Path>) -> Result<Option<Profile>, CliError> {
    let Some(path) = path else {
        return Ok(None);
    };
    let content = fs::read_to_string(path).map_err(|error| {
        CliError::config("config_profile_unreadable", "Failed to read bridge profile").with_details(
            serde_json::json!({
                "path": path.display().to_string(),
                "message": error.to_string()
            }),
        )
    })?;
    let profile = serde_json::from_str::<Profile>(&content).map_err(|error| {
        CliError::config(
            "config_profile_invalid",
            "Bridge profile must be valid JSON",
        )
        .with_details(serde_json::json!({
            "path": path.display().to_string(),
            "message": error.to_string()
        }))
    })?;
    Ok(Some(profile))
}

fn normalize_endpoint(endpoint: &str) -> Result<String, CliError> {
    let trimmed = endpoint.trim().trim_end_matches('/');
    if !trimmed.starts_with("http://") {
        return Err(CliError::config(
            "config_unsupported_endpoint",
            "Only http:// Host Bridge endpoints are supported in v1",
        ));
    }
    if !trimmed.contains("/bridge/v1") {
        return Err(CliError::config(
            "config_invalid_endpoint",
            "Bridge endpoint must include /bridge/v1",
        ));
    }
    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use std::{env, fs, path::PathBuf};

    use super::{normalize_endpoint, BridgeConfig};
    use crate::{args::Cli, args::Command};

    #[test]
    fn normalizes_http_bridge_endpoint() {
        assert_eq!(
            normalize_endpoint("http://127.0.0.1:26570/bridge/v1/").unwrap(),
            "http://127.0.0.1:26570/bridge/v1"
        );
    }

    #[test]
    fn rejects_non_bridge_endpoint() {
        assert!(normalize_endpoint("http://127.0.0.1:26570").is_err());
        assert!(normalize_endpoint("https://127.0.0.1/bridge/v1").is_err());
    }

    #[test]
    fn reads_token_from_profile_auth_token() {
        let root = env::temp_dir().join(format!("zotero-bridge-profile-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let profile = root.join("profile.json");
        fs::write(
            &profile,
            r#"{
              "schema": "zotero-bridge.profile.v1",
              "endpoint": "http://127.0.0.1:26570/bridge/v1",
              "auth": { "type": "bearer", "token": "profile-token" }
            }"#,
        )
        .unwrap();
        let previous = env::var("ZOTERO_BRIDGE_TOKEN").ok();
        env::remove_var("ZOTERO_BRIDGE_TOKEN");
        let cli = Cli {
            endpoint: None,
            profile: Some(PathBuf::from(&profile)),
            command: Command::Status,
        };
        let config = BridgeConfig::load(&cli).unwrap();
        assert_eq!(config.endpoint, "http://127.0.0.1:26570/bridge/v1");
        assert_eq!(config.token.as_deref(), Some("profile-token"));
        if let Some(value) = previous {
            env::set_var("ZOTERO_BRIDGE_TOKEN", value);
        }
        let _ = fs::remove_dir_all(root);
    }
}

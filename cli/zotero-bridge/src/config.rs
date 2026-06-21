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
    pub connection_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Profile {
    endpoint: Option<String>,
    connection_mode: Option<String>,
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
            .or_else(|| env::var("ZOTERO_BRIDGE_ENDPOINT").ok())
            .filter(|value| !value.trim().is_empty())
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

        let scope = env::var("ZOTERO_BRIDGE_SCOPE")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .map(|value| {
                serde_json::from_str::<Value>(&value).map_err(|error| {
                    CliError::config(
                        "config_invalid_scope",
                        format!("ZOTERO_BRIDGE_SCOPE must be valid JSON: {error}"),
                    )
                })
            })
            .transpose()?
            .or_else(|| profile.as_ref().and_then(|entry| entry.scope.clone()));
        let connection_mode = env::var("ZOTERO_BRIDGE_CONNECTION_MODE")
            .ok()
            .and_then(|value| normalize_connection_mode(Some(&value)))
            .or_else(|| {
                profile
                    .as_ref()
                    .and_then(|entry| normalize_connection_mode(entry.connection_mode.as_deref()))
            });

        Ok(Self {
            endpoint: normalize_endpoint(&endpoint)?,
            token,
            scope,
            connection_mode,
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
                .join("zotero-agents")
                .join("bridge-profile.json"),
        );
    }
    if platform == "macos" {
        let home = env::var_os("HOME")?;
        return Some(
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("zotero-agents")
                .join("bridge-profile.json"),
        );
    }
    let root = env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("HOME").map(|home| PathBuf::from(home).join(".local").join("share"))
        })?;
    Some(root.join("zotero-agents").join("bridge-profile.json"))
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

fn normalize_connection_mode(value: Option<&str>) -> Option<String> {
    match value.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "local" => Some("local".to_string()),
        "remote" => Some("remote".to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use std::{
        env, fs,
        path::PathBuf,
        sync::{Mutex, OnceLock},
    };

    use super::{normalize_endpoint, BridgeConfig};
    use crate::{args::Cli, args::Command};

    static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn env_lock() -> &'static Mutex<()> {
        ENV_LOCK.get_or_init(|| Mutex::new(()))
    }

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
        let _guard = env_lock().lock().unwrap();
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

    #[test]
    fn endpoint_env_overrides_profile_endpoint() {
        let _guard = env_lock().lock().unwrap();
        let root =
            env::temp_dir().join(format!("zotero-bridge-profile-env-{}", std::process::id()));
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
        let previous_endpoint = env::var("ZOTERO_BRIDGE_ENDPOINT").ok();
        let previous_token = env::var("ZOTERO_BRIDGE_TOKEN").ok();
        env::set_var(
            "ZOTERO_BRIDGE_ENDPOINT",
            "http://192.0.2.25:27655/bridge/v1",
        );
        env::remove_var("ZOTERO_BRIDGE_TOKEN");
        let cli = Cli {
            endpoint: None,
            profile: Some(PathBuf::from(&profile)),
            command: Command::Status,
        };
        let config = BridgeConfig::load(&cli).unwrap();
        assert_eq!(config.endpoint, "http://192.0.2.25:27655/bridge/v1");
        assert_eq!(config.token.as_deref(), Some("profile-token"));
        if let Some(value) = previous_endpoint {
            env::set_var("ZOTERO_BRIDGE_ENDPOINT", value);
        } else {
            env::remove_var("ZOTERO_BRIDGE_ENDPOINT");
        }
        if let Some(value) = previous_token {
            env::set_var("ZOTERO_BRIDGE_TOKEN", value);
        } else {
            env::remove_var("ZOTERO_BRIDGE_TOKEN");
        }
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn accepts_profile_connection_mode() {
        let _guard = env_lock().lock().unwrap();
        let root =
            env::temp_dir().join(format!("zotero-bridge-profile-mode-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let profile = root.join("profile.json");
        fs::write(
            &profile,
            r#"{
              "schema": "zotero-bridge.profile.v1",
              "endpoint": "http://127.0.0.1:26570/bridge/v1",
              "connectionMode": "remote",
              "auth": { "type": "bearer", "token": "profile-token" }
            }"#,
        )
        .unwrap();
        let previous_endpoint = env::var("ZOTERO_BRIDGE_ENDPOINT").ok();
        let previous_token = env::var("ZOTERO_BRIDGE_TOKEN").ok();
        let previous_mode = env::var("ZOTERO_BRIDGE_CONNECTION_MODE").ok();
        env::remove_var("ZOTERO_BRIDGE_ENDPOINT");
        env::remove_var("ZOTERO_BRIDGE_TOKEN");
        env::remove_var("ZOTERO_BRIDGE_CONNECTION_MODE");
        let cli = Cli {
            endpoint: None,
            profile: Some(PathBuf::from(&profile)),
            command: Command::Status,
        };
        let config = BridgeConfig::load(&cli).unwrap();
        assert_eq!(config.endpoint, "http://127.0.0.1:26570/bridge/v1");
        assert_eq!(config.token.as_deref(), Some("profile-token"));
        assert_eq!(config.connection_mode.as_deref(), Some("remote"));
        if let Some(value) = previous_endpoint {
            env::set_var("ZOTERO_BRIDGE_ENDPOINT", value);
        }
        if let Some(value) = previous_token {
            env::set_var("ZOTERO_BRIDGE_TOKEN", value);
        }
        if let Some(value) = previous_mode {
            env::set_var("ZOTERO_BRIDGE_CONNECTION_MODE", value);
        }
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn connection_mode_env_overrides_profile_connection_mode() {
        let _guard = env_lock().lock().unwrap();
        let root = env::temp_dir().join(format!(
            "zotero-bridge-profile-mode-env-{}",
            std::process::id()
        ));
        fs::create_dir_all(&root).unwrap();
        let profile = root.join("profile.json");
        fs::write(
            &profile,
            r#"{
              "schema": "zotero-bridge.profile.v1",
              "endpoint": "http://127.0.0.1:26570/bridge/v1",
              "connectionMode": "local",
              "auth": { "type": "bearer", "token": "profile-token" }
            }"#,
        )
        .unwrap();
        let previous_endpoint = env::var("ZOTERO_BRIDGE_ENDPOINT").ok();
        let previous_token = env::var("ZOTERO_BRIDGE_TOKEN").ok();
        let previous_mode = env::var("ZOTERO_BRIDGE_CONNECTION_MODE").ok();
        env::remove_var("ZOTERO_BRIDGE_ENDPOINT");
        env::remove_var("ZOTERO_BRIDGE_TOKEN");
        env::set_var("ZOTERO_BRIDGE_CONNECTION_MODE", "remote");
        let cli = Cli {
            endpoint: None,
            profile: Some(PathBuf::from(&profile)),
            command: Command::Status,
        };
        let config = BridgeConfig::load(&cli).unwrap();
        assert_eq!(config.connection_mode.as_deref(), Some("remote"));
        if let Some(value) = previous_endpoint {
            env::set_var("ZOTERO_BRIDGE_ENDPOINT", value);
        }
        if let Some(value) = previous_token {
            env::set_var("ZOTERO_BRIDGE_TOKEN", value);
        }
        if let Some(value) = previous_mode {
            env::set_var("ZOTERO_BRIDGE_CONNECTION_MODE", value);
        } else {
            env::remove_var("ZOTERO_BRIDGE_CONNECTION_MODE");
        }
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn scope_env_overrides_profile_scope() {
        let _guard = env_lock().lock().unwrap();
        let root = env::temp_dir().join(format!(
            "zotero-bridge-profile-scope-env-{}",
            std::process::id()
        ));
        fs::create_dir_all(&root).unwrap();
        let profile = root.join("profile.json");
        fs::write(
            &profile,
            r#"{
              "schema": "zotero-bridge.profile.v1",
              "endpoint": "http://127.0.0.1:26570/bridge/v1",
              "scope": { "kind": "acp-skill-run", "requestId": "profile-run" },
              "auth": { "type": "bearer", "token": "profile-token" }
            }"#,
        )
        .unwrap();
        let previous_scope = env::var("ZOTERO_BRIDGE_SCOPE").ok();
        let previous_endpoint = env::var("ZOTERO_BRIDGE_ENDPOINT").ok();
        let previous_token = env::var("ZOTERO_BRIDGE_TOKEN").ok();
        env::remove_var("ZOTERO_BRIDGE_ENDPOINT");
        env::remove_var("ZOTERO_BRIDGE_TOKEN");
        env::set_var(
            "ZOTERO_BRIDGE_SCOPE",
            r#"{"kind":"skillrunner-run","requestId":"skillrunner-run-1"}"#,
        );
        let cli = Cli {
            endpoint: None,
            profile: Some(PathBuf::from(&profile)),
            command: Command::Status,
        };
        let config = BridgeConfig::load(&cli).unwrap();
        assert_eq!(
            config.scope.unwrap(),
            serde_json::json!({
                "kind": "skillrunner-run",
                "requestId": "skillrunner-run-1"
            })
        );
        if let Some(value) = previous_scope {
            env::set_var("ZOTERO_BRIDGE_SCOPE", value);
        } else {
            env::remove_var("ZOTERO_BRIDGE_SCOPE");
        }
        if let Some(value) = previous_endpoint {
            env::set_var("ZOTERO_BRIDGE_ENDPOINT", value);
        }
        if let Some(value) = previous_token {
            env::set_var("ZOTERO_BRIDGE_TOKEN", value);
        }
        let _ = fs::remove_dir_all(root);
    }
}

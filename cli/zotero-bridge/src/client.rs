use serde_json::{Map, Value};

#[path = "transport.rs"]
mod transport;

use crate::{config::BridgeConfig, contract, error::CliError};

pub use transport::DownloadResponse;

pub fn last_operation_id() -> Option<String> {
    transport::last_operation_id()
}

pub fn health(config: &BridgeConfig) -> Result<Value, CliError> {
    contract::assert_endpoint_target("GET", "/health")?;
    transport::health(config)
}

pub fn call(config: &BridgeConfig, capability: &str, input: Value) -> Result<Value, CliError> {
    contract::assert_capability_target(capability)?;
    contract::validate_capability_input(capability, &input)?;
    let result = transport::call(config, capability, input)?;
    if result.get("capability").and_then(Value::as_str) != Some(capability) {
        return Err(CliError::protocol(
            "command_result_contract_violation",
            "Host capability result identifies a different capability",
        ));
    }
    contract::validate_capability_output(capability, result.get("data").unwrap_or(&Value::Null))?;
    Ok(result)
}

pub fn call_current(
    config: &BridgeConfig,
    arguments: Map<String, Value>,
) -> Result<Value, CliError> {
    let (capability, input) = contract::compose_current_command_payload(&arguments)?;
    call(config, &capability, input)
}

pub fn get(config: &BridgeConfig, path: &str) -> Result<Value, CliError> {
    contract::assert_endpoint_target("GET", path)?;
    transport::get(config, path)
}

pub fn post(config: &BridgeConfig, path: &str, body: Value) -> Result<Value, CliError> {
    contract::assert_endpoint_target("POST", path)?;
    transport::post(config, path, body)
}

pub fn upload(
    config: &BridgeConfig,
    path: &str,
    bytes: &[u8],
    display_name: Option<&str>,
    content_type: Option<&str>,
) -> Result<Value, CliError> {
    contract::assert_endpoint_target("POST", path)?;
    transport::upload(config, path, bytes, display_name, content_type)
}

pub fn download(config: &BridgeConfig, path: &str) -> Result<DownloadResponse, CliError> {
    contract::assert_endpoint_target("GET", path)?;
    transport::download(config, path)
}

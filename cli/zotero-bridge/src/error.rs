use serde::Serialize;
use serde_json::Value;

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    Usage,
    Config,
    Connection,
    Auth,
    Permission,
    Validation,
    Capability,
    Workflow,
    Download,
    Protocol,
    Internal,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorPayload {
    pub code: String,
    pub category: ErrorCategory,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

#[derive(Debug, Clone)]
pub struct CliError {
    pub code: String,
    pub category: ErrorCategory,
    pub message: String,
    pub details: Option<Value>,
}

impl CliError {
    pub fn new(
        code: impl Into<String>,
        category: ErrorCategory,
        message: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            category,
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }

    pub fn config(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Config, message)
    }

    pub fn validation(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Validation, message)
    }

    pub fn connection(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Connection, message)
    }

    pub fn protocol(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Protocol, message)
    }

    pub fn auth(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Auth, message)
    }

    pub fn internal(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self::new(code, ErrorCategory::Internal, message)
    }

    pub fn exit_code(&self) -> i32 {
        match self.category {
            ErrorCategory::Usage => 2,
            ErrorCategory::Config => 3,
            ErrorCategory::Connection => 4,
            ErrorCategory::Auth => 5,
            ErrorCategory::Permission => 6,
            ErrorCategory::Validation => 7,
            ErrorCategory::Capability => 8,
            ErrorCategory::Workflow => 9,
            ErrorCategory::Download => 10,
            ErrorCategory::Protocol => 11,
            ErrorCategory::Internal => 70,
        }
    }

    pub fn to_payload(&self) -> ErrorPayload {
        ErrorPayload {
            code: self.code.clone(),
            category: self.category,
            message: self.message.clone(),
            details: self.details.clone(),
        }
    }
}

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
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    pub code: String,
    pub category: ErrorCategory,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
    pub retryable: bool,
    pub state_changed: bool,
    pub handle_consumed: bool,
    pub safe_next_actions: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_command: Option<String>,
}

#[derive(Debug, Clone)]
pub struct CliError {
    pub code: String,
    pub category: ErrorCategory,
    pub message: String,
    pub details: Option<Value>,
    pub next_command: Option<String>,
    pub retryable: Option<bool>,
    pub state_changed: Option<bool>,
    pub handle_consumed: Option<bool>,
    pub safe_next_actions: Option<Vec<String>>,
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
            next_command: None,
            retryable: None,
            state_changed: None,
            handle_consumed: None,
            safe_next_actions: None,
        }
    }

    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }

    pub fn with_next_command(mut self, command: impl Into<String>) -> Self {
        self.next_command = Some(command.into());
        self
    }

    pub fn with_control(
        mut self,
        retryable: Option<bool>,
        state_changed: Option<bool>,
        handle_consumed: Option<bool>,
        safe_next_actions: Option<Vec<String>>,
    ) -> Self {
        self.retryable = retryable;
        self.state_changed = state_changed;
        self.handle_consumed = handle_consumed;
        self.safe_next_actions = safe_next_actions;
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
        let retryable = self.retryable.unwrap_or_else(|| {
            matches!(
                self.category,
                ErrorCategory::Connection | ErrorCategory::Download
            )
        });
        let safe_next_actions = self.safe_next_actions.clone().unwrap_or_else(|| {
            if retryable {
                vec!["bridge status".to_string(), "retry command".to_string()]
            } else {
                vec!["surface describe".to_string()]
            }
        });
        ErrorPayload {
            code: self.code.clone(),
            category: self.category,
            message: self.message.clone(),
            details: self.details.clone(),
            retryable,
            state_changed: self.state_changed.unwrap_or(false),
            handle_consumed: self.handle_consumed.unwrap_or(false),
            safe_next_actions,
            next_command: self.next_command.clone(),
        }
    }
}

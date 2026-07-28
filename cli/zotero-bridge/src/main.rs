mod args;
mod client;
mod commands;
mod config;
mod contract;
mod error;
mod output;
mod schema;
mod surface;

use clap::{
    error::{ContextKind, ErrorKind},
    CommandFactory, FromArgMatches,
};

use args::{Cli, Command};
use error::CliError;
use output::{print_error, print_success};

fn clap_context(error: &clap::Error, kind: ContextKind) -> Option<String> {
    error
        .get(kind)
        .map(ToString::to_string)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn clap_error(error: clap::Error, argv: &[String]) -> CliError {
    let (code, base_message) = match error.kind() {
        ErrorKind::MissingRequiredArgument => (
            "cli_missing_argument",
            "A required command argument is missing",
        ),
        ErrorKind::UnknownArgument => (
            "cli_unknown_argument",
            "The invocation contains an unknown argument",
        ),
        ErrorKind::ArgumentConflict => (
            "cli_argument_conflict",
            "The invocation contains conflicting arguments",
        ),
        ErrorKind::InvalidValue | ErrorKind::ValueValidation => (
            "cli_invalid_value",
            "A command argument has an invalid value",
        ),
        ErrorKind::MissingSubcommand => (
            "cli_missing_subcommand",
            "A required command group or subcommand is missing",
        ),
        _ => ("cli_usage_error", "Command arguments are invalid"),
    };
    let argument_id = clap_context(&error, ContextKind::InvalidArg)
        .or_else(|| clap_context(&error, ContextKind::InvalidSubcommand));
    let suggested = clap_context(&error, ContextKind::SuggestedArg)
        .or_else(|| clap_context(&error, ContextKind::SuggestedSubcommand))
        .or_else(|| clap_context(&error, ContextKind::SuggestedValue));
    let conflict = clap_context(&error, ContextKind::PriorArg);
    let mut violation = serde_json::Map::new();
    violation.insert("reason".to_string(), serde_json::json!(code));
    if let Some(argument_id) = &argument_id {
        violation.insert("property".to_string(), serde_json::json!(argument_id));
    }
    if let Some(conflict) = conflict {
        violation.insert("conflictsWith".to_string(), serde_json::json!(conflict));
    }
    violation.insert(
        "suggestions".to_string(),
        serde_json::json!(suggested
            .into_iter()
            .chain(std::iter::once(
                "run the same command with --help".to_string()
            ))
            .collect::<Vec<_>>()),
    );
    let mut details = serde_json::Map::new();
    details.insert(
        "schema".to_string(),
        serde_json::json!("host-bridge.argument-error.v1"),
    );
    details.insert("phase".to_string(), serde_json::json!("argv"));
    if let Ok(command) = schema::leaf_path(argv) {
        details.insert("command".to_string(), serde_json::json!(command));
    }
    if let Some(argument_id) = &argument_id {
        details.insert("argumentId".to_string(), serde_json::json!(argument_id));
    }
    details.insert("violations".to_string(), serde_json::json!([violation]));
    details.insert("truncated".to_string(), serde_json::json!(false));
    let message = argument_id
        .as_deref()
        .map(|argument| format!("{base_message}: {argument}"))
        .unwrap_or_else(|| base_message.to_string());
    CliError::new(code, error::ErrorCategory::Usage, message)
        .with_details(serde_json::Value::Object(details))
        .with_next_command("zotero-bridge --help")
}

fn main() {
    let argv = std::env::args().collect::<Vec<_>>();
    if schema::is_schema_request(&argv) {
        match schema::run(&argv) {
            Ok(data) => print_success(data),
            Err(error) => {
                let code = error.exit_code();
                print_error(error);
                std::process::exit(code);
            }
        }
        return;
    }

    let mut command = Cli::command();
    schema::augment_command_help(&mut command);
    let cli = match command
        .try_get_matches_from(argv.clone())
        .and_then(|matches| Cli::from_arg_matches(&matches))
    {
        Ok(cli) => cli,
        Err(error)
            if matches!(
                error.kind(),
                ErrorKind::DisplayHelp | ErrorKind::DisplayVersion
            ) =>
        {
            let _ = error.print();
            return;
        }
        Err(error) => {
            let cli_error = clap_error(error, &argv);
            print_error(cli_error);
            std::process::exit(2);
        }
    };
    if let Ok(command) = schema::leaf_path(&argv) {
        contract::set_current_command(command);
    }
    let result = run(cli).and_then(|data| {
        contract::validate_command_result(&data)?;
        Ok(data)
    });
    match result {
        Ok(data) => {
            print_success(data);
        }
        Err(error) => {
            let code = error.exit_code();
            print_error(error);
            std::process::exit(code);
        }
    }
}

fn run(cli: Cli) -> Result<serde_json::Value, CliError> {
    let command = cli.command.clone();
    if let Command::Surface(args) = command {
        return surface::run(args);
    }
    let config = config::BridgeConfig::load(&cli)?;
    match command {
        Command::Surface(_) => unreachable!("surface commands return before configuration loading"),
        Command::Bridge(args) => commands::bridge(&config, args),
        Command::Call(args) => commands::call(&config, args),
        Command::Library(args) => commands::library(&config, args),
        Command::Context(args) => commands::context(&config, args),
        Command::Synthesis(args) => commands::synthesis(&config, args),
        Command::Mutation(args) => commands::mutation(&config, args),
        Command::Workflow(args) => commands::workflow(&config, args),
        Command::Run(args) => commands::run(&config, args),
        Command::File(args) => commands::file(&config, args),
        Command::Product(args) => commands::product(&config, args),
        Command::Debug(args) => commands::debug(&config, args),
        Command::Operation(args) => commands::operation(&config, args),
    }
}

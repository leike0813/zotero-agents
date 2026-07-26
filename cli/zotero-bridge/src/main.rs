mod args;
mod client;
mod commands;
mod config;
mod error;
mod output;
mod schema;
mod surface;

use clap::{error::ErrorKind, CommandFactory, FromArgMatches};

use args::{Cli, Command};
use error::CliError;
use output::{print_error, print_success};

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
        .try_get_matches_from(argv)
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
            let kind = format!("{:?}", error.kind());
            let cli_error = CliError::new(
                "cli_usage_error",
                error::ErrorCategory::Usage,
                "Command arguments are invalid",
            )
            .with_details(serde_json::json!({ "kind": kind }));
            print_error(cli_error);
            std::process::exit(2);
        }
    };
    let result = run(cli);
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

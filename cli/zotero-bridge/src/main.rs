mod args;
mod client;
mod commands;
mod config;
mod error;
mod output;
mod surface;

use clap::Parser;

use args::{Cli, Command};
use error::CliError;
use output::{print_error, print_success};

fn main() {
    let cli = Cli::parse();
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
    }
}

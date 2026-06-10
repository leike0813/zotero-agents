mod args;
mod client;
mod commands;
mod config;
mod error;
mod output;

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
    let config = config::BridgeConfig::load(&cli)?;
    match command {
        Command::Status => commands::status(&config),
        Command::Manifest => commands::manifest(&config),
        Command::Call(args) => commands::call(&config, args),
        Command::Item(args) => commands::item(&config, args),
        Command::Note(args) => commands::note(&config, args),
        Command::Topics(args) => commands::topics(&config, args),
        Command::Schemas(args) => commands::schemas(&config, args),
        Command::Concepts(args) => commands::concepts(&config, args),
        Command::CitationGraph(args) => commands::citation_graph(&config, args),
        Command::LibraryIndex(args) => commands::library_index(&config, args),
        Command::Resolvers(args) => commands::resolvers(&config, args),
        Command::ReferenceIndex(args) => commands::reference_index(&config, args),
        Command::PaperArtifacts(args) => commands::paper_artifacts(&config, args),
        Command::Insights(args) => commands::insights(&config, args),
        Command::Literature(args) => commands::literature(&config, args),
        Command::Workflow(args) => commands::workflow(&config, args),
        Command::Task(args) => commands::task(&config, args),
        Command::File(args) => commands::file(&config, args),
        Command::Debug(args) => commands::debug(&config, args),
    }
}

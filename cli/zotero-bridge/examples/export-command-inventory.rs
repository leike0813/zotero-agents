#[path = "../src/args.rs"]
mod args;

use clap::{Arg, Command, CommandFactory};
use serde_json::{json, Value};

fn argument(arg: &Arg, position: Option<usize>) -> Value {
    json!({
        "id": arg.get_id().as_str(),
        "long": arg.get_long(),
        "short": arg.get_short().map(|value| value.to_string()),
        "index": arg.get_index(),
        "position": position,
        "required": arg.is_required_set(),
        "takesValue": arg.get_action().takes_values(),
        "global": arg.is_global_set(),
        "help": arg.get_help().map(|value| value.to_string()),
        "valueNames": arg
            .get_value_names()
            .map(|values| values.iter().map(|value| value.to_string()).collect::<Vec<_>>())
            .unwrap_or_default(),
    })
}

fn visit(command: &Command, path: &[String], leaves: &mut Vec<Value>) {
    let children = command
        .get_subcommands()
        .filter(|child| child.get_name() != "help")
        .collect::<Vec<_>>();
    if children.is_empty() {
        leaves.push(json!({
            "command": path.join(" "),
            "argv": path,
            "about": command
                .get_about()
                .map(|value| value.to_string())
                .unwrap_or_default(),
            "arguments": command
                .get_arguments()
                .map(|arg| {
                    let position = command
                        .get_positionals()
                        .position(|positional| positional.get_id() == arg.get_id())
                        .map(|index| index + 1);
                    argument(arg, position)
                })
                .collect::<Vec<_>>(),
        }));
        return;
    }

    for child in children {
        let mut child_path = path.to_vec();
        child_path.push(child.get_name().to_string());
        visit(child, &child_path, leaves);
    }
}

fn main() {
    let root = args::Cli::command();
    let global_arguments = root
        .get_arguments()
        .filter(|arg| arg.is_global_set())
        .map(|arg| argument(arg, None))
        .collect::<Vec<_>>();
    let mut commands = Vec::new();
    for command in root
        .get_subcommands()
        .filter(|command| command.get_name() != "help")
    {
        visit(command, &[command.get_name().to_string()], &mut commands);
    }
    commands.sort_by(|left, right| left["command"].as_str().cmp(&right["command"].as_str()));
    println!(
        "{}",
        serde_json::to_string_pretty(&json!({
            "schema": "zotero-bridge.command-inventory.v1",
            "globalArguments": global_arguments,
            "commands": commands,
        }))
        .expect("serialize command inventory")
    );
}

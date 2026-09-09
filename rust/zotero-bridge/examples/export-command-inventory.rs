#[path = "../src/args.rs"]
mod args;

use clap::{Arg, Command, CommandFactory};
use serde_json::{json, Value};

fn argument(command: &Command, arg: &Arg, position: Option<usize>) -> Value {
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
        "longHelp": arg.get_long_help().map(|value| value.to_string()),
        "env": arg.get_env().map(|value| value.to_string_lossy().to_string()),
        "aliases": arg
            .get_aliases()
            .unwrap_or_default()
            .into_iter()
            .map(str::to_string)
            .collect::<Vec<_>>(),
        "defaultValues": arg
            .get_default_values()
            .iter()
            .map(|value| value.to_string_lossy().to_string())
            .collect::<Vec<_>>(),
        "valueNames": arg
            .get_value_names()
            .map(|values| values.iter().map(|value| value.to_string()).collect::<Vec<_>>())
            .unwrap_or_default(),
        "possibleValues": arg
            .get_value_parser()
            .possible_values()
            .map(|values| values.map(|value| value.get_name().to_string()).collect::<Vec<_>>())
            .unwrap_or_default(),
        "conflictsWith": command
            .get_arg_conflicts_with(arg)
            .iter()
            .map(|entry| entry.get_id().as_str())
            .collect::<Vec<_>>(),
        "repeatable": matches!(arg.get_action(), clap::ArgAction::Append | clap::ArgAction::Count),
        "numArgs": arg.get_num_args().map(|value| value.to_string()),
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
                    argument(command, arg, position)
                })
                .collect::<Vec<_>>(),
            "argumentGroups": command
                .get_groups()
                .map(|group| json!({
                    "id": group.get_id().as_str(),
                    "arguments": group.get_args().map(|id| id.as_str()).collect::<Vec<_>>(),
                    "required": group.is_required_set(),
                }))
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
        .map(|arg| argument(&root, arg, None))
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

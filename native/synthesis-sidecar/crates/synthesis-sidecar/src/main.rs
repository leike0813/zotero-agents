mod runtime_cli;

use std::path::Path;

fn main() {
    if let Err(error) = runtime_cli::run(synthesis_sidecar::worker, |config_path| {
        synthesis_sidecar::serve(Path::new(config_path)).map_err(|error| error.to_string())
    }) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}

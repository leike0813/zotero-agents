use std::path::Path;

#[cfg(unix)]
use std::fs::File;

#[cfg(unix)]
pub(crate) fn sync_directory(path: &Path) -> Result<(), String> {
    File::open(path)
        .and_then(|file| file.sync_all())
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
pub(crate) fn sync_directory(_path: &Path) -> Result<(), String> {
    // Windows requires a writable directory handle for FlushFileBuffers. The
    // file contents are synchronized before rename, while recovery records
    // own the remaining metadata durability boundary.
    Ok(())
}

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import platform
import shutil
import stat
import sys
from pathlib import Path


def platform_dir() -> tuple[str, str]:
    system = platform.system().lower()
    machine = platform.machine().lower()
    if system == "windows":
        return "win32-x64", "zotero-bridge.exe"
    if system == "darwin":
        return ("darwin-arm64" if machine in {"arm64", "aarch64"} else "darwin-x64"), "zotero-bridge"
    if system == "linux":
        if machine in {"aarch64", "arm64"}:
            return "linux-arm64", "zotero-bridge"
        if machine.startswith("arm"):
            return "linux-arm", "zotero-bridge"
        if machine in {"i386", "i686", "x86"}:
            return "linux-x86", "zotero-bridge"
        return "linux-x64", "zotero-bridge"
    raise SystemExit(f"unsupported platform: {system}/{machine}")


def default_install_dir() -> Path:
    override = os.environ.get("ZOTERO_BRIDGE_INSTALL_DIR")
    if override:
        return Path(override).expanduser()
    state_override = os.environ.get("ZOTERO_LIBRARIAN_STATE_DIR")
    if state_override:
        return Path(state_override).expanduser() / ".zotero-bridge" / "bin"
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        return Path(hermes_home).expanduser() / "zotero-librarian" / ".zotero-bridge" / "bin"
    return Path.cwd() / ".zotero-bridge" / "bin"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install the packaged zotero-bridge binary")
    parser.add_argument("--source-root", default=Path(__file__).resolve().parents[1])
    parser.add_argument("--install-dir", default=None)
    parser.add_argument("--print-path", action="store_true")
    args = parser.parse_args(argv)

    source_root = Path(args.source_root)
    platform_name, binary_name = platform_dir()
    source = source_root / "assets" / "zotero-bridge" / "bin" / platform_name / binary_name
    if not source.exists():
        raise SystemExit(f"missing packaged zotero-bridge binary for {platform_name}")

    install_dir = Path(args.install_dir).expanduser() if args.install_dir else default_install_dir()
    install_dir.mkdir(parents=True, exist_ok=True)
    target = install_dir / binary_name
    shutil.copy2(source, target)
    if binary_name == "zotero-bridge":
        target.chmod(target.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    if args.print_path:
        print(str(target))
    else:
        print(f"installed {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

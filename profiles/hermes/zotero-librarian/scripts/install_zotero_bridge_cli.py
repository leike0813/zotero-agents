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


def current_well_known_profile() -> Path:
    system = platform.system().lower()
    home = Path.home()
    if system == "windows":
        local_app_data = os.environ.get("LOCALAPPDATA")
        base = Path(local_app_data).expanduser() if local_app_data else home / "AppData" / "Local"
        return base / "zotero-agents" / "bridge-profile.json"
    if system == "darwin":
        return home / "Library" / "Application Support" / "zotero-agents" / "bridge-profile.json"
    xdg_data_home = os.environ.get("XDG_DATA_HOME")
    base = Path(xdg_data_home).expanduser() if xdg_data_home else home / ".local" / "share"
    return base / "zotero-agents" / "bridge-profile.json"


def infer_host_home_from_hermes_home(home: Path) -> Path | None:
    resolved = home.expanduser().resolve()
    parts = resolved.parts
    if ".hermes" not in parts:
        return None
    index = parts.index(".hermes")
    if index <= 0:
        return None
    return Path(*parts[:index])


def host_well_known_profile(host_home: Path) -> Path:
    system = platform.system().lower()
    if system == "windows":
        host_local_app_data = os.environ.get("ZOTERO_BRIDGE_HOST_LOCALAPPDATA")
        base = (
            Path(host_local_app_data).expanduser()
            if host_local_app_data
            else host_home / "AppData" / "Local"
        )
        return base / "zotero-agents" / "bridge-profile.json"
    if system == "darwin":
        return host_home / "Library" / "Application Support" / "zotero-agents" / "bridge-profile.json"
    host_xdg_data_home = os.environ.get("ZOTERO_BRIDGE_HOST_XDG_DATA_HOME")
    base = Path(host_xdg_data_home).expanduser() if host_xdg_data_home else host_home / ".local" / "share"
    return base / "zotero-agents" / "bridge-profile.json"


def resolve_host_profile(host_profile: str | None, host_home: str | None) -> Path | None:
    explicit_profile = host_profile or os.environ.get("ZOTERO_BRIDGE_HOST_PROFILE")
    if explicit_profile:
        return Path(explicit_profile).expanduser()

    explicit_home = host_home or os.environ.get("ZOTERO_BRIDGE_HOST_HOME")
    if explicit_home:
        return host_well_known_profile(Path(explicit_home).expanduser())

    inferred_home = infer_host_home_from_hermes_home(Path.home())
    if inferred_home:
        return host_well_known_profile(inferred_home)
    return None


def link_well_known_profile(
    host_profile: str | None,
    host_home: str | None,
    force: bool,
) -> None:
    target = current_well_known_profile()
    source = resolve_host_profile(host_profile, host_home)
    if source is None:
        print(
            "skipped Host Bridge profile link: set ZOTERO_BRIDGE_HOST_PROFILE "
            "or ZOTERO_BRIDGE_HOST_HOME when Hermes home cannot be inferred"
        )
        return

    source = source.resolve()
    if not source.exists():
        print(f"skipped Host Bridge profile link: source profile does not exist: {source}")
        return

    target_parent = target.parent
    target_parent.mkdir(parents=True, exist_ok=True)

    if target.exists() or target.is_symlink():
        if target.is_symlink() and target.resolve() == source:
            print(f"Host Bridge profile link already exists: {target}")
            return
        if not force:
            print(
                "skipped Host Bridge profile link: target already exists "
                f"({target}); pass --force-profile-link to replace it"
            )
            return
        target.unlink()

    target.symlink_to(source)
    print(f"linked Host Bridge profile: {target} -> {source}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Install the packaged zotero-bridge binary")
    parser.add_argument("--source-root", default=Path(__file__).resolve().parents[1])
    parser.add_argument("--install-dir", default=None)
    parser.add_argument("--print-path", action="store_true")
    parser.add_argument(
        "--link-well-known-profile",
        dest="link_well_known_profile",
        action="store_true",
        default=True,
        help="Link the Hermes well-known Host Bridge profile to the host profile",
    )
    parser.add_argument(
        "--no-link-well-known-profile",
        dest="link_well_known_profile",
        action="store_false",
        help="Install only the binary and do not create the Host Bridge profile link",
    )
    parser.add_argument(
        "--host-home",
        default=None,
        help="Host user home used to locate the Host Bridge well-known profile",
    )
    parser.add_argument(
        "--host-profile",
        default=None,
        help="Explicit host bridge-profile.json path",
    )
    parser.add_argument(
        "--force-profile-link",
        action="store_true",
        help="Replace an existing Hermes well-known profile path",
    )
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

    if args.link_well_known_profile:
        link_well_known_profile(
            args.host_profile,
            args.host_home,
            args.force_profile_link,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env sh
set -eu

yes_flag=0
json_flag=0
dry_run=0
install_dir="${ZOTERO_BRIDGE_INSTALL_DIR:-}"
profile_path=""
endpoint=""
token_env="ZOTERO_BRIDGE_TOKEN"
connection_mode=""
write_profile=0
add_path=0
no_add_path=0

die() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -y|--yes) yes_flag=1; shift ;;
    --json) json_flag=1; shift ;;
    --dry-run) dry_run=1; shift ;;
    --write-profile) write_profile=1; shift ;;
    --add-path) add_path=1; shift ;;
    --no-add-path) no_add_path=1; shift ;;
    --install-dir)
      [ "$#" -ge 2 ] || die "--install-dir requires a value"
      install_dir="$2"; shift 2 ;;
    --install-dir=*)
      install_dir="${1#*=}"; shift ;;
    --profile)
      [ "$#" -ge 2 ] || die "--profile requires a value"
      profile_path="$2"; shift 2 ;;
    --profile=*)
      profile_path="${1#*=}"; shift ;;
    --endpoint)
      [ "$#" -ge 2 ] || die "--endpoint requires a value"
      endpoint="$2"; shift 2 ;;
    --endpoint=*)
      endpoint="${1#*=}"; shift ;;
    --token-env)
      [ "$#" -ge 2 ] || die "--token-env requires a value"
      token_env="$2"; shift 2 ;;
    --token-env=*)
      token_env="${1#*=}"; shift ;;
    --connection-mode)
      [ "$#" -ge 2 ] || die "--connection-mode requires a value"
      connection_mode="$2"; shift 2 ;;
    --connection-mode=*)
      connection_mode="${1#*=}"; shift ;;
    --platform|--platform=*)
      die "Platform override is not supported; installer detects the current platform." ;;
    *)
      die "Unknown argument: $1" ;;
  esac
done

[ "$add_path" -eq 0 ] || [ "$no_add_path" -eq 0 ] || die "--add-path and --no-add-path cannot be used together"
case "$connection_mode" in
  ""|local|remote) ;;
  *) die "--connection-mode must be local or remote" ;;
esac
[ -n "$token_env" ] || token_env="ZOTERO_BRIDGE_TOKEN"

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
bin_root="$script_dir/bin"
if [ ! -d "$bin_root" ] && [ -d "$script_dir/addon/bin" ]; then
  bin_root="$script_dir/addon/bin"
fi
profile_template="$script_dir/assets/profile.template.json"
if [ ! -f "$profile_template" ] && [ -f "$script_dir/skills_builtin/zotero-bridge-cli/assets/profile.template.json" ]; then
  profile_template="$script_dir/skills_builtin/zotero-bridge-cli/assets/profile.template.json"
fi
os_name=$(uname -s 2>/dev/null || printf unknown)
arch_name=$(uname -m 2>/dev/null || printf unknown)
case "$os_name:$arch_name" in
  Darwin:arm64|Darwin:aarch64) platform="darwin-arm64" ;;
  Darwin:*) platform="darwin-x64" ;;
  Linux:i386|Linux:i486|Linux:i586|Linux:i686) platform="linux-x86" ;;
  Linux:armv7*|Linux:armv6*) platform="linux-arm" ;;
  Linux:aarch64|Linux:arm64) platform="linux-arm64" ;;
  Linux:*) platform="linux-x64" ;;
  *) die "Unsupported OS/arch: $os_name $arch_name" ;;
esac

binary_name="zotero-bridge"
source_binary="$bin_root/$platform/$binary_name"
source_sha="$source_binary.sha256"
if [ ! -f "$source_binary" ]; then
  available=""
  if [ -d "$bin_root" ]; then
    available=$(find "$bin_root" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | tr '\n' ' ')
  fi
  die "No zotero-bridge binary for platform $platform. Available platforms: $available"
fi
[ -f "$source_sha" ] || die "Missing checksum file: $source_sha"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    die "sha256sum or shasum is required"
  fi
}

in_path() {
  case ":$PATH:" in
    *":$1:"*) return 0 ;;
    *) return 1 ;;
  esac
}

is_writable_dir() {
  dir="$1"
  [ -d "$dir" ] || return 1
  probe="$dir/.zotero-bridge-install-probe-$$"
  ( : > "$probe" ) 2>/dev/null || return 1
  rm -f "$probe"
  return 0
}

choose_install_dir() {
  if [ -n "$install_dir" ]; then
    printf '%s\n' "$install_dir"
    return
  fi
  home_dir="${HOME:-}"
  [ -n "$home_dir" ] || die "HOME is required to choose an install directory"
  if [ "$os_name" = "Darwin" ]; then
    candidates="$home_dir/bin $home_dir/.local/bin /usr/local/bin /opt/homebrew/bin"
    fallback="$home_dir/bin"
  else
    candidates="$home_dir/.local/bin $home_dir/bin /usr/local/bin"
    fallback="$home_dir/.local/bin"
  fi
  for candidate in $candidates; do
    if in_path "$candidate" && is_writable_dir "$candidate"; then
      printf '%s\n' "$candidate"
      return
    fi
  done
  printf '%s\n' "$fallback"
}

well_known_profile_path() {
  home_dir="${HOME:-}"
  [ -n "$home_dir" ] || die "HOME is required to choose a profile path"
  if [ "$os_name" = "Darwin" ]; then
    printf '%s\n' "$home_dir/Library/Application Support/zotero-agents/bridge-profile.json"
  else
    data_home="${XDG_DATA_HOME:-$home_dir/.local/share}"
    printf '%s\n' "$data_home/zotero-agents/bridge-profile.json"
  fi
}

install_dir=$(choose_install_dir)
target_path="$install_dir/$binary_name"
declared_hash=$(awk '{print $1}' "$source_sha" | tr 'A-F' 'a-f')
source_hash=$(hash_file "$source_binary" | tr 'A-F' 'a-f')
[ "$declared_hash" = "$source_hash" ] || die "Checksum mismatch for $source_binary"
target_hash=""
if [ -f "$target_path" ]; then
  target_hash=$(hash_file "$target_path" | tr 'A-F' 'a-f')
fi
changed=0
[ "$target_hash" = "$source_hash" ] || changed=1
if [ "$changed" -eq 1 ] && [ "$dry_run" -eq 0 ]; then
  mkdir -p "$install_dir"
  cp "$source_binary" "$target_path"
  chmod 755 "$target_path"
fi

path_already_configured=0
if in_path "$install_dir"; then
  path_already_configured=1
fi
path_updated=0

if [ -z "$profile_path" ]; then
  profile_path=$(well_known_profile_path)
fi
profile_written=0
if [ "$write_profile" -eq 1 ]; then
  profile_written=1
  template_endpoint=$(sed -n 's/^[[:space:]]*"endpoint"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$profile_template" | head -n 1)
  [ -n "$endpoint" ] || endpoint="$template_endpoint"
  [ -n "$connection_mode" ] || connection_mode="local"
  if [ "$dry_run" -eq 0 ]; then
    mkdir -p "$(dirname "$profile_path")"
    cat > "$profile_path" <<EOF
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "$(json_escape "$endpoint")",
  "connectionMode": "$(json_escape "$connection_mode")",
  "auth": {
    "type": "bearer",
    "tokenEnv": "$(json_escape "$token_env")"
  },
  "source": "published-bundle-installer"
}
EOF
    chmod 600 "$profile_path" 2>/dev/null || true
  fi
fi

if [ "$path_already_configured" -eq 0 ] && [ "$add_path" -eq 1 ] && [ "$no_add_path" -eq 0 ]; then
  # POSIX shells vary; do not mutate shell rc files. Report the explicit next step.
  path_updated=0
fi

if [ "$path_already_configured" -eq 0 ] && [ "$path_updated" -eq 0 ]; then
  next_step="Add $install_dir to PATH or call the binary by absolute path."
else
  next_step="Run zotero-bridge status."
fi

if [ "$json_flag" -eq 1 ]; then
  printf '{'
  printf '"ok":true,'
  printf '"schema":"zotero-bridge.installer.v1",'
  printf '"platform":"%s",' "$(json_escape "$platform")"
  printf '"binaryPath":"%s",' "$(json_escape "$target_path")"
  printf '"installDir":"%s",' "$(json_escape "$install_dir")"
  printf '"changed":%s,' "$([ "$changed" -eq 1 ] && printf true || printf false)"
  printf '"dryRun":%s,' "$([ "$dry_run" -eq 1 ] && printf true || printf false)"
  printf '"profilePath":"%s",' "$(json_escape "$profile_path")"
  printf '"profileWritten":%s,' "$([ "$profile_written" -eq 1 ] && printf true || printf false)"
  printf '"pathAlreadyConfigured":%s,' "$([ "$path_already_configured" -eq 1 ] && printf true || printf false)"
  printf '"pathUpdated":false,'
  printf '"terminalRestartRequired":false,'
  printf '"nextStep":"%s"' "$(json_escape "$next_step")"
  printf '}\n'
else
  printf 'zotero-bridge installed: %s\n' "$target_path"
  [ "$profile_written" -eq 0 ] || printf 'Profile: %s\n' "$profile_path"
  printf '%s\n' "$next_step"
fi

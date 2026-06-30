param(
  [string]$RepositoryUrl = "https://github.com/leike0813/zotero-librarian-profile.git",
  [string]$Branch = "main",
  [string]$Remote = "origin",
  [string]$WorktreePath = "",
  [switch]$AllowDirty,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$profileRoot = Join-Path $repoRoot "profiles" "hermes" "zotero-librarian"
$addonBin = Join-Path $repoRoot "addon" "bin"
$addonBinManifestPath = "addon/bin"
$mainRepository = "https://github.com/leike0813/zotero-agents"
$installCommand = "hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>"
$platforms = @(
  @{ platform = "win32-x64"; binary = "zotero-bridge.exe" },
  @{ platform = "darwin-x64"; binary = "zotero-bridge" },
  @{ platform = "darwin-arm64"; binary = "zotero-bridge" },
  @{ platform = "linux-x86"; binary = "zotero-bridge" },
  @{ platform = "linux-x64"; binary = "zotero-bridge" },
  @{ platform = "linux-arm"; binary = "zotero-bridge" },
  @{ platform = "linux-arm64"; binary = "zotero-bridge" }
)

function Invoke-DevGit {
  param([string[]]$GitArgs)
  & git -C $repoRoot @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }
}

function Invoke-ProfileGit {
  param([string[]]$GitArgs)
  & git -C $WorktreePath @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "git $($GitArgs -join ' ') failed"
  }
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Assert-File {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing required file: $Path"
  }
}

function Clear-DirectoryExceptGit {
  param([string]$Path)
  Get-ChildItem -LiteralPath $Path -Force |
    Where-Object { $_.Name -ne ".git" } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

function Copy-ProfileSource {
  param([string]$Destination)
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $profileRoot -Force |
    ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Recurse -Force
    }
}

if (-not (Test-Path -LiteralPath $profileRoot -PathType Container)) {
  throw "Missing profile source directory: $profileRoot"
}

$dirty = (& git -C $repoRoot status --porcelain)
if ($dirty -and -not $AllowDirty) {
  throw "Working tree is dirty. Re-run with -AllowDirty when publishing generated profile output from a prepared tree."
}

foreach ($entry in $platforms) {
  $binaryPath = Join-Path $addonBin (Join-Path $entry.platform $entry.binary)
  $checksumPath = "$binaryPath.sha256"
  Assert-File $binaryPath
  Assert-File $checksumPath
}

$sourceCommit = (& git -C $repoRoot rev-parse HEAD).Trim()
$profileVersion = (Get-Content -LiteralPath (Join-Path $profileRoot "distribution.yaml") -Raw)
if ($profileVersion -notmatch "(?m)^version:\s*(.+)\s*$") {
  throw "distribution.yaml must declare profile version"
}
$profileVersion = $Matches[1].Trim()

if (-not $WorktreePath) {
  $WorktreePath = Join-Path ([System.IO.Path]::GetTempPath()) "zotero-librarian-profile-publish"
}

if (Test-Path -LiteralPath $WorktreePath) {
  Remove-Item -LiteralPath $WorktreePath -Recurse -Force
}

if ($Push) {
  & git clone $RepositoryUrl $WorktreePath
  if ($LASTEXITCODE -ne 0) {
    throw "git clone failed for $RepositoryUrl"
  }
  & git -C $WorktreePath config user.name "github-actions[bot]"
  & git -C $WorktreePath config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  Invoke-ProfileGit @("checkout", "-B", $Branch)
} else {
  New-Item -ItemType Directory -Force -Path $WorktreePath | Out-Null
  Invoke-ProfileGit @("init")
  & git -C $WorktreePath config user.name "github-actions[bot]"
  & git -C $WorktreePath config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  Invoke-ProfileGit @("checkout", "-B", $Branch)
  Invoke-ProfileGit @("remote", "add", $Remote, $RepositoryUrl)
}

try {
  Clear-DirectoryExceptGit $WorktreePath
  Copy-ProfileSource $WorktreePath

  $targetBinRoot = Join-Path $WorktreePath "assets" "zotero-bridge" "bin"
  New-Item -ItemType Directory -Force -Path $targetBinRoot | Out-Null
  $binaryManifest = @()
  foreach ($entry in $platforms) {
    $sourceDir = Join-Path $addonBin $entry.platform
    $targetDir = Join-Path $targetBinRoot $entry.platform
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $binaryPath = Join-Path $sourceDir $entry.binary
    $checksumPath = "$binaryPath.sha256"
    Copy-Item -LiteralPath $binaryPath -Destination (Join-Path $targetDir $entry.binary) -Force
    Copy-Item -LiteralPath $checksumPath -Destination (Join-Path $targetDir "$($entry.binary).sha256") -Force
    $binaryManifest += [ordered]@{
      platform = $entry.platform
      binary = "assets/zotero-bridge/bin/$($entry.platform)/$($entry.binary)"
      sha256 = Get-FileSha256 $binaryPath
    }
  }

  $manifest = [ordered]@{
    schema = "zotero-librarian.profile.release-manifest.v1"
    profile = "zotero-librarian"
    profileVersion = $profileVersion
    sourceRepository = $mainRepository
    releaseRepository = "https://github.com/leike0813/zotero-librarian-profile"
    installCommand = $installCommand
    sourceCommit = $sourceCommit
    dirty = [bool]$dirty
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    binarySource = $addonBinManifestPath
    binaries = $binaryManifest
    generatedCatalogChecksum = Get-FileSha256 (Join-Path $WorktreePath "assets" "profile-manifest-source.json")
  }
  $manifestJson = $manifest | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath (Join-Path $WorktreePath "manifest.json") -Value ($manifestJson + "`n") -Encoding UTF8

  Invoke-ProfileGit @("add", "-A")
  foreach ($entry in $platforms) {
    if ($entry.platform -notlike "win32-*") {
      & git -C $WorktreePath update-index --chmod=+x "assets/zotero-bridge/bin/$($entry.platform)/$($entry.binary)"
      if ($LASTEXITCODE -ne 0) {
        throw "git update-index failed for $($entry.platform)"
      }
    }
  }
  $status = (& git -C $WorktreePath status --porcelain)
  if (-not $status) {
    Write-Host "No changes for $RepositoryUrl $Branch"
  } else {
    Invoke-ProfileGit @("commit", "-m", "Publish zotero-librarian Hermes profile")
    if ($Push) {
      Invoke-ProfileGit @("push", $Remote, "HEAD:$Branch")
    }
  }
} finally {
  if ($Push) {
    Remove-Item -LiteralPath $WorktreePath -Recurse -Force
  } else {
    Write-Host "Prepared profile repository worktree at $WorktreePath"
  }
}

$ErrorActionPreference = 'Stop'

function New-Options {
    [ordered]@{
        Yes            = $false
        Json           = $false
        DryRun         = $false
        InstallDir     = ''
        Profile        = ''
        Endpoint       = ''
        TokenEnv       = 'ZOTERO_BRIDGE_TOKEN'
        ConnectionMode = ''
        WriteProfile   = $false
        AddPath        = $false
        NoAddPath      = $false
    }
}

function Parse-Args {
    param([string[]]$Argv)
    $options = New-Options
    for ($i = 0; $i -lt $Argv.Count; $i++) {
        $arg = $Argv[$i]
        $key = $arg
        $value = ''
        if ($arg -like '--*=*') {
            $parts = $arg.Split('=', 2)
            $key = $parts[0]
            $value = $parts[1]
        }
        switch -Regex ($key) {
            '^(-y|--yes|-Yes)$' { $options.Yes = $true; continue }
            '^(--json|-Json)$' { $options.Json = $true; continue }
            '^(--dry-run|-DryRun)$' { $options.DryRun = $true; continue }
            '^(--write-profile|-WriteProfile)$' { $options.WriteProfile = $true; continue }
            '^(--add-path|-AddPath)$' { $options.AddPath = $true; continue }
            '^(--no-add-path|-NoAddPath)$' { $options.NoAddPath = $true; continue }
            '^(--install-dir|-InstallDir)$' {
                if (-not $value) { $i++; $value = $Argv[$i] }
                $options.InstallDir = $value
                continue
            }
            '^(--profile|-Profile)$' {
                if (-not $value) { $i++; $value = $Argv[$i] }
                $options.Profile = $value
                continue
            }
            '^(--endpoint|-Endpoint)$' {
                if (-not $value) { $i++; $value = $Argv[$i] }
                $options.Endpoint = $value
                continue
            }
            '^(--token-env|-TokenEnv)$' {
                if (-not $value) { $i++; $value = $Argv[$i] }
                $options.TokenEnv = if ($value) { $value } else { 'ZOTERO_BRIDGE_TOKEN' }
                continue
            }
            '^(--connection-mode|-ConnectionMode)$' {
                if (-not $value) { $i++; $value = $Argv[$i] }
                $normalized = "$value".Trim().ToLowerInvariant()
                if ($normalized -and $normalized -ne 'local' -and $normalized -ne 'remote') {
                    throw "connection-mode must be local or remote"
                }
                $options.ConnectionMode = $normalized
                continue
            }
            '^(--platform|-Platform)$' {
                throw 'Platform override is not supported; installer detects the current platform.'
            }
            default {
                throw "Unknown argument: $arg"
            }
        }
    }
    if ($options.AddPath -and $options.NoAddPath) {
        throw '--add-path and --no-add-path cannot be used together'
    }
    return $options
}

function Resolve-Platform {
    $os = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
    $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    if ($IsWindows -or $env:OS -eq 'Windows_NT') { return 'win32-x64' }
    if ($IsMacOS -or $os -match 'Darwin') {
        if ($arch -eq 'arm64') { return 'darwin-arm64' }
        return 'darwin-x64'
    }
    if ($arch -eq 'x86') { return 'linux-x86' }
    if ($arch -eq 'arm') { return 'linux-arm' }
    if ($arch -eq 'arm64') { return 'linux-arm64' }
    return 'linux-x64'
}

function Get-BinaryName {
    param([string]$Platform)
    if ($Platform -like 'win32-*') { return 'zotero-bridge.exe' }
    return 'zotero-bridge'
}

function Get-DefaultInstallDir {
    param([string]$Platform)
    $envInstallDir = "$env:ZOTERO_BRIDGE_INSTALL_DIR".Trim()
    if ($envInstallDir) { return $envInstallDir }
    if ($Platform -like 'win32-*') {
        $root = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME 'AppData\Local' }
        return Join-Path $root 'zotero-agents\bin'
    }
    $home = if ($HOME) { $HOME } else { [Environment]::GetFolderPath('UserProfile') }
    $candidates = if ($Platform -like 'darwin-*') {
        @((Join-Path $home 'bin'), (Join-Path $home '.local/bin'), '/usr/local/bin', '/opt/homebrew/bin')
    } else {
        @((Join-Path $home '.local/bin'), (Join-Path $home 'bin'), '/usr/local/bin')
    }
    $pathEntries = @($env:PATH -split [System.IO.Path]::PathSeparator)
    foreach ($candidate in $candidates) {
        if (($pathEntries -contains $candidate) -and (Test-Path -LiteralPath $candidate)) {
            try {
                $probe = Join-Path $candidate ".zotero-bridge-install-probe-$PID"
                Set-Content -LiteralPath $probe -Value '' -NoNewline
                Remove-Item -LiteralPath $probe -Force
                return $candidate
            } catch {}
        }
    }
    return $candidates[0]
}

function Get-WellKnownProfilePath {
    param([string]$Platform)
    if ($Platform -like 'win32-*') {
        $root = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME 'AppData\Local' }
        return Join-Path $root 'zotero-agents\bridge-profile.json'
    }
    if ($Platform -like 'darwin-*') {
        return Join-Path $HOME 'Library/Application Support/zotero-agents/bridge-profile.json'
    }
    $root = if ($env:XDG_DATA_HOME) { $env:XDG_DATA_HOME } else { Join-Path $HOME '.local/share' }
    return Join-Path $root 'zotero-agents/bridge-profile.json'
}

function Test-PathEntry {
    param([string]$Dir)
    $normalized = $Dir.TrimEnd('\', '/')
    foreach ($entry in @($env:PATH -split [System.IO.Path]::PathSeparator)) {
        if ($entry.TrimEnd('\', '/') -ieq $normalized) { return $true }
    }
    return $false
}

function Add-WindowsUserPath {
    param([string]$Dir)
    $current = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = if ([string]::IsNullOrWhiteSpace($current)) { @() } else { $current -split ';' }
    foreach ($entry in $entries) {
        if ($entry.TrimEnd('\') -ieq $Dir.TrimEnd('\')) { return $false }
    }
    $next = (@($entries | Where-Object { $_ -and $_.Trim() }) + $Dir) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $next, 'User')
    return $true
}

function Write-Profile {
    param(
        [string]$Path,
        [string]$TemplatePath,
        [string]$Endpoint,
        [string]$TokenEnv,
        [string]$ConnectionMode,
        [bool]$DryRun
    )
    $profile = Get-Content -LiteralPath $TemplatePath -Raw | ConvertFrom-Json
    if ($Endpoint) { $profile.endpoint = $Endpoint }
    if ($ConnectionMode) { $profile.connectionMode = $ConnectionMode }
    if (-not $profile.auth) {
        $profile | Add-Member -NotePropertyName auth -NotePropertyValue ([pscustomobject]@{})
    }
    $profile.auth = [pscustomobject]@{
        type     = 'bearer'
        tokenEnv = $TokenEnv
    }
    $profile.source = 'published-bundle-installer'
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
        $profile | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath $Path
    }
}

$options = Parse-Args $args
$bundleRoot = $PSScriptRoot
$binRoot = Join-Path $bundleRoot 'bin'
if (-not (Test-Path -LiteralPath $binRoot) -and (Test-Path -LiteralPath (Join-Path $bundleRoot 'addon/bin'))) {
    $binRoot = Join-Path $bundleRoot 'addon/bin'
}
$profileTemplatePath = Join-Path $bundleRoot 'assets/profile.template.json'
if (-not (Test-Path -LiteralPath $profileTemplatePath) -and (Test-Path -LiteralPath (Join-Path $bundleRoot 'skills_builtin/zotero-bridge-cli/assets/profile.template.json'))) {
    $profileTemplatePath = Join-Path $bundleRoot 'skills_builtin/zotero-bridge-cli/assets/profile.template.json'
}
$platform = Resolve-Platform
$binaryName = Get-BinaryName $platform
$sourceBinary = Join-Path $binRoot "$platform/$binaryName"
$sourceSha = "$sourceBinary.sha256"
$availablePlatforms = @()
if (Test-Path -LiteralPath $binRoot) {
    $availablePlatforms = Get-ChildItem -LiteralPath $binRoot -Directory | ForEach-Object { $_.Name }
}
if (-not (Test-Path -LiteralPath $sourceBinary)) {
    throw "No zotero-bridge binary for platform $platform. Available platforms: $($availablePlatforms -join ', ')"
}
if (-not (Test-Path -LiteralPath $sourceSha)) {
    throw "Missing checksum file: $sourceSha"
}

$installDir = if ($options.InstallDir) { $options.InstallDir } else { Get-DefaultInstallDir $platform }
$targetPath = Join-Path $installDir $binaryName
$targetHash = if (Test-Path -LiteralPath $targetPath) { (Get-FileHash -Algorithm SHA256 -LiteralPath $targetPath).Hash.ToLowerInvariant() } else { '' }
$sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceBinary).Hash.ToLowerInvariant()
$declaredHash = ((Get-Content -Encoding UTF8 -LiteralPath $sourceSha -Raw) -split '\s+')[0].Trim().ToLowerInvariant()
if ($declaredHash -ne $sourceHash) {
    throw "Checksum mismatch for $sourceBinary"
}
$changed = $targetHash -ne $sourceHash
if ($changed -and -not $options.DryRun) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Copy-Item -LiteralPath $sourceBinary -Destination $targetPath -Force
}

$pathAlreadyConfigured = Test-PathEntry $installDir
$pathUpdated = $false
if (($platform -like 'win32-*') -and -not $pathAlreadyConfigured -and -not $options.NoAddPath) {
    $shouldAdd = $options.AddPath
    if (-not $shouldAdd -and -not $options.Yes) {
        $answer = Read-Host "Add $installDir to the user PATH? [y/N]"
        $shouldAdd = $answer -match '^(y|yes)$'
    }
    if ($shouldAdd -and -not $options.DryRun) {
        $pathUpdated = Add-WindowsUserPath $installDir
    } elseif ($shouldAdd) {
        $pathUpdated = $true
    }
}

$profilePath = if ($options.Profile) { $options.Profile } else { Get-WellKnownProfilePath $platform }
if ($options.WriteProfile) {
    Write-Profile -Path $profilePath -TemplatePath $profileTemplatePath -Endpoint $options.Endpoint -TokenEnv $options.TokenEnv -ConnectionMode $options.ConnectionMode -DryRun $options.DryRun
}

$result = [ordered]@{
    ok                      = $true
    schema                  = 'zotero-bridge.installer.v1'
    platform                = $platform
    binaryPath              = $targetPath
    installDir              = $installDir
    changed                 = $changed
    dryRun                  = [bool]$options.DryRun
    profilePath             = $profilePath
    profileWritten          = [bool]$options.WriteProfile
    pathAlreadyConfigured   = $pathAlreadyConfigured
    pathUpdated             = $pathUpdated
    terminalRestartRequired = $pathUpdated
    nextStep                = if ((-not $pathAlreadyConfigured) -and (-not $pathUpdated)) { "Add $installDir to PATH or call the binary by absolute path." } else { "Run zotero-bridge status." }
}

if ($options.Json) {
    $result | ConvertTo-Json -Depth 8
} else {
    Write-Host "zotero-bridge installed: $targetPath"
    if ($options.WriteProfile) { Write-Host "Profile: $profilePath" }
    if ($result.nextStep) { Write-Host $result.nextStep }
}

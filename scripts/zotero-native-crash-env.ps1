#!/usr/bin/env pwsh
# 配置桌面 Zotero 的 Mozilla / Windows WER full dump，并验证实际转储。
# Mozilla 修改当前用户变量；WER 仅修改 zotero.exe 的机器级设置，需管理员权限。
# 用户变量改变后需重新登录；配置状态不代表崩溃捕获已通过实机验证。
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet("status", "enable", "disable", "verify")]
    [string]$Action = "status",
    [ValidateSet("Mozilla", "Wer")]
    [string]$Target = "Mozilla",
    [string]$DumpPath,
    [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$Script:VARS = @(
    "MOZ_CRASHREPORTER",
    "MOZ_CRASHREPORTER_NO_REPORT",
    "MOZ_CRASHREPORTER_FULLDUMP"
)

$Script:DISABLE_KEY = "MOZ_CRASHREPORTER_DISABLE"
$Script:WerKeyPath = 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\Windows Error Reporting\LocalDumps\zotero.exe'
$Script:WerBackupPath = Join-Path $env:ProgramData 'Zotero Agents/crash-capture-config/zotero-localdumps.json'
$Script:WerSettings = @(
    [pscustomobject]@{ Name = 'DumpType'; Kind = 'DWord'; Value = 2 },
    [pscustomobject]@{ Name = 'DumpCount'; Kind = 'DWord'; Value = 3 },
    [pscustomobject]@{ Name = 'DumpFolder'; Kind = 'ExpandString'; Value = '%LOCALAPPDATA%\Zotero Agents\crash-captures\desktop-wer' }
)

function Get-DumpEvidence([string]$Path) {
    if (-not $Path) { throw "dump_path_required" }
    $file = Get-Item -LiteralPath $Path
    $evidence = [ordered]@{
        Path = $file.FullName
        Status = "invalid_dump"
        FullMemory = $false
        Flags = $null
        Bytes = $file.Length
    }
    $stream = [IO.File]::Open($file.FullName, "Open", "Read", "ReadWrite")
    try {
        $reader = [IO.BinaryReader]::new($stream)
        if ($stream.Length -lt 32 -or $reader.ReadUInt32() -ne 0x504D444D) {
            return [pscustomobject]$evidence
        }
        $stream.Position = 8
        $count = $reader.ReadUInt32()
        $directory = $reader.ReadUInt32()
        $stream.Position = 24
        $flags = $reader.ReadUInt64()
        $evidence.Flags = "0x{0:X}" -f $flags
        if ($directory -lt 32 -or $directory + [long]$count * 12 -gt $stream.Length) {
            return [pscustomobject]$evidence
        }
        $stream.Position = $directory
        $memory64 = $null
        for ($index = 0; $index -lt $count; $index++) {
            $type = $reader.ReadUInt32()
            $size = $reader.ReadUInt32()
            $rva = $reader.ReadUInt32()
            if ([long]$rva + $size -gt $stream.Length) { return [pscustomobject]$evidence }
            if ($type -eq 9) { $memory64 = @{ Rva = $rva; Size = $size } }
        }
        if ($memory64) {
            if ($memory64.Size -lt 16) { return [pscustomobject]$evidence }
            $stream.Position = $memory64.Rva
            $ranges = $reader.ReadUInt64()
            $dataOffset = $reader.ReadUInt64()
            if ($ranges -gt [Math]::Floor(($memory64.Size - 16) / 16) -or $dataOffset -gt $stream.Length) {
                return [pscustomobject]$evidence
            }
            for ($index = 0; $index -lt $ranges; $index++) {
                $null = $reader.ReadUInt64()
                $bytes = $reader.ReadUInt64()
                if ($bytes -gt $stream.Length - $dataOffset) { return [pscustomobject]$evidence }
                $dataOffset += $bytes
            }
        }
        if (($flags -band 2) -ne 0) {
            if (-not $memory64 -or $ranges -eq 0) { return [pscustomobject]$evidence }
            $evidence.Status = "full_memory"
            $evidence.FullMemory = $true
        } else {
            $evidence.Status = "not_full_memory"
        }
        return [pscustomobject]$evidence
    } finally { $stream.Dispose() }
}

function Read-UserEnv([string]$Name) {
    [Environment]::GetEnvironmentVariable($Name, "User")
}

function Assert-WerAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'wer_administrator_required'
    }
    if ([IntPtr]::Size -ne 8) { throw 'wer_64bit_powershell_required' }
}

function Get-WerSnapshot {
    $exists = Test-Path -LiteralPath $Script:WerKeyPath
    $values = @()
    if ($exists) {
        $key = Get-Item -LiteralPath $Script:WerKeyPath
        foreach ($setting in $Script:WerSettings) {
            if ($key.GetValueNames() -contains $setting.Name) {
                $values += [pscustomobject]@{
                    Name = $setting.Name
                    Kind = $key.GetValueKind($setting.Name).ToString()
                    Value = $key.GetValue($setting.Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
                }
            }
        }
    }
    [pscustomobject]@{ KeyExisted = [bool]$exists; Values = $values }
}

function Test-WerSettings($Snapshot, $Settings) {
    if (@($Snapshot.Values).Count -ne @($Settings).Count) { return $false }
    foreach ($setting in $Settings) {
        $current = @($Snapshot.Values | Where-Object Name -eq $setting.Name)
        if ($current.Count -ne 1 -or $current[0].Kind -ne $setting.Kind -or $current[0].Value -cne $setting.Value) {
            return $false
        }
    }
    return $true
}

function Set-WerSnapshot($Snapshot) {
    if (($Snapshot.KeyExisted -or @($Snapshot.Values).Count -gt 0) -and -not (Test-Path -LiteralPath $Script:WerKeyPath)) {
        $null = New-Item -Path $Script:WerKeyPath -Force
    }
    foreach ($setting in $Script:WerSettings) {
        $value = @($Snapshot.Values | Where-Object Name -eq $setting.Name)
        if ($value.Count -gt 0) {
            $null = New-ItemProperty -LiteralPath $Script:WerKeyPath -Name $setting.Name -PropertyType $value[0].Kind -Value $value[0].Value -Force
        } elseif (Test-Path -LiteralPath $Script:WerKeyPath) {
            Remove-ItemProperty -LiteralPath $Script:WerKeyPath -Name $setting.Name -ErrorAction SilentlyContinue
        }
    }
    if (-not $Snapshot.KeyExisted -and (Test-Path -LiteralPath $Script:WerKeyPath)) {
        $key = Get-Item -LiteralPath $Script:WerKeyPath
        if ($key.ValueCount -eq 0 -and $key.SubKeyCount -eq 0) {
            Remove-Item -LiteralPath $Script:WerKeyPath
        }
    }
}

function Read-WerBackup {
    $backup = Get-Content -LiteralPath $Script:WerBackupPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($backup.KeyPath -ne $Script:WerKeyPath) { throw 'wer_backup_key_mismatch' }
    return $backup
}

function Enable-WerCapture {
    Assert-WerAdministrator
    $before = Get-WerSnapshot
    if (Test-Path -LiteralPath $Script:WerBackupPath) {
        $backup = Read-WerBackup
        if (-not (Test-WerSettings $before $backup.Applied)) { throw 'wer_configuration_conflict' }
        return
    }
    $backup = [pscustomobject]@{ KeyPath = $Script:WerKeyPath; Original = $before; Applied = $Script:WerSettings }
    $null = New-Item -ItemType Directory -Path (Split-Path -Parent $Script:WerBackupPath) -Force
    $file = [IO.File]::Open($Script:WerBackupPath, 'CreateNew', 'Write', 'None')
    try {
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($backup | ConvertTo-Json -Depth 6))
        $file.Write($bytes, 0, $bytes.Length)
    } finally { $file.Dispose() }
    try {
        Set-WerSnapshot ([pscustomobject]@{ KeyExisted = $true; Values = $Script:WerSettings })
        if (-not (Test-WerSettings (Get-WerSnapshot) $Script:WerSettings)) { throw 'wer_configuration_not_applied' }
    } catch {
        $failure = $_
        try {
            Set-WerSnapshot $before
            Remove-Item -LiteralPath $Script:WerBackupPath
        } catch { Write-Warning 'WER rollback incomplete; the original configuration backup has been retained.' }
        throw $failure
    }
}

function Disable-WerCapture {
    Assert-WerAdministrator
    if (-not (Test-Path -LiteralPath $Script:WerBackupPath)) { throw 'wer_backup_missing' }
    $backup = Read-WerBackup
    if (-not (Test-WerSettings (Get-WerSnapshot) $backup.Applied)) { throw 'wer_configuration_conflict' }
    Set-WerSnapshot $backup.Original
    Remove-Item -LiteralPath $Script:WerBackupPath
}

function Get-CrashCaptureStatus {
    $rows = @()
    foreach ($name in $Script:VARS) {
        $rows += [pscustomobject]@{
            Variable = $name
            User     = Read-UserEnv $name
            Process  = [Environment]::GetEnvironmentVariable($name, 'Process')
        }
    }
    $userBlocked = [bool](Read-UserEnv $Script:DISABLE_KEY)
    $machineBlocked = [bool][Environment]::GetEnvironmentVariable($Script:DISABLE_KEY, 'Machine')
    [pscustomobject]@{
        Mozilla = [pscustomobject]@{
            Configured = @($rows | Where-Object { -not $_.User }).Count -eq 0 -and -not $userBlocked -and -not $machineBlocked
            ProcessConfigured = @($rows | Where-Object { -not $_.Process }).Count -eq 0 -and -not [bool][Environment]::GetEnvironmentVariable($Script:DISABLE_KEY, 'Process')
            UserDisabled = $userBlocked
            MachineDisabled = $machineBlocked
            Variables = $rows
        }
        Wer = [pscustomobject]@{
            Configured = Test-WerSettings (Get-WerSnapshot) $Script:WerSettings
            RegistryPath = $Script:WerKeyPath
            Values = (Get-WerSnapshot).Values
            BackupAvailable = Test-Path -LiteralPath $Script:WerBackupPath
        }
        CaptureVerified = $false
    }
}

function Invoke-CrashCaptureAction {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param(
        [ValidateSet('status', 'enable', 'disable', 'verify')][string]$Action = 'status',
        [ValidateSet('Mozilla', 'Wer')][string]$Target = 'Mozilla',
        [string]$DumpPath
    )
    if ($Action -eq 'verify') { return Get-DumpEvidence $DumpPath }
    if ($Action -eq 'enable' -or $Action -eq 'disable') {
        $destination = if ($Target -eq 'Wer') { $Script:WerKeyPath } else { 'current user Mozilla crash environment' }
        if ($PSCmdlet.ShouldProcess($destination, $Action)) {
            if ($Target -eq 'Wer') {
                if ($Action -eq 'enable') { Enable-WerCapture } else { Disable-WerCapture }
            } else {
                if ($Action -eq 'enable') {
                    [Environment]::SetEnvironmentVariable($Script:DISABLE_KEY, $null, 'User')
                }
                foreach ($name in $Script:VARS) {
                    $value = if ($Action -eq 'enable') { '1' } else { $null }
                    [Environment]::SetEnvironmentVariable($name, $value, 'User')
                }
            }
        }
    }
    return Get-CrashCaptureStatus
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        $result = Invoke-CrashCaptureAction -Action $Action -Target $Target -DumpPath $DumpPath
        if ($AsJson) { $result | ConvertTo-Json -Depth 6 } else { $result }
        if ($Action -eq 'verify' -and -not $result.FullMemory) { exit 2 }
    } catch {
        if ($AsJson) {
            [pscustomobject]@{ Status = 'error'; ErrorCode = $_.Exception.Message } | ConvertTo-Json
        } else {
            Write-Error -ErrorRecord $_ -ErrorAction Continue
        }
        exit 1
    }
}


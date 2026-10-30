$ErrorActionPreference = 'Stop'
$orbitRoot = Split-Path -Parent $PSScriptRoot
$orbitCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $orbitCompiler)) { throw 'Compilateur .NET Framework 4.x Windows introuvable.' }
$orbitOutput = Join-Path $orbitRoot 'build\native'
New-Item -ItemType Directory -Force $orbitOutput | Out-Null
$orbitSources = @(Get-ChildItem -LiteralPath (Join-Path $orbitRoot 'system\native') -Filter '*.cs' | ForEach-Object { $_.FullName })
& $orbitCompiler /nologo /target:exe /platform:x64 /optimize+ /warnaserror+ "/out:$orbitOutput\OrbitBridge.exe" /reference:System.Management.dll /reference:System.Web.Extensions.dll /reference:System.Drawing.dll $orbitSources
if ($LASTEXITCODE -ne 0) { throw 'La compilation du collecteur Windows a échoué.' }
& (Join-Path $PSScriptRoot 'icons.ps1')
Write-Output 'Collecteur Windows et icones compiles.'

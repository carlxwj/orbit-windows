$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$orbitRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$orbitDelivery = Join-Path $orbitRoot 'delivery'
New-Item -ItemType Directory -Force -Path $orbitDelivery | Out-Null
$orbitDestination = Join-Path $orbitDelivery 'Orbit-2.0-sources.zip'
$orbitFiles = @()
foreach ($orbitDirectory in @('src','electron','system','shared','scripts','assets','tests','e2e','docs','.github')) {
  $orbitFiles += @(Get-ChildItem -LiteralPath (Join-Path $orbitRoot $orbitDirectory) -Recurse -File | ForEach-Object { $_.FullName })
}
foreach ($orbitFile in @('package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','electron-builder.yml','eslint.config.mjs','index.html','README.md','THIRD_PARTY_NOTICES.md','.gitignore','legacy\Orbit-1.0-original.zip','build\native\OrbitBridge.exe')) {
  $orbitFullPath = Join-Path $orbitRoot $orbitFile
  if (Test-Path -LiteralPath $orbitFullPath -PathType Leaf) { $orbitFiles += $orbitFullPath }
}
$orbitStream = [IO.File]::Open($orbitDestination,[IO.FileMode]::Create,[IO.FileAccess]::Write)
$orbitZip = New-Object IO.Compression.ZipArchive($orbitStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($orbitFile in ($orbitFiles | Sort-Object -Unique)) {
    $orbitAbsolute = [IO.Path]::GetFullPath($orbitFile)
    if (-not $orbitAbsolute.StartsWith($orbitRoot + '\')) { throw 'Source hors projet.' }
    $orbitName = 'Orbit-2.0/' + $orbitAbsolute.Substring($orbitRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($orbitZip,$orbitAbsolute,$orbitName,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $orbitZip.Dispose(); $orbitStream.Dispose() }
Get-FileHash -LiteralPath $orbitDestination -Algorithm SHA256 | Format-List

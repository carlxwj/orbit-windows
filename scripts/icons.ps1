$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$orbitAssetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
$orbitImages = @()
foreach ($orbitSize in @(16,24,32,48,64,128,256)) {
  $orbitBitmap = New-Object Drawing.Bitmap($orbitSize,$orbitSize)
  $orbitGraphics = [Drawing.Graphics]::FromImage($orbitBitmap)
  $orbitGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $orbitGraphics.Clear([Drawing.Color]::Transparent)
  $orbitRect = New-Object Drawing.Rectangle(0,0,$orbitSize,$orbitSize)
  $orbitBrush = New-Object Drawing.Drawing2D.LinearGradientBrush($orbitRect,[Drawing.Color]::FromArgb(94,133,246),[Drawing.Color]::FromArgb(103,81,209),45)
  $orbitGraphics.FillEllipse($orbitBrush,1,1,($orbitSize-2),($orbitSize-2))
  $orbitPen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(245,248,255),[single]($orbitSize*.065))
  $orbitGraphics.TranslateTransform(($orbitSize/2),($orbitSize/2))
  $orbitGraphics.RotateTransform(-35)
  $orbitGraphics.DrawEllipse($orbitPen,(-$orbitSize*.32),(-$orbitSize*.14),($orbitSize*.64),($orbitSize*.28))
  $orbitGraphics.DrawEllipse($orbitPen,(-$orbitSize*.18),(-$orbitSize*.26),($orbitSize*.36),($orbitSize*.52))
  $orbitDotBrush = New-Object Drawing.SolidBrush([Drawing.Color]::White)
  $orbitGraphics.FillEllipse($orbitDotBrush,($orbitSize*.2),(-$orbitSize*.19),($orbitSize*.115),($orbitSize*.115))
  $orbitStream = New-Object IO.MemoryStream
  $orbitBitmap.Save($orbitStream,[Drawing.Imaging.ImageFormat]::Png)
  $orbitImages += ,@($orbitSize,$orbitStream.ToArray())
  if ($orbitSize -eq 256) { [IO.File]::WriteAllBytes((Join-Path $orbitAssetRoot 'orbit.png'),$orbitStream.ToArray()) }
  $orbitStream.Dispose(); $orbitDotBrush.Dispose(); $orbitBrush.Dispose(); $orbitPen.Dispose(); $orbitGraphics.Dispose(); $orbitBitmap.Dispose()
}
$orbitFile = [IO.File]::Create((Join-Path $orbitAssetRoot 'orbit.ico'))
$orbitWriter = New-Object IO.BinaryWriter($orbitFile)
try {
  $orbitWriter.Write([uint16]0); $orbitWriter.Write([uint16]1); $orbitWriter.Write([uint16]$orbitImages.Count)
  $orbitOffset = 6 + $orbitImages.Count * 16
  foreach ($orbitImage in $orbitImages) {
    $orbitDimension = if ($orbitImage[0] -eq 256) { 0 } else { $orbitImage[0] }
    $orbitWriter.Write([byte]$orbitDimension); $orbitWriter.Write([byte]$orbitDimension)
    $orbitWriter.Write([byte]0); $orbitWriter.Write([byte]0); $orbitWriter.Write([uint16]1); $orbitWriter.Write([uint16]32)
    $orbitWriter.Write([uint32]$orbitImage[1].Length); $orbitWriter.Write([uint32]$orbitOffset)
    $orbitOffset += $orbitImage[1].Length
  }
  foreach ($orbitImage in $orbitImages) { $orbitWriter.Write([byte[]]$orbitImage[1]) }
} finally { $orbitWriter.Dispose(); $orbitFile.Dispose() }

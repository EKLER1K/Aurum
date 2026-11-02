# Builds tools\AurumVersionBuilder.exe with the .NET Framework compiler.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-version-builder.ps1
#
# No SDK required: csc.exe ships with .NET Framework 4.x on Windows 10/11.

$ErrorActionPreference = "Stop"

$here = $PSScriptRoot
$root = Split-Path -Parent $here

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "csc.exe (.NET Framework 4.x) not found."
}

# Branded icon: convert assets\icon.png to a single 256x256 PNG-compressed .ico.
$iconPath = Join-Path $here "AurumVersionBuilder.ico"
$iconSource = Join-Path $root "assets\icon.png"
if (Test-Path $iconSource) {
    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile($iconSource)
    try {
        $bitmap = New-Object -TypeName System.Drawing.Bitmap -ArgumentList 256, 256
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($image, 0, 0, 256, 256)
            $stream = New-Object System.IO.MemoryStream
            try {
                $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
                $png = $stream.ToArray()
            }
            finally {
                $stream.Dispose()
            }
        }
        finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }

        $file = [System.IO.File]::Create($iconPath)
        $writer = New-Object System.IO.BinaryWriter($file)
        try {
            $writer.Write([UInt16]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]1)
            $writer.Write([Byte]0)
            $writer.Write([Byte]0)
            $writer.Write([Byte]0)
            $writer.Write([Byte]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]32)
            $writer.Write([UInt32]$png.Length)
            $writer.Write([UInt32]22)
            $writer.Write($png)
        }
        finally {
            $writer.Close()
        }
    }
    finally {
        $image.Dispose()
    }
}

$source = Join-Path $here "VersionBuilder.cs"
$target = Join-Path $here "AurumVersionBuilder.exe"

$arguments = @(
    "/nologo",
    "/target:winexe",
    "/optimize+",
    "/codepage:65001",
    "/out:$target",
    "/reference:System.dll",
    "/reference:System.Core.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.Windows.Forms.dll",
    $source
)
if (Test-Path $iconPath) {
    $arguments += "/win32icon:$iconPath"
}

& $csc $arguments
if ($LASTEXITCODE -ne 0) {
    throw "csc failed with exit code $LASTEXITCODE."
}

$size = [math]::Round((Get-Item $target).Length / 1KB, 1)
Write-Host "Built: $target ($size KB)"

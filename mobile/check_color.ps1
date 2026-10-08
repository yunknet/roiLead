param([string]$path)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile($path)
$color = $img.GetPixel(0, 0)
Write-Host "Background color at 0,0 is A:$($color.A) R:$($color.R) G:$($color.G) B:$($color.B)"
$img.Dispose()

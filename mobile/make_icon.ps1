Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\netso\Projetos\roiLead_git\roiLead\public\cupula-icon.png"
$outPath = "C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon.png"
$size = 1024
$padding = 200

$src = New-Object System.Drawing.Bitmap($srcPath)
Write-Host "Original size: $($src.Width) x $($src.Height)"

# Create a 1024x1024 bitmap with white background
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# White background
$g.Clear([System.Drawing.Color]::White)

# Calculate the draw area (centered with padding)
$drawArea = $size - (2 * $padding)
$srcRatio = $src.Width / $src.Height

if ($srcRatio -gt 1) {
    # Wider than tall
    $drawW = $drawArea
    $drawH = [int]($drawArea / $srcRatio)
} else {
    # Taller than wide
    $drawH = $drawArea
    $drawW = [int]($drawArea * $srcRatio)
}

$x = [int](($size - $drawW) / 2)
$y = [int](($size - $drawH) / 2)

$g.DrawImage($src, $x, $y, $drawW, $drawH)
$g.Dispose()

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$src.Dispose()

Write-Host "Done! Saved $size x $size icon to $outPath"

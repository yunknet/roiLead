param(
    [string]$inputPath,
    [string]$outputPath,
    [int]$canvasSize = 1024,
    [int]$logoSize = 600
)

Add-Type -AssemblyName System.Drawing

# Load original image
$original = [System.Drawing.Image]::FromFile($inputPath)

# Create a new transparent bitmap
$canvas = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)

# Clear background with transparent color
$graphics.Clear([System.Drawing.Color]::Transparent)

# Set high quality interpolation
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Calculate centered coordinates
$x = ($canvasSize - $logoSize) / 2
$y = ($canvasSize - $logoSize) / 2

# Draw the scaled original image onto the canvas
$graphics.DrawImage($original, $x, $y, $logoSize, $logoSize)

# Save
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$canvas.Dispose()
$original.Dispose()

Write-Host "Padded image saved to $outputPath"

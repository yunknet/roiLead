Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon.png")
$width = $img.Width
$height = $img.Height
$minX = $width
$maxX = 0
$minY = $height
$maxY = 0

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $img.GetPixel($x, $y)
        # Check if it's not the background color (not close to R=32, G=32, B=32 with A=255)
        # and not transparent (A > 0)
        if ($pixel.A -gt 0) {
            $diffR = [Math]::Abs($pixel.R - 32)
            $diffG = [Math]::Abs($pixel.G - 32)
            $diffB = [Math]::Abs($pixel.B - 32)
            if ($diffR -gt 15 -or $diffG -gt 15 -or $diffB -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
}

Write-Host "Bounding box of non-background pixels: MinX=$minX, MaxX=$maxX, MinY=$minY, MaxY=$maxY"
$img.Dispose()

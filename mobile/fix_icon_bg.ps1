Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon.png"
$outputPath = "C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon_transparent.png"
$threshold = 40

$bmp = New-Object System.Drawing.Bitmap($inputPath)
$width = $bmp.Width
$height = $bmp.Height

$bgR = 32
$bgG = 32
$bgB = 32

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        $diffR = [Math]::Abs([int]$pixel.R - $bgR)
        $diffG = [Math]::Abs([int]$pixel.G - $bgG)
        $diffB = [Math]::Abs([int]$pixel.B - $bgB)
        
        if ($diffR -le $threshold -and $diffG -le $threshold -and $diffB -le $threshold) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Done! Saved transparent icon to $outputPath"

Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon.png")
$width = $img.Width
$height = $img.Height

$colors = @{}

for ($y = 0; $y -lt $height; $y += 4) {
    for ($x = 0; $x -lt $width; $x += 4) {
        $pixel = $img.GetPixel($x, $y)
        if ($pixel.A -gt 0) {
            $key = "A:$($pixel.A) R:$($pixel.R) G:$($pixel.G) B:$($pixel.B)"
            $colors[$key]++
        }
    }
}

$sorted = $colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30
foreach ($c in $sorted) {
    Write-Host "$($c.Key) : $($c.Value)"
}
$img.Dispose()

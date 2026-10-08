Add-Type -AssemblyName System.Drawing

$publicDir = "C:\Users\netso\Projetos\roiLead_git\roiLead\public"
$assetsDir = "C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets"

$srcIconPath = Join-Path $publicDir "cupula-icon.png"
$srcLogoPath = Join-Path $publicDir "cupula-logo.png"

$iconImage = New-Object System.Drawing.Bitmap($srcIconPath)
$logoImage = New-Object System.Drawing.Bitmap($srcLogoPath)

Write-Host "1. Generating main icon..."
$mainIconSize = 1024
$mainIconBg = New-Object System.Drawing.Bitmap($mainIconSize, $mainIconSize)
$g1 = [System.Drawing.Graphics]::FromImage($mainIconBg)
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.Clear([System.Drawing.Color]::White)

# Scale icon to fit 600x600
$scaleFactor = [Math]::Min(600.0 / $iconImage.Width, 600.0 / $iconImage.Height)
$newIconW = [int]($iconImage.Width * $scaleFactor)
$newIconH = [int]($iconImage.Height * $scaleFactor)
$iconX = [int](($mainIconSize - $newIconW) / 2) - 30
$iconY = [int](($mainIconSize - $newIconH) / 2)

$g1.DrawImage($iconImage, $iconX, $iconY, $newIconW, $newIconH)
$g1.Dispose()

$mainIconBg.Save((Join-Path $assetsDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mainIconBg.Save((Join-Path $assetsDir "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mainIconBg.Dispose()

Write-Host "2. Generating splash icon..."
# We pad the logo by making the background larger
$splashSize = [Math]::Max([int]($logoImage.Width * 1.5), [int]($logoImage.Height * 1.5))
$splashSize = [Math]::Max($splashSize, 1024)

$splashBg = New-Object System.Drawing.Bitmap($splashSize, $splashSize)
$g2 = [System.Drawing.Graphics]::FromImage($splashBg)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.Clear([System.Drawing.Color]::Transparent)

$splashX = [int](($splashSize - $logoImage.Width) / 2)
$splashY = [int](($splashSize - $logoImage.Height) / 2)

$g2.DrawImage($logoImage, $splashX, $splashY, $logoImage.Width, $logoImage.Height)
$g2.Dispose()

$splashBg.Save((Join-Path $assetsDir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$splashBg.Dispose()

Write-Host "3. Generating notification icon..."
$notifSize = 96
$notifCanvas = New-Object System.Drawing.Bitmap($notifSize, $notifSize)
$g3 = [System.Drawing.Graphics]::FromImage($notifCanvas)
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.Clear([System.Drawing.Color]::Transparent)

# Draw original scaled down
$scaleNotif = [Math]::Min(90.0 / $iconImage.Width, 90.0 / $iconImage.Height)
$newNotifW = [int]($iconImage.Width * $scaleNotif)
$newNotifH = [int]($iconImage.Height * $scaleNotif)
$notifX = [int](($notifSize - $newNotifW) / 2)
$notifY = [int](($notifSize - $newNotifH) / 2)

$g3.DrawImage($iconImage, $notifX, $notifY, $newNotifW, $newNotifH)
$g3.Dispose()

# Replace non-transparent pixels with white
for ($y = 0; $y -lt $notifSize; $y++) {
    for ($x = 0; $x -lt $notifSize; $x++) {
        $pixel = $notifCanvas.GetPixel($x, $y)
        if ($pixel.A -gt 50) {
            $notifCanvas.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.A, 255, 255, 255))
        } else {
            $notifCanvas.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$notifCanvas.Save((Join-Path $assetsDir "notification-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$notifCanvas.Dispose()

$iconImage.Dispose()
$logoImage.Dispose()

Write-Host "All icons generated successfully!"

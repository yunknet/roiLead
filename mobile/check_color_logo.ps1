Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("C:\Users\netso\Projetos\roiLead_git\roiLead\mobile\assets\icon.png")
$color = $img.GetPixel(300, 300)
Write-Host "Color at 300,300 is A:$($color.A) R:$($color.R) G:$($color.G) B:$($color.B)"
$colorCenter = $img.GetPixel(512, 512)
Write-Host "Color at 512,512 is A:$($colorCenter.A) R:$($colorCenter.R) G:$($colorCenter.G) B:$($colorCenter.B)"
$img.Dispose()

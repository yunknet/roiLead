$receiptIds = @(
    "019e8557-241f-70f9-9b3a-88d68157f2d8",
    "019e8557-241f-70f9-9b3a-8d1c1238318e",
    "019e8557-241f-70f9-9b3a-9261cb8f13a5"
)

$body = @{ ids = $receiptIds } | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://exp.host/--/api/v2/push/getReceipts" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "=== EXPO PUSH RECEIPTS ===" -ForegroundColor Cyan
$response.data | ConvertTo-Json -Depth 10

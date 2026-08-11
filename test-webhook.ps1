# ============================================================
# Simulate Meta Lead Ads webhook POST — real leadgen_id test
# ============================================================
# BEFORE RUNNING: replace YOUR_APP_SECRET_HERE below with your
# actual Facebook App Secret (App Dashboard -> Settings -> Basic).
# Never commit this file with the real secret in it.
# ============================================================

$appSecret = "b1a1c879aac8a5f4ba4fd380966cf4ee"

$webhookUrl = "https://crm.gkdigitalsolutions.in/api/facebook/webhook"

# Build the exact payload shape Meta sends for a leadgen event
$payloadObj = [ordered]@{
    object = "page"
    entry  = @(
        [ordered]@{
            id      = "1041459472394765"
            time    = [int][double]::Parse((Get-Date -UFormat %s))
            changes = @(
                [ordered]@{
                    field = "leadgen"
                    value = [ordered]@{
                        leadgen_id   = "1768833840930271"
                        page_id      = "1041459472394765"
                        form_id      = "1786292549407429"
                        created_time = 1786357335
                    }
                }
            )
        }
    )
}

# IMPORTANT: JSON must be compact / minified with no extra whitespace,
# because Meta signs the raw request body exactly as sent, and your
# server recomputes the HMAC over the raw bytes it received.
$jsonBody = $payloadObj | ConvertTo-Json -Depth 10 -Compress

# Compute HMAC-SHA256 signature over the raw body using the App Secret
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($appSecret)
$hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
$signature = "sha256=" + (($hashBytes | ForEach-Object { $_.ToString("x2") }) -join "")

Write-Host "Payload:" -ForegroundColor Cyan
Write-Host $jsonBody
Write-Host ""
Write-Host "Signature:" -ForegroundColor Cyan
Write-Host $signature
Write-Host ""

# Send the POST request with the signature header, exactly like Meta does
try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method Post `
        -Body $jsonBody `
        -ContentType "application/json" `
        -Headers @{ "X-Hub-Signature-256" = $signature }

    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Request failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host $reader.ReadToEnd()
    }
}
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ installieren: https://nodejs.org/' }
$ip = (Read-Host 'Tailscale-IPv4 deines Windows-PCs (100.x.y.z)').Trim()
if ($ip -notmatch '^100\.(\d{1,3}\.){2}\d{1,3}$') { throw 'Bitte eine gueltige Tailscale-IPv4 eingeben.' }
if (Test-Path settings.json) { throw 'settings.json existiert bereits. Zum Neuanlegen Datei manuell sichern/entfernen.' }
function Secret { $buf=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Fill($buf); return [Convert]::ToHexString($buf).ToLowerInvariant() }
$settings = @{ tailscaleIP=$ip; viewerToken=(Secret); deviceTokens=@{ fold7=(Secret); xcover6=(Secret) } }
$settings | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 settings.json
$plugin = Join-Path $PSScriptRoot '..\streamdeck\de.signalmonitor.monitor.sdPlugin\config.json'
@{ localUrl='http://127.0.0.1:8787'; viewerToken=$settings.viewerToken } | ConvertTo-Json | Set-Content -Encoding UTF8 $plugin
$client = @("PC-Adresse in Signal Monitor App: http://${ip}:8787", "", "Fold7 Device-ID: fold7", "Fold7 Token: $($settings.deviceTokens.fold7)", "", "XCover Device-ID: xcover6", "XCover Token: $($settings.deviceTokens.xcover6)")
$client | Set-Content -Encoding UTF8 EINRICHTUNG-GEHEIM.txt
Write-Host 'Einrichtung angelegt. Die Zugangsdaten stehen in EINRICHTUNG-GEHEIM.txt. NICHT WEITERGEBEN.'
Write-Host 'Naechster Schritt: .\start.ps1 und danach Stream-Deck-Plugin installieren.'

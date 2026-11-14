$ErrorActionPreference='Stop'
$src=Join-Path $PSScriptRoot 'de.signalmonitor.monitor.sdPlugin'
$config=Get-Content (Join-Path $src 'config.json') -Raw | ConvertFrom-Json
if($config.viewerToken -eq 'RUN_SETUP_FIRST'){throw 'Zuerst windows-server\setup.ps1 ausfuehren'}
$dest=Join-Path $env:APPDATA 'Elgato\StreamDeck\Plugins\de.signalmonitor.monitor.sdPlugin'
Write-Host 'Stream Deck komplett beenden (auch im Infobereich), bevor du fortfaehrst.'
Read-Host 'Nach dem Beenden ENTER druecken'
if(Test-Path $dest){Remove-Item $dest -Recurse -Force}
Copy-Item $src $dest -Recurse
Write-Host "Plugin kopiert nach $dest. Stream Deck neu starten und beide Aktionen auf Tasten ziehen."
